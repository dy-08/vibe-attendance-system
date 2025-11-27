import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { authenticate, authorize, AuthRequest } from '../middlewares/auth.js';

const router = Router();

// 모든 라우트에 인증 필요
router.use(authenticate);

// 전체 사용자 목록 (관리자/선생님만)
router.get('/', authorize('SUPER_ADMIN', 'TEACHER'), async (req: AuthRequest, res, next) => {
  try {
    const { role, search, page = '1', limit = '20' } = req.query;

    const where: any = {};

    // 선생님은 학생만 조회 가능
    if (req.user!.role === 'TEACHER') {
      where.role = 'STUDENT';
    } else if (role) {
      where.role = role;
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          avatarUrl: true,
          isActive: true,
          createdAt: true,
        },
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// 특정 사용자 상세 조회
router.get('/:id', authorize('SUPER_ADMIN', 'TEACHER'), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
        studentClass: {
          include: {
            class: {
              select: {
                id: true,
                name: true,
                schedule: true,
              },
            },
          },
        },
        seat: {
          include: {
            class: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AppError('사용자를 찾을 수 없습니다.', 404);
    }

    // 선생님은 학생만 조회 가능
    if (req.user!.role === 'TEACHER' && user.role !== 'STUDENT') {
      throw new AppError('권한이 없습니다.', 403);
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

// 사용자 정보 수정 (관리자만)
router.put('/:id', authorize('SUPER_ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, role, isActive, classIds } = req.body;

    // 기존 사용자 정보 조회
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: {
        studentClass: {
          select: { classId: true },
        },
      },
    });

    if (!existingUser) {
      throw new AppError('사용자를 찾을 수 없습니다.', 404);
    }

    // 사용자 정보 업데이트
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(role && { role }),
        ...(isActive !== undefined && { isActive }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
      },
    });

    // 역할이 STUDENT이고 classIds가 제공된 경우 클래스 할당 처리
    if (role === 'STUDENT' && Array.isArray(classIds)) {
      const existingClassIds = existingUser.studentClass.map(cm => cm.classId);
      const newClassIds = classIds.filter((cid: string) => cid && cid.trim() !== '');
      
      // 제거할 클래스 (기존에 있지만 새 목록에 없는 것)
      const toRemove = existingClassIds.filter(cid => !newClassIds.includes(cid));
      // 추가할 클래스 (새 목록에 있지만 기존에 없는 것)
      const toAdd = newClassIds.filter(cid => !existingClassIds.includes(cid));

      // 클래스 제거
      if (toRemove.length > 0) {
        await prisma.classMember.deleteMany({
          where: {
            studentId: id,
            classId: { in: toRemove },
          },
        });

        // 좌석도 함께 해제
        await prisma.seat.updateMany({
          where: {
            classId: { in: toRemove },
            studentId: id,
          },
          data: { studentId: null },
        });
      }

      // 클래스 추가
      for (const classId of toAdd) {
        // 클래스 존재 확인
        const classExists = await prisma.class.findUnique({
          where: { id: classId },
        });

        if (!classExists) {
          console.warn(`Class ${classId} not found, skipping...`);
          continue;
        }

        // 이미 등록되어 있는지 확인
        const existing = await prisma.classMember.findUnique({
          where: {
            studentId_classId: { studentId: id, classId },
          },
        });

        if (!existing) {
          await prisma.classMember.create({
            data: {
              studentId: id,
              classId,
            },
          });
        }
      }
    } else if (role !== 'STUDENT' && existingUser.role === 'STUDENT') {
      // 역할이 STUDENT에서 다른 역할로 변경된 경우 모든 클래스에서 제거
      await prisma.classMember.deleteMany({
        where: { studentId: id },
      });

      // 좌석도 함께 해제
      await prisma.seat.updateMany({
        where: { studentId: id },
        data: { studentId: null },
      });
    }

    res.json({
      success: true,
      message: '사용자 정보가 수정되었습니다.',
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

// 프로필 수정 (본인)
router.put('/profile/me', async (req: AuthRequest, res, next) => {
  try {
    const { name, phone, avatarUrl } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        avatarUrl: true,
      },
    });

    res.json({
      success: true,
      message: '프로필이 수정되었습니다.',
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

// 본인 계정 탈퇴
router.delete('/profile/me', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;

    // 사용자 삭제
    await prisma.user.delete({
      where: { id: userId },
    });

    res.json({
      success: true,
      message: '계정이 삭제되었습니다.',
    });
  } catch (error) {
    next(error);
  }
});

// 사용자 삭제 (관리자만)
router.delete('/:id', authorize('SUPER_ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    // 자기 자신은 삭제 불가
    if (id === req.user!.id) {
      throw new AppError('자신의 계정은 삭제할 수 없습니다.', 400);
    }

    await prisma.user.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: '사용자가 삭제되었습니다.',
    });
  } catch (error) {
    next(error);
  }
});

export default router;

