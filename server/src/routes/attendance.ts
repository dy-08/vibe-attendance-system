import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { authenticate, authorize, AuthRequest } from '../middlewares/auth.js';
import { startOfMonth, endOfMonth, format, parseISO } from 'date-fns';

const router = Router();

router.use(authenticate);

// 출결 기록 조회
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { classId, studentId, startDate, endDate, status } = req.query;
    const { role, id: userId } = req.user!;

    const where: any = {};

    // 학생은 자신의 출결만 조회 가능
    if (role === 'STUDENT') {
      where.studentId = userId;
    } else if (studentId) {
      where.studentId = studentId;
    }

    if (classId) {
      where.classId = classId;
    }

    // 선생님은 자신의 클래스만
    if (role === 'TEACHER') {
      where.class = { teacherId: userId };
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    if (status) {
      where.status = status;
    }

    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        student: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        class: {
          select: { id: true, name: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    res.json({
      success: true,
      data: attendances,
    });
  } catch (error) {
    next(error);
  }
});

// 특정 날짜의 클래스 출결 조회
router.get('/class/:classId/date/:date', authorize('SUPER_ADMIN', 'TEACHER'), async (req: AuthRequest, res, next) => {
  try {
    const { classId, date } = req.params;
    const targetDate = parseISO(date);

    // 클래스의 모든 학생 조회
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        members: {
          include: {
            student: {
              select: { id: true, name: true, email: true, phone: true, avatarUrl: true },
            },
          },
        },
        seats: {
          include: {
            student: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!classData) {
      throw new AppError('클래스를 찾을 수 없습니다.', 404);
    }

    // 해당 날짜의 출결 기록
    const attendances = await prisma.attendance.findMany({
      where: {
        classId,
        date: targetDate,
      },
    });

    // 학생별 출결 상태 매핑
    const attendanceMap = new Map(
      attendances.map((a) => [a.studentId, a])
    );

    const studentsWithAttendance = classData.members.map((member) => ({
      ...member.student,
      attendance: attendanceMap.get(member.student.id) || null,
    }));

    // 좌석에 출결 상태 추가
    const seatsWithAttendance = classData.seats.map((seat) => ({
      ...seat,
      attendance: seat.studentId ? attendanceMap.get(seat.studentId) || null : null,
    }));

    res.json({
      success: true,
      data: {
        class: {
          id: classData.id,
          name: classData.name,
        },
        date: format(targetDate, 'yyyy-MM-dd'),
        students: studentsWithAttendance,
        seats: seatsWithAttendance,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 출결 기록 생성/수정
router.post('/', authorize('SUPER_ADMIN', 'TEACHER'), async (req: AuthRequest, res, next) => {
  try {
    const { classId, studentId, date, status, note } = req.body;

    if (!classId || !studentId || !date || !status) {
      throw new AppError('필수 정보가 누락되었습니다.', 400);
    }

    const targetDate = parseISO(date);

    // upsert: 있으면 업데이트, 없으면 생성
    const attendance = await prisma.attendance.upsert({
      where: {
        studentId_classId_date: {
          studentId,
          classId,
          date: targetDate,
        },
      },
      update: {
        status,
        note,
        checkInAt: status === 'PRESENT' ? new Date() : null,
      },
      create: {
        studentId,
        classId,
        date: targetDate,
        status,
        note,
        checkInAt: status === 'PRESENT' ? new Date() : null,
      },
      include: {
        student: {
          select: { id: true, name: true },
        },
      },
    });

    res.json({
      success: true,
      message: '출결이 기록되었습니다.',
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
});

// 일괄 출결 처리
router.post('/bulk', authorize('SUPER_ADMIN', 'TEACHER'), async (req: AuthRequest, res, next) => {
  try {
    const { classId, date, attendances } = req.body;

    if (!classId || !date || !attendances || !Array.isArray(attendances)) {
      throw new AppError('필수 정보가 누락되었습니다.', 400);
    }

    const targetDate = parseISO(date);

    // 트랜잭션으로 일괄 처리
    const results = await prisma.$transaction(
      attendances.map((att: { studentId: string; status: string; note?: string }) =>
        prisma.attendance.upsert({
          where: {
            studentId_classId_date: {
              studentId: att.studentId,
              classId,
              date: targetDate,
            },
          },
          update: {
            status: att.status as any,
            note: att.note,
            checkInAt: att.status === 'PRESENT' ? new Date() : null,
          },
          create: {
            studentId: att.studentId,
            classId,
            date: targetDate,
            status: att.status as any,
            note: att.note,
            checkInAt: att.status === 'PRESENT' ? new Date() : null,
          },
        })
      )
    );

    res.json({
      success: true,
      message: `${results.length}명의 출결이 기록되었습니다.`,
      data: { count: results.length },
    });
  } catch (error) {
    next(error);
  }
});

// 내 출결 현황 (학생용)
router.get('/my', async (req: AuthRequest, res, next) => {
  try {
    const { id: userId } = req.user!;
    const { month, year } = req.query;

    const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
    const targetMonth = month ? parseInt(month as string) - 1 : new Date().getMonth();

    const startDate = startOfMonth(new Date(targetYear, targetMonth));
    const endDate = endOfMonth(new Date(targetYear, targetMonth));

    // 학생의 모든 클래스
    const classes = await prisma.classMember.findMany({
      where: { studentId: userId },
      include: {
        class: {
          select: { id: true, name: true, schedule: true },
        },
      },
    });

    // 해당 월의 출결 기록
    const attendances = await prisma.attendance.findMany({
      where: {
        studentId: userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        class: {
          select: { id: true, name: true },
        },
      },
      orderBy: { date: 'asc' },
    });

    // 클래스별 출석률 계산
    const classStats = classes.map((cm) => {
      const classAttendances = attendances.filter((a) => a.classId === cm.class.id);
      const total = classAttendances.length;
      const present = classAttendances.filter(
        (a) => a.status === 'PRESENT' || a.status === 'LATE'
      ).length;
      const absent = classAttendances.filter((a) => a.status === 'ABSENT').length;

      const rate = total > 0 ? Math.round((present / total) * 100) : 100;

      // 80% 경고 계산 (결석 허용 횟수)
      // 가정: 한 달에 12번 수업 (주 3회)
      const expectedClasses = 12;
      const maxAbsent = Math.floor(expectedClasses * 0.2); // 20% = 2.4 -> 2번
      const remainingAbsent = Math.max(0, maxAbsent - absent);

      return {
        class: cm.class,
        stats: {
          total,
          present,
          absent,
          late: classAttendances.filter((a) => a.status === 'LATE').length,
          sickLeave: classAttendances.filter((a) => a.status === 'SICK_LEAVE').length,
          vacation: classAttendances.filter((a) => a.status === 'VACATION').length,
          rate,
          remainingAbsent,
          warning: remainingAbsent <= 1,
        },
      };
    });

    res.json({
      success: true,
      data: {
        period: {
          year: targetYear,
          month: targetMonth + 1,
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
        },
        classes: classStats,
        attendances,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

