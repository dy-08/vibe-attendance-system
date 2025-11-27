import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { authenticate, AuthRequest } from '../middlewares/auth.js';
import { z } from 'zod';

const router = Router();

// 입력 검증 스키마
const registerSchema = z.object({
  email: z.string().email('유효한 이메일을 입력해주세요.'),
  password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다.'),
  name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다.'),
  phone: z.string().optional(),
  role: z.enum(['STUDENT', 'TEACHER']).default('STUDENT'),
});

const loginSchema = z.object({
  email: z.string().email('유효한 이메일을 입력해주세요.'),
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
});

// 회원가입
router.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);

    // 이메일 중복 체크
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new AppError('이미 사용 중인 이메일입니다.', 400);
    }

    // 비밀번호 해시
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // 사용자 생성
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        phone: data.phone,
        role: data.role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    // JWT 생성
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: '회원가입이 완료되었습니다.',
      data: { user, token },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
});

// 로그인
router.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);

    // 사용자 찾기
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new AppError('이메일 또는 비밀번호가 올바르지 않습니다.', 401);
    }

    if (!user.isActive) {
      throw new AppError('접근 권한이 없습니다. 계정이 비활성화되었습니다. 관리자에게 문의하세요.', 403);
    }

    // 소셜 로그인 사용자는 비밀번호가 없음
    if (!user.password) {
      throw new AppError('소셜 로그인으로 가입한 계정입니다. 소셜 로그인을 사용해주세요.', 401);
    }

    // 비밀번호 확인
    const isValidPassword = await bcrypt.compare(data.password, user.password);

    if (!isValidPassword) {
      throw new AppError('이메일 또는 비밀번호가 올바르지 않습니다.', 401);
    }

    // JWT 생성
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: '로그인 성공',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl,
          phone: user.phone,
        },
        token,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
});

// 현재 사용자 정보
router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
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
    });

    if (!user) {
      throw new AppError('사용자를 찾을 수 없습니다.', 404);
    }

    // 비활성화된 계정 체크
    if (!user.isActive) {
      throw new AppError('접근 권한이 없습니다. 계정이 비활성화되었습니다. 관리자에게 문의하세요.', 403);
    }

    // isActive는 응답에서 제외
    const { isActive, ...userData } = user;

    res.json({
      success: true,
      data: userData,
    });
  } catch (error) {
    next(error);
  }
});

// 비밀번호 변경
router.put('/password', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError('현재 비밀번호와 새 비밀번호를 입력해주세요.', 400);
    }

    if (newPassword.length < 6) {
      throw new AppError('새 비밀번호는 최소 6자 이상이어야 합니다.', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      throw new AppError('사용자를 찾을 수 없습니다.', 404);
    }

    if (!user.password) {
      throw new AppError('소셜 로그인 사용자는 비밀번호를 변경할 수 없습니다.', 400);
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);

    if (!isValidPassword) {
      throw new AppError('현재 비밀번호가 올바르지 않습니다.', 401);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { password: hashedPassword },
    });

    res.json({
      success: true,
      message: '비밀번호가 변경되었습니다.',
    });
  } catch (error) {
    next(error);
  }
});

// 카카오 로그인 URL 생성
router.get('/kakao', (req, res) => {
  const KAKAO_CLIENT_ID = process.env.KAKAO_CLIENT_ID;
  const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
  const redirectUri = `${CLIENT_URL}/auth/kakao/callback`;
  
  if (!KAKAO_CLIENT_ID) {
    return res.status(500).json({
      success: false,
      message: '카카오 로그인이 설정되지 않았습니다.',
    });
  }

  // 리다이렉트 URI 로깅 (디버깅용)
  console.log('Kakao auth URL - redirectUri:', redirectUri);
  console.log('Kakao auth URL - CLIENT_URL:', CLIENT_URL);

  const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
  
  res.json({
    success: true,
    data: { url: kakaoAuthUrl },
  });
});

