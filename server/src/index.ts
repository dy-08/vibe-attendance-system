import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import classRoutes from './routes/classes.js';
import attendanceRoutes from './routes/attendance.js';
import statsRoutes from './routes/stats.js';
import uploadRoutes from './routes/upload.js';
import settingsRoutes from './routes/settings.js';
import cancellationRoutes from './routes/cancellation.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { verifyEmailConnection, isEmailConfigured } from './lib/email.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Request logging (개발 환경)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/cancellation', cancellationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// 서버 시작 시 이메일 연결 테스트
async function startServer() {
  // 이메일 설정 확인 및 연결 테스트
  if (isEmailConfigured()) {
    console.log('📧 이메일 설정 확인 중...');
    console.log(`   SMTP_HOST: ${process.env.SMTP_HOST || 'smtp.gmail.com'}`);
    console.log(`   SMTP_PORT: ${process.env.SMTP_PORT || '587'}`);
    console.log(`   SMTP_USER: ${process.env.SMTP_USER ? `${process.env.SMTP_USER.substring(0, 3)}***` : 'NOT_SET'}`);
    console.log(`   SMTP_PASS: ${process.env.SMTP_PASS ? '***설정됨***' : 'NOT_SET'}`);
    
    const emailConnected = await verifyEmailConnection();
    if (!emailConnected) {
      console.error('⚠️ 이메일 서버 연결 실패!');
      console.error('   → Render.com에서 SMTP 포트(587) 접근이 제한될 수 있습니다.');
      console.error('   → Render.com 로그에서 상세한 에러 메시지를 확인하세요.');
      console.error('   → 대안: Resend, SendGrid 등의 이메일 서비스 사용을 고려하세요.');
    }
  } else {
    console.log('⚠️ 이메일 설정이 없습니다. SMTP_USER와 SMTP_PASS 환경 변수를 설정하세요.');
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer().catch((error) => {
  console.error('❌ 서버 시작 실패:', error);
  process.exit(1);
});

