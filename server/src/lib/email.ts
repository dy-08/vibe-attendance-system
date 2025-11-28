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
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      console.log(`✅ 이메일 전송 성공: ${options.to}`);
      return true;
    } catch (error) {
      console.error('❌ 이메일 전송 실패:', error);
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

