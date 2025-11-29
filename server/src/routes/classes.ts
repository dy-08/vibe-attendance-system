import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { authenticate, authorize, AuthRequest } from '../middlewares/auth.js';
import { calculatePeriod, formatPeriodLabel } from '../lib/periodUtils.js';
import { addDays, format, startOfDay } from 'date-fns';

const router = Router();

router.use(authenticate);

// 클래스 목록
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { role } = req.user!;

    let where: any = {};

    // 학생: 자신이 속한 클래스만 (활성화된 것만)
    if (role === 'STUDENT') {
      where.isActive = true;
      where.members = { some: { studentId: req.user!.id } };
    }
    // 선생님: 자신이 담당하는 클래스만 (활성화된 것만)
    else if (role === 'TEACHER') {
      where.isActive = true;
      where.teacherId = req.user!.id;
    }
    // 관리자: 모든 클래스 (활성화/비활성화 모두)

    const classes = await prisma.class.findMany({
      where,
      include: {
        teacher: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { members: true, seats: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 각 클래스에 현재 기간 정보 및 수료까지 남은 기간 추가
    const classesWithPeriod = classes.map((cls) => {
      const now = new Date();
      const currentPeriod = calculatePeriod(cls.startDate, cls.periodDays, now);
      
      // 현재 기간 종료일까지 남은 일수 계산
      const periodEndDate = currentPeriod.endDate;
      const today = startOfDay(now);
      const endDate = startOfDay(periodEndDate);
      const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
      
      return {
        ...cls,
        currentPeriod: {
          periodNumber: currentPeriod.periodNumber,
          startDate: format(currentPeriod.startDate, 'yyyy-MM-dd'),
          endDate: format(currentPeriod.endDate, 'yyyy-MM-dd'),
          periodLabel: formatPeriodLabel(currentPeriod.startDate, currentPeriod.endDate, currentPeriod.periodNumber),
          daysRemaining, // 수료까지 남은 일수
        },
      };
    });

    res.json({
      success: true,
      data: classesWithPeriod,
    });
  } catch (error) {
    next(error);
  }
});

// 클래스 상세
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const classData = await prisma.class.findUnique({
      where: { id },
      include: {
        teacher: {
          select: { id: true, name: true, email: true, phone: true },
        },
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
          orderBy: [{ row: 'asc' }, { col: 'asc' }],
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

    res.json({
      success: true,
      data: classData,
    });
  } catch (error) {
    next(error);
  }
});

// 클래스 생성 (관리자/선생님)
router.post('/', authorize('SUPER_ADMIN', 'TEACHER'), async (req: AuthRequest, res, next) => {
  try {
    const { name, description, schedule, maxStudents, teacherId, status, startDate, periodDays } = req.body;

    if (!name) {
      throw new AppError('클래스 이름은 필수입니다.', 400);
    }

    // 선생님은 자신만 담당으로 설정 가능
    const assignedTeacherId = req.user!.role === 'TEACHER' 
      ? req.user!.id 
      : (teacherId || req.user!.id);

    // 날짜 파싱
    let parsedStartDate: Date | undefined;
    if (startDate) {
      parsedStartDate = new Date(startDate);
      if (isNaN(parsedStartDate.getTime())) {
        throw new AppError('올바른 날짜 형식이 아닙니다.', 400);
      }
    }

    // 시스템 설정에서 periodDays 범위 가져오기
    const periodConfigs = await prisma.systemConfig.findMany({
      where: {
        key: { in: ['periodDays.min', 'periodDays.max', 'periodDays.default'] },
      },
    });

    const configMap: Record<string, number> = {};
    periodConfigs.forEach((config) => {
      const key = config.key.replace('periodDays.', '');
      configMap[key] = parseInt(config.value) || (key === 'default' ? 30 : key === 'min' ? 1 : 365);
    });

    const minPeriod = configMap.min || 1;
    const maxPeriod = configMap.max || 365;
    const defaultPeriod = configMap.default || 30;

    // periodDays 검증 및 기본값 적용
    // periodDays가 명시적으로 0이거나 undefined이면 기본값 사용
    const finalPeriodDays = (periodDays !== undefined && periodDays !== null && periodDays !== 0) 
      ? periodDays 
      : defaultPeriod;
    
    if (finalPeriodDays < minPeriod || finalPeriodDays > maxPeriod) {
      throw new AppError(
        `단위기간은 ${minPeriod}일 이상 ${maxPeriod}일 이하여야 합니다.`,
        400
      );
    }

    const newClass = await prisma.class.create({
      data: {
        name,
        description,
        schedule,
        maxStudents: maxStudents || 30,
        teacherId: assignedTeacherId,
        status: status || 'PREPARING',
        startDate: parsedStartDate,
        periodDays: finalPeriodDays,
      },
      include: {
        teacher: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: '클래스가 생성되었습니다.',
      data: newClass,
    });
  } catch (error) {
    next(error);
  }
});

// 클래스 수정
router.put('/:id', authorize('SUPER_ADMIN', 'TEACHER'), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, schedule, maxStudents, status, isActive, startDate, periodDays } = req.body;

    // 선생님은 자신의 클래스만 수정 가능
    if (req.user!.role === 'TEACHER') {
      const classData = await prisma.class.findUnique({ where: { id } });
      if (classData?.teacherId !== req.user!.id) {
        throw new AppError('권한이 없습니다.', 403);
      }
    }

    // 날짜 파싱
    let parsedStartDate: Date | undefined | null = undefined;
    if (startDate !== undefined) {
      if (startDate === null || startDate === '') {
        parsedStartDate = null;
      } else {
        parsedStartDate = new Date(startDate);
        if (isNaN(parsedStartDate.getTime())) {
          throw new AppError('올바른 날짜 형식이 아닙니다.', 400);
        }
      }
    }

    // 시스템 설정에서 periodDays 범위 가져오기
    const periodConfigs = await prisma.systemConfig.findMany({
      where: {
        key: { in: ['periodDays.min', 'periodDays.max', 'periodDays.default'] },
      },
    });

    const configMap: Record<string, number> = {};
    periodConfigs.forEach((config) => {
      const key = config.key.replace('periodDays.', '');
      configMap[key] = parseInt(config.value) || (key === 'default' ? 30 : key === 'min' ? 1 : 365);
    });

    const minPeriod = configMap.min || 1;
    const maxPeriod = configMap.max || 365;
    const defaultPeriod = configMap.default || 30;

    // periodDays 검증 (업데이트 시에만)
    if (periodDays !== undefined) {
      const finalPeriodDays = periodDays || defaultPeriod;
      if (finalPeriodDays < minPeriod || finalPeriodDays > maxPeriod) {
        throw new AppError(
          `단위기간은 ${minPeriod}일 이상 ${maxPeriod}일 이하여야 합니다.`,
          400
        );
      }
    }

    // startDate가 명시적으로 null로 설정된 경우도 처리
    const updateData: any = {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(schedule !== undefined && { schedule }),
      ...(maxStudents && { maxStudents }),
      ...(status && { status }),
      ...(isActive !== undefined && { isActive }),
      ...(periodDays !== undefined && { 
        periodDays: periodDays || defaultPeriod 
      }),
    };

    // startDate 처리: undefined가 아닌 경우만 업데이트 (null 포함)
    if (startDate !== undefined) {
      updateData.startDate = parsedStartDate;
    }

    const updatedClass = await prisma.class.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      message: '클래스가 수정되었습니다.',
      data: updatedClass,
    });
  } catch (error) {
    next(error);
  }
});

