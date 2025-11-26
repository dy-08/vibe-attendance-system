import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);
  console.error('Error stack:', err.stack);
  console.error('Error name:', err.name);
  console.error('Request URL:', req.url);
  console.error('Request method:', req.method);
  console.error('Request body:', req.body);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // Prisma 에러 처리
  if (err.name === 'PrismaClientKnownRequestError' || 
      err.name === 'PrismaClientValidationError' || 
      err.name === 'PrismaClientInitializationError') {
    console.error('Prisma error code:', (err as any).code);
    console.error('Prisma error meta:', (err as any).meta);
    console.error('Prisma error message:', err.message);
    return res.status(400).json({
      success: false,
      message: '데이터베이스 요청 오류가 발생했습니다.',
      ...(process.env.NODE_ENV === 'development' && {
        details: err.message,
      }),
    });
  }

  // Zod 에러 처리
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      message: '입력 데이터가 올바르지 않습니다.',
    });
  }

  // 기본 에러
  return res.status(500).json({
    success: false,
    message: '서버 내부 오류가 발생했습니다.',
    ...(process.env.NODE_ENV === 'development' && { 
      error: err.message,
      stack: err.stack 
    }),
  });
};

