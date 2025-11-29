import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { authenticate, authorize, AuthRequest } from '../middlewares/auth.js';
import { format, addDays, parseISO } from 'date-fns';

const router = Router();

router.use(authenticate);

// 휴강 신청 생성 (선생님)
router.post('/', authorize('TEACHER'), async (req: AuthRequest, res, next) => {
  try {
    const { classId, reason, dates } = req.body;
    const { id: teacherId } = req.user!;

    if (!classId || !reason || !dates || !Array.isArray(dates) || dates.length === 0) {
      throw new AppError('필수 정보가 누락되었습니다.', 400);
    }

    // 클래스 확인 및 권한 확인
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      select: { 
        id: true,
        teacherId: true,
        startDate: true,
        periodDays: true,
        teacher: {
          select: { id: true, name: true },
        },
      },
    });

    if (!classData) {
      throw new AppError('클래스를 찾을 수 없습니다.', 404);
    }

    if (classData.teacherId !== teacherId) {
      throw new AppError('이 클래스에 대한 권한이 없습니다.', 403);
    }

    // 휴강 신청 생성
    const request = await prisma.classCancellationRequest.create({
      data: {
        classId,
        teacherId,
        reason,
        dates,
        status: 'PENDING',
      },
      include: {
        class: {
          select: { id: true, name: true },
        },
        teacher: {
          select: { id: true, name: true },
        },
      },
    });

    res.json({
      success: true,
      data: request,
    });
  } catch (error) {
    next(error);
  }
});

// 내 휴강 신청 목록 조회 (선생님)
router.get('/my', authorize('TEACHER'), async (req: AuthRequest, res, next) => {
  try {
    const { id: teacherId } = req.user!;

    const requests = await prisma.classCancellationRequest.findMany({
      where: { teacherId },
      include: {
        class: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    next(error);
  }
});

// 휴강 신청 목록 조회 (슈퍼관리자)
router.get('/', authorize('SUPER_ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const { status } = req.query;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const requests = await prisma.classCancellationRequest.findMany({
      where,
      include: {
        class: {
          select: { id: true, name: true },
        },
        teacher: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    next(error);
  }
});

// 휴강 신청 승인 (슈퍼관리자)
router.put('/:id/approve', authorize('SUPER_ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { id: adminId } = req.user!;

    const request = await prisma.classCancellationRequest.findUnique({
      where: { id },
      include: {
        class: true,
      },
    });

    if (!request) {
      throw new AppError('휴강 신청을 찾을 수 없습니다.', 404);
    }

    if (request.status !== 'PENDING') {
      throw new AppError('이미 처리된 신청입니다.', 400);
    }

    // 클래스의 기간 정보 확인
    const classData = await prisma.class.findUnique({
      where: { id: request.classId },
      select: { startDate: true, periodDays: true },
    });

    if (!classData || !classData.startDate || !classData.periodDays) {
      throw new AppError('클래스의 기간 정보가 설정되지 않았습니다.', 400);
    }

    // 보강일 계산: 개강 마지막날 뒤로 연장
    const startDate = parseISO(classData.startDate.toISOString().split('T')[0]);
    const periodEndDate = addDays(startDate, classData.periodDays);
    const makeUpDays = request.dates.length;
    const newPeriodEndDate = addDays(periodEndDate, makeUpDays);
    const makeUpDates = request.dates.map((date, index) => {
      return format(addDays(periodEndDate, index + 1), 'yyyy-MM-dd');
    });

    // 클래스 기간 연장
    await prisma.class.update({
      where: { id: request.classId },
      data: {
        periodDays: classData.periodDays + makeUpDays,
      },
    });

    // 선생님의 연차/월차 차감 (승인 시에만 차감)
    const teacher = await prisma.user.findUnique({
      where: { id: request.teacherId },
      select: { annualLeave: true, monthlyLeave: true },
    });

    if (teacher) {
      const totalLeave = teacher.annualLeave + teacher.monthlyLeave;
      const daysToDeduct = request.dates.length;
      const newTotalLeave = Math.max(0, totalLeave - daysToDeduct);
      
      // 연차와 월차를 동일하게 취급하여 합쳐서 차감
      // 남은 연차가 더 많으면 연차에서 먼저 차감, 아니면 월차에서 차감
      let newAnnualLeave = teacher.annualLeave;
      let newMonthlyLeave = teacher.monthlyLeave;
      
      if (teacher.annualLeave >= daysToDeduct) {
        newAnnualLeave = teacher.annualLeave - daysToDeduct;
      } else {
        const remaining = daysToDeduct - teacher.annualLeave;
        newAnnualLeave = 0;
        newMonthlyLeave = Math.max(0, teacher.monthlyLeave - remaining);
      }

      await prisma.user.update({
        where: { id: request.teacherId },
        data: {
          annualLeave: newAnnualLeave,
          monthlyLeave: newMonthlyLeave,
        },
      });
    }

    // 휴강 신청 승인
    const updatedRequest = await prisma.classCancellationRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        reviewedBy: adminId,
      },
      include: {
        class: {
          select: { id: true, name: true },
        },
        teacher: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json({
      success: true,
      data: updatedRequest,
      message: `휴강이 승인되었습니다. 보강일은 ${format(newPeriodEndDate, 'yyyy년 M월 d일')}까지 연장됩니다.`,
    });
  } catch (error) {
    next(error);
  }
});

// 휴강 신청 삭제 (선생님: 자신의 거절된 신청만, 관리자: 모든 신청)
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user!;

    const request = await prisma.classCancellationRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new AppError('휴강 신청을 찾을 수 없습니다.', 404);
    }

    // 선생님은 자신의 거절된 신청만 삭제 가능
    if (role === 'TEACHER') {
      if (request.teacherId !== userId) {
        throw new AppError('권한이 없습니다.', 403);
      }
      if (request.status !== 'REJECTED') {
        throw new AppError('거절된 신청만 삭제할 수 있습니다.', 400);
      }
    }
    // 관리자는 모든 신청 삭제 가능

    await prisma.classCancellationRequest.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: '휴강 신청이 삭제되었습니다.',
    });
  } catch (error) {
    next(error);
  }
});

// 휴강 신청 거절 (슈퍼관리자)
router.put('/:id/reject', authorize('SUPER_ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { rejectedReason } = req.body;
    const { id: adminId } = req.user!;

    const request = await prisma.classCancellationRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new AppError('휴강 신청을 찾을 수 없습니다.', 404);
    }

    if (request.status !== 'PENDING') {
      throw new AppError('이미 처리된 신청입니다.', 400);
    }

    const updatedRequest = await prisma.classCancellationRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedReason: rejectedReason || '사유 없음',
        reviewedAt: new Date(),
        reviewedBy: adminId,
      },
      include: {
        class: {
          select: { id: true, name: true },
        },
        teacher: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json({
      success: true,
      data: updatedRequest,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