// 학생 추가
router.post('/:id/students', authorize('SUPER_ADMIN', 'TEACHER'), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { studentId } = req.body;

    if (!studentId) {
      throw new AppError('학생 ID가 필요합니다.', 400);
    }

    // 이미 등록되어 있는지 확인
    const existing = await prisma.classMember.findUnique({
      where: {
        studentId_classId: { studentId, classId: id },
      },
    });

    if (existing) {
      throw new AppError('이미 등록된 학생입니다.', 400);
    }

    // 추가하려는 클래스 정보 조회
    const targetClass = await prisma.class.findUnique({
      where: { id },
      select: { id: true, name: true, schedule: true },
    });

    if (!targetClass) {
      throw new AppError('클래스를 찾을 수 없습니다.', 404);
    }

    // 학생이 이미 수강 중인 클래스들 조회
    const studentClasses = await prisma.classMember.findMany({
      where: { studentId },
      include: {
        class: {
          select: { id: true, name: true, schedule: true },
        },
      },
    });

    // 시간대 충돌 체크
    if (targetClass.schedule) {
      const { isScheduleConflict } = await import('../lib/scheduleUtils.js');
      for (const studentClass of studentClasses) {
        if (studentClass.class.schedule) {
          if (isScheduleConflict(targetClass.schedule, studentClass.class.schedule)) {
            throw new AppError(
              `시간대 충돌: "${studentClass.class.name}" 클래스와 겹치는 시간대입니다. (${targetClass.schedule} vs ${studentClass.class.schedule})`,
              400
            );
          }
        }
      }
    }

    // 트랜잭션으로 학생 추가 및 좌석 자동 배정
    const result = await prisma.$transaction(async (tx) => {
      // 학생을 클래스에 추가
      await tx.classMember.create({
        data: {
          studentId,
          classId: id,
        },
      });

      // 클래스의 빈 좌석 찾기
      const emptySeat = await tx.seat.findFirst({
        where: {
          classId: id,
          studentId: null,
        },
        orderBy: [{ row: 'asc' }, { col: 'asc' }],
      });

      // 빈 좌석이 있으면 자동 배정
      if (emptySeat) {
        await tx.seat.update({
          where: { id: emptySeat.id },
          data: { studentId },
        });
        return { seatAssigned: true, seatId: emptySeat.id };
      }

      return { seatAssigned: false };
    });

    res.status(201).json({
      success: true,
      message: result.seatAssigned 
        ? '학생이 클래스에 추가되었고 좌석이 자동 배정되었습니다.' 
        : '학생이 클래스에 추가되었습니다. (좌석이 없어 자동 배정되지 않았습니다.)',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// 학생 제거 (관리자/선생님)
router.delete('/:id/students/:studentId', authorize('SUPER_ADMIN', 'TEACHER'), async (req: AuthRequest, res, next) => {
  try {
    const { id, studentId } = req.params;

    await prisma.classMember.delete({
      where: {
        studentId_classId: { studentId, classId: id },
      },
    });

    // 좌석도 함께 해제
    await prisma.seat.updateMany({
      where: { classId: id, studentId },
      data: { studentId: null },
    });

    res.json({
      success: true,
      message: '학생이 클래스에서 제거되었습니다.',
    });
  } catch (error) {
    next(error);
  }
});

// 학생 수강 철회 (학생 본인만)
router.delete('/:id/withdraw', authorize('STUDENT'), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const studentId = req.user!.id;

    // 학생이 해당 클래스의 멤버인지 확인
    const member = await prisma.classMember.findUnique({
      where: {
        studentId_classId: { studentId, classId: id },
      },
    });

    if (!member) {
      throw new AppError('해당 클래스에 등록되어 있지 않습니다.', 404);
    }

    // 클래스 정보 확인
    const classData = await prisma.class.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!classData) {
      throw new AppError('클래스를 찾을 수 없습니다.', 404);
    }

    // 트랜잭션으로 수강 철회 처리
    await prisma.$transaction(async (tx) => {
      // 클래스 멤버에서 제거
      await tx.classMember.delete({
        where: {
          studentId_classId: { studentId, classId: id },
        },
      });

      // 좌석도 함께 해제
      await tx.seat.updateMany({
        where: { classId: id, studentId },
        data: { studentId: null },
      });
    });

    res.json({
      success: true,
      message: '수강이 철회되었습니다.',
    });
  } catch (error) {
    next(error);
  }
});

