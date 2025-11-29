import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { authenticate, authorize, AuthRequest } from '../middlewares/auth.js';
import { startOfMonth, endOfMonth, subMonths, format, addDays, parseISO } from 'date-fns';
import { calculatePeriod, calculatePeriodByNumber, formatPeriodLabel } from '../lib/periodUtils.js';
import { calculateAttendanceRate } from '../lib/attendanceUtils.js';

const router = Router();

router.use(authenticate);

// 클래스별 출석률 통계
router.get('/class/:classId', authorize('SUPER_ADMIN', 'TEACHER'), async (req: AuthRequest, res, next) => {
  try {
    const { classId } = req.params;
    const { periods = '3' } = req.query;

    // 클래스 정보 가져오기 (startDate, periodDays 포함)
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      select: { startDate: true, periodDays: true },
    });

    if (!classData) {
      throw new AppError('클래스를 찾을 수 없습니다.', 404);
    }

    const periodsCount = parseInt(periods as string);
    const now = new Date();

    // 현재 기간 계산
    const currentPeriod = calculatePeriod(classData.startDate, classData.periodDays, now);
    
    console.log('📊 Class stats request:', {
      classId,
      startDate: classData.startDate,
      periodDays: classData.periodDays,
      currentPeriod: currentPeriod.periodNumber,
      periodsCount,
    });

    // 최근 N개 기간 데이터
    const periodStats = [];

    // 최소 1개 기간은 항상 반환 (데이터가 없어도)
    const startPeriodNumber = Math.max(1, currentPeriod.periodNumber - periodsCount + 1);
    
    for (let periodNumber = startPeriodNumber; periodNumber <= currentPeriod.periodNumber; periodNumber++) {
      const period = calculatePeriodByNumber(
        classData.startDate,
        classData.periodDays,
        periodNumber
      );

      const attendances = await prisma.attendance.findMany({
        where: {
          classId,
          date: {
            gte: period.startDate,
            lte: period.endDate,
          },
        },
      });

      const stats = calculateAttendanceRate(attendances);

      console.log(`📊 Period ${periodNumber} stats:`, {
        periodLabel: formatPeriodLabel(period.startDate, period.endDate, periodNumber),
        total: stats.total,
        present: stats.present,
        late: stats.late,
        adjustedAbsent: stats.adjustedAbsent,
        rate: stats.rate,
        dateRange: `${format(period.startDate, 'yyyy-MM-dd')} ~ ${format(period.endDate, 'yyyy-MM-dd')}`,
      });

      periodStats.push({
        period: periodNumber,
        periodLabel: formatPeriodLabel(period.startDate, period.endDate, periodNumber),
        startDate: format(period.startDate, 'yyyy-MM-dd'),
        endDate: format(period.endDate, 'yyyy-MM-dd'),
        total: stats.total,
        present: stats.present,
        absent: stats.adjustedAbsent, // 조정된 결석 횟수
        originalAbsent: stats.absent, // 원본 결석 횟수 (지각 3번 = 결석 1번 반영 전)
        late: stats.late,
        lateToAbsent: stats.lateToAbsent,
        rate: stats.rate,
      });
    }
    
    console.log('📈 Period stats generated:', periodStats.length, 'periods');

    // 학생별 출석률 (현재 기간 기준)
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
        const attendances = await prisma.attendance.findMany({
          where: {
            classId,
            studentId: member.studentId,
            date: {
              gte: currentPeriod.startDate,
              lte: currentPeriod.endDate,
            },
          },
        });

        const stats = calculateAttendanceRate(attendances);

        return {
          student: member.student,
          stats: {
            total: stats.total,
            present: stats.present,
            absent: stats.adjustedAbsent, // 조정된 결석 횟수
            late: stats.late,
            lateToAbsent: stats.lateToAbsent,
            rate: stats.rate,
            warning: stats.adjustedAbsent >= 2, // 조정된 결석 2번 이상시 경고
            originalAbsent: stats.absent, // 원본 결석 횟수 (지각 3번 = 결석 1번 반영 전)
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

    // 클래스의 승인된 휴강 신청 조회 및 보강일 계산
    const approvedCancellations = await prisma.classCancellationRequest.findMany({
      where: {
        classId,
        status: 'APPROVED',
      },
      select: {
        dates: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    let cancellationInfo = null;
    if (approvedCancellations.length > 0 && classData.startDate && classData.periodDays) {
      const allCancellationDates = approvedCancellations.flatMap(c => c.dates);
      const startDate = parseISO(classData.startDate.toISOString().split('T')[0]);
      const originalPeriodEndDate = addDays(startDate, classData.periodDays);
      
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

    res.json({
      success: true,
      data: {
        class: {
          id: classId,
          startDate: classData.startDate ? format(classData.startDate, 'yyyy-MM-dd') : null,
          periodDays: classData.periodDays,
          currentPeriod: currentPeriod.periodNumber,
        },
        periods: periodStats,
        students: studentStats,
        cancellationInfo,
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

    const overallStats = calculateAttendanceRate(monthlyAttendances);
    const total = overallStats.total;
    const present = overallStats.effectivePresent;

    // 클래스별 출석률 (활성 클래스만)
    const classes = await prisma.class.findMany({
      where: { isActive: true },
      select: { id: true, name: true, status: true },
    });

    const classStats = await Promise.all(
      classes.map(async (cls) => {
        const attendances = monthlyAttendances.filter((a) => a.classId === cls.id);
        const stats = calculateAttendanceRate(attendances);

        return {
          id: cls.id,
          name: cls.name,
          rate: stats.rate,
          status: cls.status,
        };
      })
    );

    // 폐강된 클래스 목록 (차별점 표시용)
    const cancelledClasses = await prisma.class.findMany({
      where: { 
        status: 'CANCELLED',
        isActive: true, // 비활성화되지 않은 폐강 클래스만
      },
      select: { id: true, name: true, status: true },
    });

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
          total: overallStats.total,
          present: overallStats.effectivePresent,
          absent: overallStats.adjustedAbsent,
          late: overallStats.late,
          lateToAbsent: overallStats.lateToAbsent,
          rate: overallStats.rate,
        },
        classStats,
        cancelledClasses, // 폐강된 클래스 목록
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

      const stats = calculateAttendanceRate(attendances);

      monthlyStats.unshift({
        month: format(targetDate, 'yyyy-MM'),
        label: format(targetDate, 'M월'),
        total: stats.total,
        present: stats.present,
        absent: stats.adjustedAbsent, // 조정된 결석 횟수
        late: stats.late,
        lateToAbsent: stats.lateToAbsent,
        rate: stats.rate,
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

        const stats = calculateAttendanceRate(attendances);
        
        const sickLeave = attendances.filter((a) => a.status === 'SICK_LEAVE').length;
        const vacation = attendances.filter((a) => a.status === 'VACATION').length;
        const earlyLeave = attendances.filter((a) => a.status === 'EARLY_LEAVE').length;

        return {
          student: member.student,
          stats: {
            total: stats.total,
            present: stats.present,
            absent: stats.adjustedAbsent, // 조정된 결석 횟수
            late: stats.late,
            lateToAbsent: stats.lateToAbsent,
            sickLeave,
            vacation,
            earlyLeave,
            rate: stats.rate,
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