// 카카오 로그인 콜백
router.post('/kakao/callback', async (req, res, next) => {
  try {
    const { code } = req.body;
    const KAKAO_CLIENT_ID = process.env.KAKAO_CLIENT_ID;
    const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
    const redirectUri = `${CLIENT_URL}/auth/kakao/callback`;

    if (!code || !KAKAO_CLIENT_ID) {
      throw new AppError('인증 코드가 없습니다.', 400);
    }

    // 리다이렉트 URI 로깅 (디버깅용)
    console.log('Kakao callback - redirectUri:', redirectUri);
    console.log('Kakao callback - CLIENT_URL:', CLIENT_URL);

    // 카카오 토큰 요청
    const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: KAKAO_CLIENT_ID,
        redirect_uri: redirectUri,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Kakao token error:', tokenData);
      console.error('Kakao redirectUri used:', redirectUri);
      
      // 더 명확한 에러 메시지
      let errorMessage = '카카오 인증에 실패했습니다.';
      if (tokenData.error === 'invalid_grant') {
        errorMessage = '인증 코드가 만료되었거나 이미 사용되었습니다. 다시 로그인해주세요.';
      } else if (tokenData.error === 'invalid_client') {
        errorMessage = '카카오 앱 설정이 올바르지 않습니다. 관리자에게 문의하세요.';
      } else if (tokenData.error_description) {
        errorMessage = tokenData.error_description;
      } else if (tokenData.error) {
        errorMessage = `카카오 인증 오류: ${tokenData.error}`;
      }
      
      throw new AppError(errorMessage, 401);
    }

    // 카카오 사용자 정보 요청
    const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const kakaoUser = await userResponse.json();

    if (!kakaoUser.id) {
      throw new AppError('카카오 사용자 정보를 가져올 수 없습니다.', 401);
    }

    const socialId = `kakao_${kakaoUser.id}`;
    const email = kakaoUser.kakao_account?.email || `${socialId}@kakao.com`;
    const name = kakaoUser.kakao_account?.profile?.nickname || '카카오 사용자';
    const avatarUrl = kakaoUser.kakao_account?.profile?.profile_image_url;

    // 기존 사용자 찾기 (socialId 또는 email로)
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { socialId },
          { email },
        ],
      },
    });

    if (user) {
      // 비활성화된 계정 체크
      if (!user.isActive) {
        throw new AppError('접근 권한이 없습니다. 계정이 비활성화되었습니다. 관리자에게 문의하세요.', 403);
      }

      // 기존 사용자 업데이트 (소셜 로그인 정보 추가/업데이트)
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name,
          avatarUrl,
          provider: 'kakao',
          socialId,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatarUrl: true,
          phone: true,
        },
      });
    } else {
      // 새 사용자 생성
      user = await prisma.user.create({
        data: {
          email,
          name,
          avatarUrl,
          provider: 'kakao',
          socialId,
          password: null,
          role: 'GUEST',
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatarUrl: true,
          phone: true,
        },
      });
    }

    // JWT 생성
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: '카카오 로그인 성공',
      data: { user, token },
    });
  } catch (error) {
    next(error);
  }
});

// 네이버 로그인 URL 생성
router.get('/naver', (req, res) => {
  const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
  const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
  const redirectUri = `${CLIENT_URL}/auth/naver/callback`;
  const state = Math.random().toString(36).substring(2, 15);
  
  if (!NAVER_CLIENT_ID) {
    return res.status(500).json({
      success: false,
      message: '네이버 로그인이 설정되지 않았습니다.',
    });
  }

  // 리다이렉트 URI 로깅 (디버깅용)
  console.log('Naver auth URL - redirectUri:', redirectUri);
  console.log('Naver auth URL - CLIENT_URL:', CLIENT_URL);
  console.log('Naver auth URL - CLIENT_ID:', NAVER_CLIENT_ID ? '설정됨' : '설정 안됨');

  const naverAuthUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${NAVER_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  
  console.log('Naver auth URL generated:', naverAuthUrl);
  
  res.json({
    success: true,
    data: { url: naverAuthUrl },
  });
});

// 네이버 로그인 콜백
router.post('/naver/callback', async (req, res, next) => {
  try {
    const { code, state } = req.body;
    const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
    const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;
    const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
    const redirectUri = `${CLIENT_URL}/auth/naver/callback`;

    if (!code || !NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
      throw new AppError('인증 코드가 없습니다.', 400);
    }

    // 리다이렉트 URI 로깅 (디버깅용)
    console.log('Naver callback - redirectUri:', redirectUri);
    console.log('Naver callback - CLIENT_URL:', CLIENT_URL);

    // 네이버 토큰 요청
    const tokenResponse = await fetch('https://nid.naver.com/oauth2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: NAVER_CLIENT_ID,
        client_secret: NAVER_CLIENT_SECRET,
        redirect_uri: redirectUri,
        code,
        state: state || '',
      }),
    });

    const tokenData = await tokenResponse.json();

    console.log('Naver token response status:', tokenResponse.status);
    console.log('Naver token response:', JSON.stringify(tokenData, null, 2));

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Naver token error:', tokenData);
      console.error('Naver redirectUri used:', redirectUri);
      console.error('Naver CLIENT_ID:', NAVER_CLIENT_ID ? '설정됨' : '설정 안됨');
      console.error('Naver CLIENT_SECRET:', NAVER_CLIENT_SECRET ? '설정됨' : '설정 안됨');
      
      // 더 명확한 에러 메시지
      let errorMessage = '네이버 인증에 실패했습니다.';
      if (tokenData.error === 'invalid_grant') {
        errorMessage = '인증 코드가 만료되었거나 이미 사용되었습니다. 다시 로그인해주세요.';
      } else if (tokenData.error === 'invalid_client') {
        errorMessage = '네이버 앱 설정이 올바르지 않습니다. 관리자에게 문의하세요.';
      } else if (tokenData.error === 'invalid_request') {
        errorMessage = '요청이 올바르지 않습니다. 리다이렉트 URI를 확인해주세요.';
      } else if (tokenData.error_description) {
        errorMessage = tokenData.error_description;
      } else if (tokenData.error) {
        errorMessage = `네이버 인증 오류: ${tokenData.error}`;
      }
      
      throw new AppError(errorMessage, 401);
    }

    // 네이버 사용자 정보 요청
    const userResponse = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const naverUserData = await userResponse.json();

    console.log('Naver user info response status:', userResponse.status);
    console.log('Naver user info response:', JSON.stringify(naverUserData, null, 2));

    if (!userResponse.ok || naverUserData.resultcode !== '00') {
      console.error('Naver user info error:', naverUserData);
      console.error('Naver user info status:', userResponse.status);
      throw new AppError(
        naverUserData.message || '네이버 사용자 정보를 가져올 수 없습니다.',
        401
      );
    }

    const naverUser = naverUserData.response;

    if (!naverUser || !naverUser.id) {
      console.error('Naver user data:', naverUserData);
      throw new AppError('네이버 사용자 정보를 가져올 수 없습니다.', 401);
    }

    const socialId = `naver_${naverUser.id}`;
    const email = naverUser.email || `${socialId}@naver.com`;
    const name = naverUser.name || '네이버 사용자';
    const avatarUrl = naverUser.profile_image;

    // 기존 사용자 찾기 (socialId 또는 email로)
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { socialId },
          { email },
        ],
      },
    });

    if (user) {
      // 비활성화된 계정 체크
      if (!user.isActive) {
        throw new AppError('접근 권한이 없습니다. 계정이 비활성화되었습니다. 관리자에게 문의하세요.', 403);
      }

      // 기존 사용자 업데이트 (소셜 로그인 정보 추가/업데이트)
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name,
          avatarUrl,
          provider: 'naver',
          socialId,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatarUrl: true,
          phone: true,
        },
      });
    } else {
      // 새 사용자 생성
      user = await prisma.user.create({
        data: {
          email,
          name,
          avatarUrl,
          provider: 'naver',
          socialId,
          password: null,
          role: 'GUEST',
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatarUrl: true,
          phone: true,
        },
      });
    }

    // JWT 생성
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: '네이버 로그인 성공',
      data: { user, token },
    });
  } catch (error) {
    next(error);
  }
});