// 좌석 배치 설정
router.post('/:id/seats', authorize('SUPER_ADMIN', 'TEACHER'), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { rows, cols } = req.body;

    if (!rows || !cols || rows < 1 || cols < 1) {
      throw new AppError('유효한 행과 열 수를 입력해주세요.', 400);
    }

    // 클래스 존재 확인 및 권한 체크
    const classData = await prisma.class.findUnique({
      where: { id },
      select: { id: true, teacherId: true },
    });

    if (!classData) {
      throw new AppError('클래스를 찾을 수 없습니다.', 404);
    }

    // 선생님은 자신이 담당하는 클래스만 수정 가능
    if (req.user!.role === 'TEACHER' && classData.teacherId !== req.user!.id) {
      throw new AppError('이 클래스에 대한 권한이 없습니다.', 403);
    }

    // 기존 좌석 삭제
    await prisma.seat.deleteMany({ where: { classId: id } });

    // 새 좌석 생성
    const seats = [];
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        seats.push({
          classId: id,
          row: r,
          col: c,
          label: `${String.fromCharCode(64 + r)}${c}`, // A1, A2, B1, B2 등
        });
      }
    }

    await prisma.seat.createMany({ data: seats });

    res.status(201).json({
      success: true,
      message: '좌석이 생성되었습니다.',
      data: { totalSeats: rows * cols },
    });
  } catch (error) {
    next(error);
  }
});

