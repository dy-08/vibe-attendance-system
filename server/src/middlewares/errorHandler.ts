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
    const prismaError = err as any;
    console.error('Prisma error code:', prismaError.code);
    console.error('Prisma error meta:', prismaError.meta);
    console.error('Prisma error message:', err.message);
    
    // 특정 에러 코드에 대한 구체적인 메시지
    let userMessage = '데이터베이스 요청 오류가 발생했습니다.';
    if (prismaError.code === 'P2002') {
      userMessage = '중복된 데이터가 있습니다. 이미 사용 중인 값입니다.';
    } else if (prismaError.code === 'P2003') {
      userMessage = '참조된 데이터를 찾을 수 없습니다.';
    } else if (prismaError.code === 'P2025') {
      userMessage = '요청한 데이터를 찾을 수 없습니다.';
    }
    
    return res.status(400).json({
      success: false,
      message: userMessage,
      ...(process.env.NODE_ENV === 'development' && {
        details: err.message,
        code: prismaError.code,
        meta: prismaError.meta,
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

