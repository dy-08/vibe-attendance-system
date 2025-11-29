import nodemailer from 'nodemailer';

// ============================================
// 이메일 서비스 추상화 (확장 가능한 구조)
// 나중에 다른 서비스로 쉽게 교체 가능
// ============================================

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface EmailService {
  sendEmail(options: EmailOptions): Promise<boolean>;
}

// Gmail SMTP 서비스
class GmailService implements EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // TLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // 타임아웃 설정 (10초)
      connectionTimeout: 10000,
      socketTimeout: 10000,
      greetingTimeout: 10000,
      // 연결 풀 설정
      pool: true,
      maxConnections: 1,
      maxMessages: 3,
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    const EMAIL_TIMEOUT = 15000; // 15초 타임아웃
    
    // SMTP 설정 확인
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('❌ 이메일 전송 실패: SMTP 설정이 없습니다. SMTP_USER와 SMTP_PASS 환경 변수를 확인해주세요.');
      return false;
    }
    
    try {
      // 먼저 연결 확인
      try {
        await this.transporter.verify();
      } catch (verifyError: any) {
        console.error('❌ SMTP 서버 연결 확인 실패:', {
          error: verifyError?.message || verifyError,
          code: verifyError?.code,
        });
        // 연결 확인 실패해도 발송 시도는 계속 진행
      }

      // Promise.race를 사용하여 타임아웃 구현
      const sendPromise = this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('이메일 전송 타임아웃: 15초 내에 응답을 받지 못했습니다.'));
        }, EMAIL_TIMEOUT);
      });

      const result = await Promise.race([sendPromise, timeoutPromise]);
      
      // 발송 결과 확인 (nodemailer는 성공 시 SentMessageInfo 객체 반환)
      if (result) {
        const messageId = (result as any)?.messageId || (result as any)?.response?.split(' ')[2] || 'N/A';
        console.log(`✅ 이메일 전송 성공: ${options.to}${messageId !== 'N/A' ? ` (MessageID: ${messageId})` : ''}`);
        return true;
      } else {
        console.error('❌ 이메일 전송 실패: 응답이 없습니다.', result);
        return false;
      }
    } catch (error: any) {
      // 상세한 에러 로깅
      const errorMessage = error?.message || '알 수 없는 오류';
      const errorCode = error?.code || 'UNKNOWN';
      const errorResponse = error?.response || error?.responseCode || 'N/A';
      const command = error?.command || 'N/A';
      
      console.error('❌ 이메일 전송 실패:', {
        to: options.to,
        subject: options.subject,
        error: errorMessage,
        code: errorCode,
        response: errorResponse,
        command: command,
        smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
        smtpPort: process.env.SMTP_PORT || '587',
        smtpUser: process.env.SMTP_USER ? `${process.env.SMTP_USER.substring(0, 3)}***` : 'NOT_SET',
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      });
      
      // 특정 에러 타입에 대한 추가 정보 및 해결 방법 제시
      if (errorCode === 'ETIMEDOUT' || errorCode === 'ECONNRESET' || errorCode === 'ESOCKETTIMEDOUT') {
        console.error('⚠️ 네트워크 연결 문제로 인한 타임아웃입니다.');
        console.error('   - SMTP 서버 설정을 확인해주세요.');
        console.error('   - 방화벽이나 네트워크 정책으로 인해 SMTP 포트가 차단되었을 수 있습니다.');
        console.error('   - 배포 환경에서 SMTP 서버 접근이 제한될 수 있습니다.');
      } else if (errorCode === 'EAUTH') {
        console.error('⚠️ 인증 실패입니다.');
        console.error('   - SMTP_USER와 SMTP_PASS를 확인해주세요.');
        console.error('   - Gmail을 사용하는 경우, 앱 비밀번호를 사용해야 합니다.');
        console.error('   - 2단계 인증이 활성화되어 있는지 확인해주세요.');
      } else if (errorCode === 'ECONNREFUSED') {
        console.error('⚠️ SMTP 서버 연결이 거부되었습니다.');
        console.error('   - SMTP_HOST와 SMTP_PORT를 확인해주세요.');
        console.error('   - 서버가 해당 포트에서 리스닝하고 있는지 확인해주세요.');
      } else if (errorMessage.includes('타임아웃')) {
        console.error('⚠️ 이메일 전송이 타임아웃되었습니다.');
        console.error('   - SMTP 서버가 응답하지 않습니다.');
        console.error('   - 네트워크 연결 상태를 확인해주세요.');
      } else if (errorResponse === 535 || errorCode === 'EAUTH') {
        console.error('⚠️ 인증 정보가 올바르지 않습니다.');
        console.error('   - Gmail: 앱 비밀번호를 사용하고 있는지 확인해주세요.');
        console.error('   - 일반 비밀번호 대신 앱 비밀번호를 사용해야 합니다.');
      }
      
      return false;
    }
  }
}

