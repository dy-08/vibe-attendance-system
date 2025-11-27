import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { authenticate, authorize, AuthRequest } from '../middlewares/auth.js';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

const router = Router();

router.use(authenticate);

// 클래스별 출석률 통계
router.get('/class/:classId', authorize('SUPER_ADMIN', 'TEACHER'), async (req: AuthRequest, res, next) => {
  try {
    const { classId } = req.params;
    const { months = '3' } = req.query;

    const monthsCount = parseInt(months as string);
    const now = new Date();

    // 최근 N개월 데이터
    const monthlyStats = [];

    for (let i = 0; i < monthsCount; i++) {
      const targetDate = subMonths(now, i);
      const startDate = startOfMonth(targetDate);
      const endDate = endOfMonth(targetDate);

      const attendances = await prisma.attendance.findMany({
        where: {
          classId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const total = attendances.length;
      const present = attendances.filter(
        (a) => a.status === 'PRESENT' || a.status === 'LATE'
      ).length;

      monthlyStats.unshift({
        month: format(targetDate, 'yyyy-MM'),
        label: format(targetDate, 'M월'),
        total,
        present,
        absent: attendances.filter((a) => a.status === 'ABSENT').length,
        late: attendances.filter((a) => a.status === 'LATE').length,
        rate: total > 0 ? Math.round((present / total) * 100) : 0,
      });
    }

    // 학생별 출석률
    const members = await prisma.classMember.findMany({
      where: { classId },
      include: {
        student: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    const studentStats = await Promise.all(
      members.map(async (member) => {
        const startDate = startOfMonth(now);
        const endDate = endOfMonth(now);

        const attendances = await prisma.attendance.findMany({
          where: {
            classId,
            studentId: member.studentId,
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

        const total = attendances.length;
        const present = attendances.filter(
          (a) => a.status === 'PRESENT' || a.status === 'LATE'
        ).length;
        const absent = attendances.filter((a) => a.status === 'ABSENT').length;

        return {
          student: member.student,
          stats: {
            total,
            present,
            absent,
            rate: total > 0 ? Math.round((present / total) * 100) : 100,
            warning: absent >= 2, // 2번 이상 결석시 경고
          },
        };
      })
    );

    // 경고가 있는 학생 먼저 정렬
    studentStats.sort((a, b) => {
      if (a.stats.warning && !b.stats.warning) return -1;
      if (!a.stats.warning && b.stats.warning) return 1;
      return a.stats.rate - b.stats.rate;
    });

    res.json({
      success: true,
      data: {
        monthly: monthlyStats,
        students: studentStats,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 전체 통계 (관리자용)
router.get('/overview', authorize('SUPER_ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const now = new Date();
    const startDate = startOfMonth(now);
    const endDate = endOfMonth(now);

    // 전체 카운트
    const [totalStudents, totalTeachers, totalClasses, activeClasses] = await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT', isActive: true } }),
      prisma.user.count({ where: { role: 'TEACHER', isActive: true } }),
      prisma.class.count(),
      prisma.class.count({ where: { isActive: true } }),
    ]);

    // 이번 달 출결 통계
    const monthlyAttendances = await prisma.attendance.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const total = monthlyAttendances.length;
    const present = monthlyAttendances.filter(
      (a) => a.status === 'PRESENT' || a.status === 'LATE'
    ).length;

    // 클래스별 출석률
    const classes = await prisma.class.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    const classStats = await Promise.all(
      classes.map(async (cls) => {
        const attendances = monthlyAttendances.filter((a) => a.classId === cls.id);
        const clsTotal = attendances.length;
        const clsPresent = attendances.filter(
          (a) => a.status === 'PRESENT' || a.status === 'LATE'
        ).length;

        return {
          id: cls.id,
          name: cls.name,
          rate: clsTotal > 0 ? Math.round((clsPresent / clsTotal) * 100) : 0,
        };
      })
    );

    // 경고 학생 목록 (출석률 80% 미만)
    const warningStudents = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        attendances: {
          where: {
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
      },
    });

    const studentsWithWarning = warningStudents
      .map((student) => {
        const studentTotal = student.attendances.length;
        const studentPresent = student.attendances.filter(
          (a) => a.status === 'PRESENT' || a.status === 'LATE'
        ).length;
        const rate = studentTotal > 0 ? Math.round((studentPresent / studentTotal) * 100) : 100;

        return {
          id: student.id,
          name: student.name,
          email: student.email,
          avatarUrl: student.avatarUrl,
          rate,
          absent: student.attendances.filter((a) => a.status === 'ABSENT').length,
        };
      })
      .filter((s) => s.rate < 80)
      .sort((a, b) => a.rate - b.rate);

    res.json({
      success: true,
      data: {
        counts: {
          totalStudents,
          totalTeachers,
          totalClasses,
          activeClasses,
        },
        monthlyStats: {
          total,
          present,
          absent: monthlyAttendances.filter((a) => a.status === 'ABSENT').length,
          rate: total > 0 ? Math.round((present / total) * 100) : 0,
        },
        classStats,
        warningStudents: studentsWithWarning,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 학생 개인 통계
router.get('/student/:studentId', authorize('SUPER_ADMIN', 'TEACHER'), async (req: AuthRequest, res, next) => {
  try {
    const { studentId } = req.params;
    const { months = '6' } = req.query;

    const monthsCount = parseInt(months as string);
    const now = new Date();

    // 최근 N개월 데이터
    const monthlyStats = [];

    for (let i = 0; i < monthsCount; i++) {
      const targetDate = subMonths(now, i);
      const startDate = startOfMonth(targetDate);
      const endDate = endOfMonth(targetDate);

      const attendances = await prisma.attendance.findMany({
        where: {
          studentId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const total = attendances.length;
      const present = attendances.filter(
        (a) => a.status === 'PRESENT' || a.status === 'LATE'
      ).length;

      monthlyStats.unshift({
        month: format(targetDate, 'yyyy-MM'),
        label: format(targetDate, 'M월'),
        total,
        present,
        absent: attendances.filter((a) => a.status === 'ABSENT').length,
        rate: total > 0 ? Math.round((present / total) * 100) : 100,
      });
    }

    // 학생 정보
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        studentClass: {
          include: {
            class: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!student) {
      throw new AppError('학생을 찾을 수 없습니다.', 404);
    }

    res.json({
      success: true,
      data: {
        student,
        monthlyStats,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 클래스별 특정 월 학생 출석률 (서류 작성용)
router.get('/class/:classId/monthly', authorize('SUPER_ADMIN', 'TEACHER'), async (req: AuthRequest, res, next) => {
  try {
    const { classId } = req.params;
    const { month } = req.query; // yyyy-MM 형식

    if (!month || typeof month !== 'string') {
      throw new AppError('월 정보가 필요합니다. (yyyy-MM 형식)', 400);
    }

    const targetDate = new Date(month + '-01');
    if (isNaN(targetDate.getTime())) {
      throw new AppError('올바른 월 형식이 아닙니다. (yyyy-MM)', 400);
    }

    const startDate = startOfMonth(targetDate);
    const endDate = endOfMonth(targetDate);

    // 클래스 멤버 가져오기
    const members = await prisma.classMember.findMany({
      where: { classId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            phone: true,
          },
        },
      },
    });

    // 각 학생의 해당 월 출석률 계산
    const studentRates = await Promise.all(
      members.map(async (member) => {
        const attendances = await prisma.attendance.findMany({
          where: {
            classId,
            studentId: member.studentId,
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

        const total = attendances.length;
        const present = attendances.filter(
          (a) => a.status === 'PRESENT' || a.status === 'LATE'
        ).length;
        const absent = attendances.filter((a) => a.status === 'ABSENT').length;
        const late = attendances.filter((a) => a.status === 'LATE').length;
        const sickLeave = attendances.filter((a) => a.status === 'SICK_LEAVE').length;
        const vacation = attendances.filter((a) => a.status === 'VACATION').length;
        const earlyLeave = attendances.filter((a) => a.status === 'EARLY_LEAVE').length;

        return {
          student: member.student,
          stats: {
            total,
            present,
            absent,
            late,
            sickLeave,
            vacation,
            earlyLeave,
            rate: total > 0 ? Math.round((present / total) * 100) : 0,
          },
        };
      })
    );

    // 이름순 정렬
    studentRates.sort((a, b) => a.student.name.localeCompare(b.student.name));

    res.json({
      success: true,
      data: {
        month,
        monthLabel: format(targetDate, 'yyyy년 M월'),
        students: studentRates,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

