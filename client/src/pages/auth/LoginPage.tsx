import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../../components/common/Input';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
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
  const [inactiveModalOpen, setInactiveModalOpen] = useState(false);

  // URL 파라미터에서 inactive 확인 (소셜 로그인에서 리다이렉트된 경우)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('inactive') === 'true') {
      // 약간의 지연을 두어 페이지 렌더링 후 모달 표시
      setTimeout(() => {
        setInactiveModalOpen(true);
      }, 100);
      // URL에서 파라미터 제거
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

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
    } catch (error: any) {
      // 비활성화된 계정인 경우 모달 표시
      if (error.response?.status === 403 && error.response?.data?.message?.includes('비활성화')) {
        setInactiveModalOpen(true);
      }
      // 다른 에러는 AuthContext에서 toast로 처리됨
    } finally {
      setLoading(false);
    }
  };

  const [kakaoEnabled, setKakaoEnabled] = useState(true);
  const [naverEnabled, setNaverEnabled] = useState(true);
  const [checkingSocial, setCheckingSocial] = useState(true);

  useEffect(() => {
    // 소셜 로그인 설정 확인 (비동기로 확인하되, 실패해도 버튼은 활성화 상태 유지)
    const checkSocialLogin = async () => {
      try {
        await authAPI.getKakaoUrl();
        setKakaoEnabled(true);
      } catch (error: any) {
        // 네트워크 에러가 아닌 경우에만 비활성화 (500 에러 = 설정 안됨)
        if (error.response?.status === 500) {
          setKakaoEnabled(false);
        }
        // 네트워크 에러나 다른 에러는 버튼 활성화 상태 유지
      }

      try {
        await authAPI.getNaverUrl();
        setNaverEnabled(true);
      } catch (error: any) {
        // 네트워크 에러가 아닌 경우에만 비활성화 (500 에러 = 설정 안됨)
        if (error.response?.status === 500) {
          setNaverEnabled(false);
        }
        // 네트워크 에러나 다른 에러는 버튼 활성화 상태 유지
      }

      setCheckingSocial(false);
    };

    checkSocialLogin();
  }, []);

  const handleKakaoLogin = async () => {
    try {
      const response = await authAPI.getKakaoUrl();
      window.location.href = response.data.data.url;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '카카오 로그인을 시작할 수 없습니다.';
      toast.error(errorMessage);
      
      // 설정이 안 된 경우에만 비활성화
      if (error.response?.status === 500) {
        setKakaoEnabled(false);
      }
    }
  };

  const handleNaverLogin = async () => {
    try {
      const response = await authAPI.getNaverUrl();
      window.location.href = response.data.data.url;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '네이버 로그인을 시작할 수 없습니다.';
      toast.error(errorMessage);
      
      // 설정이 안 된 경우에만 비활성화
      if (error.response?.status === 500) {
        setNaverEnabled(false);
      }
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
          disabled={!kakaoEnabled || checkingSocial}
          style={{
            background: kakaoEnabled ? '#FEE500' : '#f4f4f5',
            borderColor: kakaoEnabled ? '#FEE500' : '#e4e4e7',
            color: kakaoEnabled ? '#000000' : '#71717a',
            fontWeight: 'var(--font-weight-medium)',
            opacity: kakaoEnabled ? 1 : 0.6,
            cursor: kakaoEnabled && !checkingSocial ? 'pointer' : 'not-allowed',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ marginRight: '8px' }}>
            <path d="M9 0C4.03 0 0 3.42 0 7.64c0 2.49 1.62 4.69 4.08 6.07L2.7 18l4.71-2.47c.63.09 1.27.14 1.92.14 4.97 0 9-3.42 9-7.64C18 3.42 13.97 0 9 0z" fill="currentColor"/>
          </svg>
          {checkingSocial ? '확인 중...' : '카카오로 로그인'}
        </Button>
        <Button
          variant="outline"
          full
          onClick={handleNaverLogin}
          disabled={!naverEnabled || checkingSocial}
          style={{
            background: naverEnabled ? '#03C75A' : '#f4f4f5',
            borderColor: naverEnabled ? '#03C75A' : '#e4e4e7',
            color: naverEnabled ? '#FFFFFF' : '#71717a',
            fontWeight: 'var(--font-weight-medium)',
            marginTop: 'var(--spacing-sm)',
            opacity: naverEnabled ? 1 : 0.6,
            cursor: naverEnabled && !checkingSocial ? 'pointer' : 'not-allowed',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ marginRight: '8px', flexShrink: 0 }}>
            <path d="M13.859 12L7.07 0H0v24h7.07V12l6.789 12h7.07L13.859 12z" fill="white"/>
          </svg>
          {checkingSocial ? '확인 중...' : '네이버로 로그인'}
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

      {/* 비활성화된 계정 알림 모달 */}
      <Modal
        isOpen={inactiveModalOpen}
        onClose={() => setInactiveModalOpen(false)}
        title="접근 권한 없음"
        size="sm"
        footer={
          <Button variant="primary" onClick={() => setInactiveModalOpen(false)} full>
            확인
          </Button>
        }
      >
        <div style={{ textAlign: 'center', padding: 'var(--spacing-md) 0' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            margin: '0 auto var(--spacing-lg)',
            borderRadius: '50%',
            background: 'var(--color-error-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="32" 
              height="32" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="var(--color-error)" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h3 style={{ 
            fontSize: 'var(--font-size-lg)', 
            fontWeight: 'var(--font-weight-semibold)',
            marginBottom: 'var(--spacing-sm)',
            color: 'var(--text-primary)'
          }}>
            계정이 비활성화되었습니다
          </h3>
          <p style={{ 
            fontSize: 'var(--font-size-sm)', 
            color: 'var(--text-secondary)',
            lineHeight: '1.6',
            marginBottom: 'var(--spacing-md)'
          }}>
            접근 권한이 없습니다.<br />
            계정이 비활성화되어 로그인할 수 없습니다.<br />
            관리자에게 문의하세요.
          </p>
        </div>
      </Modal>
    </div>
  );
}

