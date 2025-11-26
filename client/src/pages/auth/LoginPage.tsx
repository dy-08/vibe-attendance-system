import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../../components/common/Input';
import Button from '../../components/common/Button';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';

const EmailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
    <polyline points="22,6 12,13 2,6"></polyline>
  </svg>
);

const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
);

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>
);

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const newErrors: typeof errors = {};
    
    if (!email) {
      newErrors.email = '이메일을 입력해주세요.';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = '유효한 이메일을 입력해주세요.';
    }
    
    if (!password) {
      newErrors.password = '비밀번호를 입력해주세요.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setLoading(true);
    try {
      await login(email, password);
      // Navigation is handled by App.tsx based on user role
    } catch {
      // Error is handled by AuthContext
    } finally {
      setLoading(false);
    }
  };

  const [kakaoEnabled, setKakaoEnabled] = useState(true);
  const [naverEnabled, setNaverEnabled] = useState(true);

  useEffect(() => {
    // 소셜 로그인 설정 확인
    authAPI.getKakaoUrl().catch(() => setKakaoEnabled(false));
    authAPI.getNaverUrl().catch(() => setNaverEnabled(false));
  }, []);

  const handleKakaoLogin = async () => {
    if (!kakaoEnabled) {
      toast.error('카카오 로그인이 설정되지 않았습니다.\n카카오 개발자 센터에서 앱을 등록하고 환경변수를 설정해주세요.');
      return;
    }
    try {
      const response = await authAPI.getKakaoUrl();
      window.location.href = response.data.data.url;
    } catch (error: any) {
      toast.error(error.response?.data?.message || '카카오 로그인을 시작할 수 없습니다.');
      setKakaoEnabled(false);
    }
  };

  const handleNaverLogin = async () => {
    if (!naverEnabled) {
      toast.error('네이버 로그인이 설정되지 않았습니다.\n네이버 개발자 센터에서 애플리케이션을 등록하고 환경변수를 설정해주세요.');
      return;
    }
    try {
      const response = await authAPI.getNaverUrl();
      window.location.href = response.data.data.url;
    } catch (error: any) {
      toast.error(error.response?.data?.message || '네이버 로그인을 시작할 수 없습니다.');
      setNaverEnabled(false);
    }
  };

  return (
    <div className="auth-form">
      <div className="auth-form__header">
        <h1 className="auth-form__title">로그인</h1>
        <p className="auth-form__subtitle">계정에 로그인하세요</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="auth-form__fields">
          <Input
            type="email"
            label="이메일"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<EmailIcon />}
            error={errors.email}
            autoComplete="email"
          />

          <Input
            type={showPassword ? 'text' : 'password'}
            label="비밀번호"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<LockIcon />}
            iconRight={
              <span onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </span>
            }
            error={errors.password}
            autoComplete="current-password"
          />
        </div>

        <div className="auth-form__actions">
          <Button type="submit" full loading={loading}>
            로그인
          </Button>
        </div>
      </form>

      <div className="auth-form__divider">
        <span>또는</span>
      </div>

      <div className="auth-form__social">
        <Button
          variant="outline"
          full
          onClick={handleKakaoLogin}
          disabled={!kakaoEnabled}
          style={{
            background: kakaoEnabled ? '#FEE500' : '#f4f4f5',
            borderColor: kakaoEnabled ? '#FEE500' : '#e4e4e7',
            color: kakaoEnabled ? '#000000' : '#71717a',
            fontWeight: 'var(--font-weight-medium)',
            opacity: kakaoEnabled ? 1 : 0.6,
            cursor: kakaoEnabled ? 'pointer' : 'not-allowed',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ marginRight: '8px' }}>
            <path d="M9 0C4.03 0 0 3.42 0 7.64c0 2.49 1.62 4.69 4.08 6.07L2.7 18l4.71-2.47c.63.09 1.27.14 1.92.14 4.97 0 9-3.42 9-7.64C18 3.42 13.97 0 9 0z" fill="currentColor"/>
          </svg>
          카카오로 로그인
        </Button>
        <Button
          variant="outline"
          full
          onClick={handleNaverLogin}
          disabled={!naverEnabled}
          style={{
            background: naverEnabled ? '#03C75A' : '#f4f4f5',
            borderColor: naverEnabled ? '#03C75A' : '#e4e4e7',
            color: naverEnabled ? '#FFFFFF' : '#71717a',
            fontWeight: 'var(--font-weight-medium)',
            marginTop: 'var(--spacing-sm)',
            opacity: naverEnabled ? 1 : 0.6,
            cursor: naverEnabled ? 'pointer' : 'not-allowed',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ marginRight: '8px', flexShrink: 0 }}>
            <path d="M13.859 12L7.07 0H0v24h7.07V12l6.789 12h7.07L13.859 12z" fill="white"/>
          </svg>
          네이버로 로그인
        </Button>
      </div>

      <div className="auth-form__footer">
        <div className="mb-sm">
          <Link to="/find-email" className="auth-link" style={{ marginRight: 'var(--spacing-sm)' }}>
            이메일 찾기
          </Link>
          <span style={{ color: 'var(--text-tertiary)' }}>|</span>
          <Link to="/reset-password" className="auth-link" style={{ marginLeft: 'var(--spacing-sm)' }}>
            비밀번호 찾기
          </Link>
        </div>
        <div>
          계정이 없으신가요? <Link to="/register">회원가입</Link>
        </div>
      </div>

      {/* Demo accounts info */}
      <div style={{ 
        marginTop: '2rem', 
        padding: '1rem', 
        background: 'var(--bg-tertiary)', 
        borderRadius: 'var(--radius-md)',
        fontSize: 'var(--font-size-xs)',
        color: 'var(--text-tertiary)'
      }}>
        <strong style={{ color: 'var(--text-secondary)' }}>테스트 계정</strong>
        <div style={{ marginTop: '0.5rem' }}>
          관리자: admin@academy.com<br />
          선생님: teacher1@academy.com<br />
          학생: student1@academy.com<br />
          <span style={{ color: 'var(--text-tertiary)' }}>비밀번호: password123</span>
        </div>
      </div>
    </div>
  );
}

