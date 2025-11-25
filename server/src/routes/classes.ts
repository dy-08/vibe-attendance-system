import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { authenticate, authorize, AuthRequest } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

// 클래스 목록
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { role } = req.user!;

    let where: any = { isActive: true };

    // 학생: 자신이 속한 클래스만
    if (role === 'STUDENT') {
      where.members = { some: { studentId: req.user!.id } };
    }
    // 선생님: 자신이 담당하는 클래스만
    else if (role === 'TEACHER') {
      where.teacherId = req.user!.id;
    }
    // 관리자: 모든 클래스

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

    res.json({
      success: true,
      data: classes,
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
    const { name, description, schedule, maxStudents, teacherId } = req.body;

    if (!name) {
      throw new AppError('클래스 이름은 필수입니다.', 400);
    }

    // 선생님은 자신만 담당으로 설정 가능
    const assignedTeacherId = req.user!.role === 'TEACHER' 
      ? req.user!.id 
      : (teacherId || req.user!.id);

    const newClass = await prisma.class.create({
      data: {
        name,
        description,
        schedule,
        maxStudents: maxStudents || 30,
        teacherId: assignedTeacherId,
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
    const { name, description, schedule, maxStudents, isActive } = req.body;

    // 선생님은 자신의 클래스만 수정 가능
    if (req.user!.role === 'TEACHER') {
      const classData = await prisma.class.findUnique({ where: { id } });
      if (classData?.teacherId !== req.user!.id) {
        throw new AppError('권한이 없습니다.', 403);
      }
    }

    const updatedClass = await prisma.class.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(schedule !== undefined && { schedule }),
        ...(maxStudents && { maxStudents }),
        ...(isActive !== undefined && { isActive }),
      },
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

    await prisma.classMember.create({
      data: {
        studentId,
        classId: id,
      },
    });

    res.status(201).json({
      success: true,
      message: '학생이 클래스에 추가되었습니다.',
    });
  } catch (error) {
    next(error);
  }
});

// 학생 제거
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

// 좌석 배치 설정
router.post('/:id/seats', authorize('SUPER_ADMIN', 'TEACHER'), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { rows, cols } = req.body;

    if (!rows || !cols || rows < 1 || cols < 1) {
      throw new AppError('유효한 행과 열 수를 입력해주세요.', 400);
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

    // studentId가 null이면 좌석 해제
    if (studentId) {
      // 해당 학생이 다른 좌석에 이미 배정되어 있으면 해제
      await prisma.seat.updateMany({
        where: { classId: id, studentId },
        data: { studentId: null },
      });
    }

    const seat = await prisma.seat.update({
      where: { id: seatId },
      data: { studentId: studentId || null },
      include: {
        student: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    res.json({
      success: true,
      message: studentId ? '좌석이 배정되었습니다.' : '좌석이 해제되었습니다.',
      data: seat,
    });
  } catch (error) {
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

export default router;