// ============================================
// 나중에 추가할 수 있는 다른 서비스들
// ============================================

// Resend 서비스 (확장 예시)
// class ResendService implements EmailService {
//   async sendEmail(options: EmailOptions): Promise<boolean> {
//     // Resend API 호출
//     return true;
//   }
// }

// Brevo 서비스 (확장 예시)
// class BrevoService implements EmailService {
//   async sendEmail(options: EmailOptions): Promise<boolean> {
//     // Brevo API 호출
//     return true;
//   }
// }

// ============================================
// 이메일 서비스 팩토리
// ============================================

type EmailProvider = 'gmail' | 'resend' | 'brevo';

function createEmailService(provider: EmailProvider = 'gmail'): EmailService {
  switch (provider) {
    case 'gmail':
      return new GmailService();
    // case 'resend':
    //   return new ResendService();
    // case 'brevo':
    //   return new BrevoService();
    default:
      return new GmailService();
  }
}

// 기본 이메일 서비스 인스턴스
const emailService = createEmailService('gmail');

// ============================================
// 이메일 템플릿
// ============================================

export const emailTemplates = {
  // 임시 비밀번호 발송
  tempPassword: (userName: string, tempPassword: string) => ({
    subject: '[출석체크] 임시 비밀번호 안내',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .password-box { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
          .password { font-size: 24px; font-weight: bold; color: #667eea; letter-spacing: 2px; font-family: monospace; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-top: 20px; border-radius: 4px; }
          .footer { text-align: center; color: #888; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 임시 비밀번호 안내</h1>
          </div>
          <div class="content">
            <p>안녕하세요, <strong>${userName}</strong>님!</p>
            <p>요청하신 임시 비밀번호가 발급되었습니다.</p>
            
            <div class="password-box">
              <p style="margin: 0 0 10px 0; color: #666;">임시 비밀번호</p>
              <div class="password">${tempPassword}</div>
            </div>
            
            <div class="warning">
              <strong>⚠️ 보안 안내</strong>
              <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                <li>위 임시 비밀번호로 로그인 후 <strong>반드시 비밀번호를 변경</strong>해주세요.</li>
                <li>본인이 요청하지 않은 경우, 이 메일을 무시해주세요.</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p>본 메일은 발신 전용입니다.</p>
            <p>© 출석체크 시스템</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
안녕하세요, ${userName}님!

요청하신 임시 비밀번호가 발급되었습니다.

임시 비밀번호: ${tempPassword}

⚠️ 보안 안내
- 위 임시 비밀번호로 로그인 후 반드시 비밀번호를 변경해주세요.
- 본인이 요청하지 않은 경우, 이 메일을 무시해주세요.

© 출석체크 시스템
    `,
  }),

  // 나중에 추가할 템플릿들
  // 출석 알림
  // attendanceNotification: (userName: string, className: string, status: string) => ({ ... }),
  
  // 공지사항
  // announcement: (userName: string, title: string, content: string) => ({ ... }),
};

// ============================================
// 이메일 발송 함수들
// ============================================

export async function sendTempPasswordEmail(
  to: string,
  userName: string,
  tempPassword: string
): Promise<boolean> {
  const template = emailTemplates.tempPassword(userName, tempPassword);
  
  return emailService.sendEmail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
}

// SMTP 설정 확인
export function isEmailConfigured(): boolean {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

// 이메일 연결 테스트
export async function verifyEmailConnection(): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.log('⚠️ 이메일 설정이 되어있지 않습니다. SMTP_USER, SMTP_PASS를 확인해주세요.');
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.verify();
    console.log('✅ 이메일 서버 연결 성공');
    return true;
  } catch (error) {
    console.error('❌ 이메일 서버 연결 실패:', error);
    return false;
  }
}

export { emailService, EmailService, EmailOptions };

