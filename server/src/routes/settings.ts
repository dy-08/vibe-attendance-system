import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { authenticate, authorize, AuthRequest } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

// 시스템 설정 조회
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const configs = await prisma.systemConfig.findMany({
      orderBy: { key: 'asc' },
    });

    // 설정을 객체로 변환
    const configMap: Record<string, any> = {};
    configs.forEach((config) => {
      try {
        configMap[config.key] = JSON.parse(config.value);
      } catch {
        configMap[config.key] = config.value;
      }
    });

    // 기본값 설정
    const defaultConfig = {
      'periodDays.min': configMap['periodDays.min'] || 1,
      'periodDays.max': configMap['periodDays.max'] || 365,
      'periodDays.default': configMap['periodDays.default'] || 30,
    };

    res.json({
      success: true,
      data: {
        ...defaultConfig,
        ...configMap,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 시스템 설정 업데이트 (관리자만)
router.put('/', authorize('SUPER_ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const { periodDaysMin, periodDaysMax, periodDaysDefault } = req.body;

    // 유효성 검사
    const min = parseInt(periodDaysMin);
    const max = parseInt(periodDaysMax);
    const defaultValue = parseInt(periodDaysDefault);

    if (isNaN(min) || min < 1) {
      throw new AppError('최소 기간은 1일 이상이어야 합니다.', 400);
    }
    if (isNaN(max) || max > 365) {
      throw new AppError('최대 기간은 365일 이하여야 합니다.', 400);
    }
    if (min > max) {
      throw new AppError('최소 기간은 최대 기간보다 작아야 합니다.', 400);
    }
    if (isNaN(defaultValue) || defaultValue < min || defaultValue > max) {
      throw new AppError(`기본값은 ${min}일 이상 ${max}일 이하여야 합니다.`, 400);
    }

    // 설정 업데이트 또는 생성
    const updates = [
      prisma.systemConfig.upsert({
        where: { key: 'periodDays.min' },
        update: { 
          value: min.toString(),
          updatedBy: req.user!.id,
        },
        create: {
          key: 'periodDays.min',
          value: min.toString(),
          description: '단위기간 최소값 (일)',
          updatedBy: req.user!.id,
        },
      }),
      prisma.systemConfig.upsert({
        where: { key: 'periodDays.max' },
        update: { 
          value: max.toString(),
          updatedBy: req.user!.id,
        },
        create: {
          key: 'periodDays.max',
          value: max.toString(),
          description: '단위기간 최대값 (일)',
          updatedBy: req.user!.id,
        },
      }),
      prisma.systemConfig.upsert({
        where: { key: 'periodDays.default' },
        update: { 
          value: defaultValue.toString(),
          updatedBy: req.user!.id,
        },
        create: {
          key: 'periodDays.default',
          value: defaultValue.toString(),
          description: '단위기간 기본값 (일)',
          updatedBy: req.user!.id,
        },
      }),
    ];

    await Promise.all(updates);

    res.json({
      success: true,
      message: '시스템 설정이 업데이트되었습니다.',
      data: {
        periodDaysMin: min,
        periodDaysMax: max,
        periodDaysDefault: defaultValue,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;