// 좌석 배정
router.put('/:id/seats/:seatId', authorize('SUPER_ADMIN', 'TEACHER'), async (req: AuthRequest, res, next) => {
  try {
    const { id, seatId } = req.params;
    const { studentId } = req.body;

    console.log('📌 좌석 배정 요청:', {
      classId: id,
      seatId,
      studentId,
      userId: req.user!.id,
      userRole: req.user!.role,
    });

    // 좌석 존재 확인
    const seat = await prisma.seat.findUnique({
      where: { id: seatId },
      include: { 
        class: { 
          select: { 
            id: true,
            teacherId: true,
          } 
        } 
      },
    });

    if (!seat) {
      console.error('❌ 좌석을 찾을 수 없음:', seatId);
      throw new AppError('좌석을 찾을 수 없습니다.', 404);
    }

    console.log('✅ 좌석 확인:', {
      seatId: seat.id,
      classId: seat.classId,
      requestedClassId: id,
      classTeacherId: seat.class.teacherId,
      currentStudentId: seat.studentId,
    });

    // 클래스 ID 일치 확인
    if (seat.classId !== id) {
      console.error('❌ 클래스 ID 불일치:', {
        seatClassId: seat.classId,
        requestedClassId: id,
      });
      throw new AppError('클래스 ID가 일치하지 않습니다.', 400);
    }

    // 선생님은 자신이 담당하는 클래스만 수정 가능
    if (req.user!.role === 'TEACHER' && seat.class.teacherId !== req.user!.id) {
      console.error('❌ 권한 없음:', {
        classTeacherId: seat.class.teacherId,
        userId: req.user!.id,
      });
      throw new AppError('이 클래스에 대한 권한이 없습니다.', 403);
    }

    // studentId가 null이거나 빈 문자열이면 좌석 해제
    const assignStudentId = studentId && studentId.trim() !== '' ? studentId : null;

    // 트랜잭션으로 처리하여 unique constraint 위반 방지
    const updatedSeat = await prisma.$transaction(async (tx) => {
      if (assignStudentId) {
        console.log('📝 학생 배정 시작:', { studentId: assignStudentId, classId: id });
        
        // 학생이 해당 클래스의 멤버인지 확인
        const member = await tx.classMember.findUnique({
          where: {
            studentId_classId: {
              studentId: assignStudentId,
              classId: id,
            },
          },
        });

        if (!member) {
          console.error('❌ 학생이 클래스 멤버가 아님:', { studentId: assignStudentId, classId: id });
          throw new AppError('해당 학생이 이 클래스의 멤버가 아닙니다.', 400);
        }

        console.log('✅ 학생이 클래스 멤버임 확인됨');

        // 현재 좌석에 이미 다른 학생이 배정되어 있으면 먼저 해제
        const currentSeat = await tx.seat.findUnique({
          where: { id: seatId },
          select: { studentId: true },
        });

        if (currentSeat?.studentId && currentSeat.studentId !== assignStudentId) {
          console.log('🔄 현재 좌석의 다른 학생 해제:', currentSeat.studentId);
          await tx.seat.update({
            where: { id: seatId },
            data: { studentId: null },
          });
        }

        // 해당 학생이 이 클래스의 다른 좌석에 이미 배정되어 있으면 해제 (현재 좌석 제외)
        // 주의: 다른 클래스의 좌석은 그대로 유지 (클래스별로 독립적)
        const otherSeats = await tx.seat.findMany({
          where: { 
            classId: id, // 같은 클래스 내에서만 체크
            studentId: assignStudentId,
            id: { not: seatId },
          },
        });

        if (otherSeats.length > 0) {
          console.log(`🔄 이 클래스의 다른 좌석 ${otherSeats.length}개에서 학생 해제`);
          await tx.seat.updateMany({
            where: { 
              classId: id, // 같은 클래스 내에서만 해제
              studentId: assignStudentId,
              id: { not: seatId },
            },
            data: { studentId: null },
          });
        }
      }

      // 현재 좌석에 학생 배정 (또는 해제)
      console.log('💾 좌석 업데이트:', { seatId, studentId: assignStudentId });
      return await tx.seat.update({
        where: { id: seatId },
        data: { studentId: assignStudentId },
        include: {
          student: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      });
    });

    console.log('✅ 좌석 배정 완료:', {
      seatId: updatedSeat.id,
      studentId: updatedSeat.studentId,
      studentName: updatedSeat.student?.name,
    });

    res.json({
      success: true,
      message: assignStudentId ? '좌석이 배정되었습니다.' : '좌석이 해제되었습니다.',
      data: updatedSeat,
    });
  } catch (error: any) {
    console.error('❌ Failed to assign seat:', {
      classId: req.params.id,
      seatId: req.params.seatId,
      studentId: req.body.studentId,
      userId: req.user!.id,
      userRole: req.user!.role,
      errorName: error.name,
      errorCode: error.code,
      errorMessage: error.message,
      errorMeta: error.meta,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
    
    // AppError는 그대로 전달
    if (error instanceof AppError) {
      return next(error);
    }
    
    // Prisma 에러의 경우 더 구체적인 메시지 제공
    if (error.name === 'PrismaClientKnownRequestError') {
      if (error.code === 'P2002') {
        // P2002는 unique constraint 위반
        // 에러 메타데이터에서 어떤 필드가 문제인지 확인
        const target = (error as any).meta?.target;
        if (Array.isArray(target) && target.includes('classId') && target.includes('studentId')) {
          // 같은 클래스에서 이미 좌석이 배정된 경우
          return next(new AppError('이 학생은 이미 이 클래스의 다른 좌석에 배정되어 있습니다.', 400));
        } else {
          // 다른 경우 (데이터베이스 스키마가 아직 업데이트되지 않았을 수 있음)
          console.error('⚠️ P2002 에러 - 데이터베이스 스키마 확인 필요:', {
            target,
            errorMeta: (error as any).meta,
          });
          return next(new AppError('좌석 배정에 실패했습니다. 데이터베이스 스키마를 확인해주세요.', 400));
        }
      } else if (error.code === 'P2025') {
        return next(new AppError('좌석을 찾을 수 없습니다.', 404));
      }
    }
    
    next(error);
  }
});

// 클래스 삭제 (관리자만)
router.delete('/:id', authorize('SUPER_ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    await prisma.class.delete({ where: { id } });

    res.json({
      success: true,
      message: '클래스가 삭제되었습니다.',
    });
  } catch (error) {
    next(error);
  }
});

// 다음 기수 시작 (기간 재설정)
router.post('/:id/reset-period', authorize('SUPER_ADMIN', 'TEACHER'), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    // 클래스 정보 가져오기
    const classData = await prisma.class.findUnique({
      where: { id },
      select: { id: true, name: true, startDate: true, periodDays: true, teacherId: true },
    });

    if (!classData) {
      throw new AppError('클래스를 찾을 수 없습니다.', 404);
    }

    // 선생님은 자신의 클래스만 수정 가능
    if (req.user!.role === 'TEACHER' && classData.teacherId !== req.user!.id) {
      throw new AppError('권한이 없습니다.', 403);
    }

    // 현재 기간 계산
    const now = new Date();
    const currentPeriod = calculatePeriod(classData.startDate, classData.periodDays, now);

    // 다음 기간 시작일 = 현재 기간 종료일 + 1일
    const nextPeriodStartDate = addDays(currentPeriod.endDate, 1);

    // 클래스 업데이트
    const updatedClass = await prisma.class.update({
      where: { id },
      data: {
        startDate: nextPeriodStartDate,
      },
      include: {
        teacher: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json({
      success: true,
      message: '다음 기수가 시작되었습니다.',
      data: {
        class: updatedClass,
        previousPeriod: {
          startDate: format(currentPeriod.startDate, 'yyyy-MM-dd'),
          endDate: format(currentPeriod.endDate, 'yyyy-MM-dd'),
          periodNumber: currentPeriod.periodNumber,
        },
        nextPeriod: {
          startDate: format(nextPeriodStartDate, 'yyyy-MM-dd'),
          endDate: format(addDays(nextPeriodStartDate, classData.periodDays - 1), 'yyyy-MM-dd'),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

