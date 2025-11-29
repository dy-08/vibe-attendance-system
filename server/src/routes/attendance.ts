import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { authenticate, authorize, AuthRequest } from '../middlewares/auth.js';
import { startOfMonth, endOfMonth, format, parseISO, startOfDay, addDays } from 'date-fns';
import { calculateAttendanceRate } from '../lib/attendanceUtils.js';
import { calculatePeriod } from '../lib/periodUtils.js';

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

    // 선생님은 자신이 담당하는 클래스만 조회 가능
    if (req.user!.role === 'TEACHER' && classData.teacherId !== req.user!.id) {
      throw new AppError('이 클래스에 대한 권한이 없습니다.', 403);
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

    // 선생님은 자신이 담당하는 클래스만 출결 기록 가능
    if (req.user!.role === 'TEACHER') {
      const classData = await prisma.class.findUnique({
        where: { id: classId },
        select: { teacherId: true },
      });

      if (!classData) {
        throw new AppError('클래스를 찾을 수 없습니다.', 404);
      }

      if (classData.teacherId !== req.user!.id) {
        throw new AppError('이 클래스에 대한 권한이 없습니다.', 403);
      }
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
  } catch (error: any) {
    console.error('Failed to save bulk attendance:', {
      classId,
      date,
      attendancesCount: attendances?.length || 0,
      userId: req.user!.id,
      userRole: req.user!.role,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
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
          select: { 
            id: true, 
            name: true, 
            schedule: true, 
            status: true,
            startDate: true,
            periodDays: true,
          },
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

    // 클래스별 출석률 계산 및 휴강/보강 정보 조회
    const classStats = await Promise.all(classes.map(async (cm) => {
      // 개강 준비 상태 클래스는 출석률 계산에서 제외 (대기 상태)
      if (cm.class.status === 'PREPARING') {
        return {
          class: {
            ...cm.class,
            status: cm.class.status || 'PREPARING',
          },
          stats: {
            total: 0,
            present: 0,
            absent: 0,
            late: 0,
            sickLeave: 0,
            vacation: 0,
            rate: 0,
            remainingAbsent: 0,
            warning: false,
            isWaiting: true, // 대기 상태 표시
          },
          cancellationInfo: null,
        };
      }

      const classAttendances = attendances.filter((a) => a.classId === cm.class.id);
      const stats = calculateAttendanceRate(classAttendances);

      // 80% 경고 계산 (결석 허용 횟수)
      // 가정: 한 달에 12번 수업 (주 3회)
      const expectedClasses = 12;
      const maxAbsent = Math.floor(expectedClasses * 0.2); // 20% = 2.4 -> 2번
      const remainingAbsent = Math.max(0, maxAbsent - stats.adjustedAbsent);

      // 현재 기간 정보 계산
      let currentPeriod = null;
      if (cm.class.startDate && cm.class.periodDays) {
        const now = new Date();
        const period = calculatePeriod(cm.class.startDate, cm.class.periodDays, now);
        const periodEndDate = period.endDate;
        const today = startOfDay(now);
        const endDate = startOfDay(periodEndDate);
        const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
        
        currentPeriod = {
          periodNumber: period.periodNumber,
          startDate: format(period.startDate, 'yyyy-MM-dd'),
          endDate: format(period.endDate, 'yyyy-MM-dd'),
          periodLabel: `${period.periodNumber}기간 (${format(period.startDate, 'yyyy-MM-dd')} ~ ${format(period.endDate, 'yyyy-MM-dd')})`,
          daysRemaining,
        };
      }

      // 클래스의 승인된 휴강 신청 조회 및 보강일 계산
      const approvedCancellations = await prisma.classCancellationRequest.findMany({
        where: {
          classId: cm.class.id,
          status: 'APPROVED',
        },
        select: {
          dates: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      let cancellationInfo = null;
      if (approvedCancellations.length > 0 && cm.class.startDate && cm.class.periodDays) {
        const allCancellationDates = approvedCancellations.flatMap(c => c.dates);
        const startDate = parseISO(cm.class.startDate.toISOString().split('T')[0]);
        const originalPeriodEndDate = addDays(startDate, cm.class.periodDays);
        
        // 보강일 계산: 각 휴강일마다 개강 마지막날 뒤로 순차적으로 배치
        const makeUpDates: string[] = [];
        let currentMakeUpDate = addDays(originalPeriodEndDate, 1);
        
        for (const cancellation of approvedCancellations) {
          for (const _ of cancellation.dates) {
            makeUpDates.push(format(currentMakeUpDate, 'yyyy-MM-dd'));
            currentMakeUpDate = addDays(currentMakeUpDate, 1);
          }
        }

        cancellationInfo = {
          dates: allCancellationDates,
          makeUpDates,
        };
      }

      return {
        class: {
          ...cm.class,
          status: cm.class.status || 'PREPARING',
          periodDays: cm.class.periodDays,
          currentPeriod,
        },
        stats: {
          total: stats.total,
          present: stats.present,
          absent: stats.adjustedAbsent, // 조정된 결석 횟수 사용
          late: stats.late,
          lateToAbsent: stats.lateToAbsent, // 지각으로 인한 결석 횟수
          sickLeave: classAttendances.filter((a) => a.status === 'SICK_LEAVE').length,
          vacation: classAttendances.filter((a) => a.status === 'VACATION').length,
          rate: stats.rate,
          remainingAbsent,
          warning: remainingAbsent <= 1,
          isWaiting: false,
        },
        cancellationInfo,
      };
    }));

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

