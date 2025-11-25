import { Outlet } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

// Icons
const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const LogoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    <polyline points="9 12 11 14 15 10"></polyline>
  </svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
  </svg>
);

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"></circle>
    <line x1="12" y1="1" x2="12" y2="3"></line>
    <line x1="12" y1="21" x2="12" y2="23"></line>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
    <line x1="1" y1="12" x2="3" y2="12"></line>
    <line x1="21" y1="12" x2="23" y2="12"></line>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
  </svg>
);

export default function AuthLayout() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="auth-layout">
      {/* Left side - Branding */}
      <div className="auth-brand">
        <div className="auth-brand__content">
          <div className="auth-brand__logo">
            <div className="auth-brand__logo-icon">
              <LogoIcon />
            </div>
            <span className="auth-brand__logo-text">출결 관리</span>
          </div>
          
          <h1 className="auth-brand__title">
            학원 출결 관리를<br />
            더 스마트하게
          </h1>
          
          <p className="auth-brand__description">
            실시간 출결 확인, 좌석 관리, 통계 분석까지<br />
            한 곳에서 편리하게 관리하세요.
          </p>

          <div className="auth-brand__features">
            <div className="auth-brand__feature">
              <CheckIcon />
              <span>실시간 출결 현황 확인</span>
            </div>
            <div className="auth-brand__feature">
              <CheckIcon />
              <span>클래스별 좌석 관리</span>
            </div>
            <div className="auth-brand__feature">
              <CheckIcon />
              <span>출석률 통계 및 분석</span>
            </div>
            <div className="auth-brand__feature">
              <CheckIcon />
              <span>카카오톡/SMS 알림</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="auth-form-container">
        <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
          <button 
            className="btn btn--ghost btn--icon" 
            onClick={toggleTheme}
            aria-label="테마 변경"
          >
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
          </button>
        </div>
        <Outlet />
      </div>
    </div>
  );
}