// 이메일 찾기 (아이디 찾기)
const findEmailSchema = z.object({
  name: z.string().min(2, '이름을 입력해주세요.'),
  phone: z.string().min(1, '전화번호를 입력해주세요.'),
});

router.post('/find-email', async (req, res, next) => {
  try {
    const data = findEmailSchema.parse(req.body);

    // 사용자 찾기 - name과 phone으로 검색
    const whereClause: any = {
      name: {
        equals: data.name.trim(),
        mode: 'insensitive',
      },
    };

    // phone이 있으면 조건에 추가
    const phoneValue = data.phone?.trim();
    if (phoneValue) {
      whereClause.phone = phoneValue;
    }

    // 모든 사용자 찾기 (provider 필터링은 나중에)
    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        email: true,
        provider: true,
      },
    });

    // provider가 null인 일반 회원만 필터링
    const user = users.find(u => u.provider === null || u.provider === undefined);

    // 사용자가 없거나 소셜 로그인 사용자인 경우
    if (!user) {
      throw new AppError('일치하는 정보를 찾을 수 없습니다.', 404);
    }

    // 이메일 마스킹 (보안)
    const emailParts = user.email.split('@');
    if (emailParts.length !== 2) {
      throw new AppError('이메일 형식이 올바르지 않습니다.', 500);
    }
    const localPart = emailParts[0];
    const domain = emailParts[1];
    const maskedLocal = localPart.length >= 2 
      ? localPart.substring(0, 2) + '***'
      : localPart.substring(0, 1) + '***';
    const maskedEmail = maskedLocal + '@' + domain;

    res.json({
      success: true,
      message: '이메일을 찾았습니다.',
      data: { email: maskedEmail },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
});

// 비밀번호 재설정 요청
const resetPasswordSchema = z.object({
  email: z.string().email('유효한 이메일을 입력해주세요.'),
  name: z.string().min(2, '이름을 입력해주세요.'),
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const data = resetPasswordSchema.parse(req.body);

    // 사용자 찾기
    const user = await prisma.user.findFirst({
      where: {
        email: data.email.trim(),
        name: data.name.trim(),
      },
      select: {
        id: true,
        provider: true,
      },
    });

    // 사용자가 없거나 소셜 로그인 사용자인 경우
    if (!user || (user.provider !== null && user.provider !== undefined)) {
      // 보안을 위해 존재 여부를 알리지 않음
      return res.json({
        success: true,
        message: '비밀번호 재설정 링크가 이메일로 전송되었습니다.',
      });
    }

    // 임시 비밀번호 생성 (8자리 랜덤)
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase();
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    // 비밀번호 업데이트
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // TODO: 실제 이메일 발송 기능 추가 필요
    // 여기서는 임시로 응답만 반환
    // 실제 운영 환경에서는 이메일 서비스(SendGrid, AWS SES 등)를 사용해야 함

    res.json({
      success: true,
      message: '임시 비밀번호가 이메일로 전송되었습니다.',
      // 개발 환경에서만 임시 비밀번호 반환 (실제 운영에서는 제거)
      ...(process.env.NODE_ENV === 'development' && { tempPassword }),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
});

export default router;

