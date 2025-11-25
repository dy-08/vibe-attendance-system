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
    const { name, phone, role, isActive } = req.body;

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

