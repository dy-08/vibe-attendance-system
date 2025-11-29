import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import Avatar from '../common/Avatar';
import { cancellationAPI } from '../../services/api';

// Icons
const LogoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    <polyline points="9 12 11 14 15 10"></polyline>
  </svg>
);

const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>
);

const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
);

const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const GridIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"></rect>
    <rect x="14" y="3" width="7" height="7"></rect>
    <rect x="14" y="14" width="7" height="7"></rect>
    <rect x="3" y="14" width="7" height="7"></rect>
  </svg>
);

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);

const LogOutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
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

const ChevronLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);

const ChevronRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

// Navigation config by role
const getNavItems = (role: string) => {
  const studentNav = [
    { path: '/student', icon: <HomeIcon />, label: '대시보드', end: true },
    { path: '/student/attendance', icon: <CalendarIcon />, label: '출결 현황' },
    { path: '/student/profile', icon: <UserIcon />, label: '프로필' },
  ];

  const teacherNav = [
    { path: '/teacher', icon: <HomeIcon />, label: '대시보드', end: true },
    { path: '/teacher/my-classes', icon: <GridIcon />, label: '내 클래스 목록' },
    { path: '/teacher/students', icon: <UsersIcon />, label: '학생 관리' },
    { path: '/teacher/attendance', icon: <CalendarIcon />, label: '출결 관리' },
    { path: '/teacher/leave', icon: <CalendarIcon />, label: '연차/월차 관리' },
  ];

  const adminNav = [
    { path: '/admin', icon: <HomeIcon />, label: '대시보드', end: true },
    { path: '/admin/users', icon: <UsersIcon />, label: '사용자 관리' },
    { path: '/admin/classes', icon: <GridIcon />, label: '클래스 관리' },
    { path: '/admin/cancellation-requests', icon: <CalendarIcon />, label: '휴강 신청 관리' },
  ];

  const guestNav = [
    { path: '/guest', icon: <HomeIcon />, label: '대기 중', end: true },
  ];

  switch (role) {
    case 'STUDENT':
      return studentNav;
    case 'TEACHER':
      return teacherNav;
    case 'SUPER_ADMIN':
      return adminNav;
    case 'GUEST':
      return guestNav;
    default:
      return [];
  }
};

const getRoleName = (role: string) => {
  switch (role) {
    case 'STUDENT': return '학생';
    case 'TEACHER': return '선생님';
    case 'SUPER_ADMIN': return '관리자';
    case 'GUEST': return '손님';
    default: return '';
  }
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hasNewCancellationResponse, setHasNewCancellationResponse] = useState(false);

  if (!user) return null;

  const navItems = getNavItems(user.role);

  const getPageTitle = () => {
    const path = location.pathname;
    const item = navItems.find((nav) => 
      nav.end ? nav.path === path : path.startsWith(nav.path)
    );
    return item?.label || '대시보드';
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // 선생님인 경우 새로운 결재 답변 확인
  useEffect(() => {
    if (user?.role === 'TEACHER') {
      const checkNewResponses = async () => {
        try {
          const response = await cancellationAPI.getMy();
          const requests = response.data?.data || [];
          
          // reviewedAt이 있고, localStorage에 저장된 마지막 확인 시간보다 이후인 경우
          const hasNew = requests.some((req: any) => {
            if (!req.reviewedAt || (req.status !== 'APPROVED' && req.status !== 'REJECTED')) {
              return false;
            }
            const lastChecked = localStorage.getItem(`lastChecked_${req.id}`);
            return !lastChecked || new Date(req.reviewedAt) > new Date(lastChecked);
          });
          
          setHasNewCancellationResponse(hasNew);
        } catch (error) {
          console.error('Failed to check new cancellation responses:', error);
        }
      };
      
      checkNewResponses();
      // 30초마다 확인
      const interval = setInterval(checkNewResponses, 30000);
      return () => clearInterval(interval);
    }
  }, [user, location.pathname]); // location.pathname이 변경될 때마다 다시 확인

  return (
    <div className="dashboard-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''} ${sidebarOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar__header">
          <div className="sidebar__logo">
            <div className="sidebar__logo-icon">
              <LogoIcon />
            </div>
            <span className="sidebar__logo-text">출결 관리</span>
          </div>
        </div>

        <nav className="sidebar__nav">
          <div className="sidebar__nav-section">
            <div className="sidebar__nav-title">메뉴</div>
            <ul className="sidebar__nav-list">
              {navItems.map((item) => (
                <li key={item.path} style={{ position: 'relative' }}>
                  <NavLink
                    to={item.path}
                    end={item.end}
                    className={({ isActive }) =>
                      `sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''}`
                    }
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span className="sidebar__nav-icon">{item.icon}</span>
                    <span className="sidebar__nav-text">{item.label}</span>
                    {item.path === '/teacher/leave' && hasNewCancellationResponse && (
                      <span
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: 'var(--color-info)',
                          boxShadow: '0 0 0 2px var(--bg-primary)',
                        }}
                        title="새로운 결재 답변이 있습니다"
                      />
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          <div className="sidebar__nav-section">
            <div className="sidebar__nav-title">설정</div>
            <ul className="sidebar__nav-list">
              {user.role === 'SUPER_ADMIN' && (
                <li>
                  <NavLink
                    to="/admin/settings"
                    className={({ isActive }) =>
                      `sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''}`
                    }
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span className="sidebar__nav-icon"><SettingsIcon /></span>
                    <span className="sidebar__nav-text">시스템 설정</span>
                  </NavLink>
                </li>
              )}
              <li>
                <button 
                  className="sidebar__nav-item w-full"
                  onClick={toggleTheme}
                >
                  <span className="sidebar__nav-icon">
                    {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                  </span>
                  <span className="sidebar__nav-text">
                    {theme === 'light' ? '다크 모드' : '라이트 모드'}
                  </span>
                </button>
              </li>
              <li>
                <button 
                  className="sidebar__nav-item w-full"
                  onClick={handleLogout}
                >
                  <span className="sidebar__nav-icon"><LogOutIcon /></span>
                  <span className="sidebar__nav-text">로그아웃</span>
                </button>
              </li>
            </ul>
          </div>
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user">
            <Avatar 
              src={user.avatarUrl} 
              name={user.name} 
              size="sm" 
            />
            <div className="sidebar__user-info">
              <div className="sidebar__user-name">{user.name}</div>
              <div className="sidebar__user-role">{getRoleName(user.role)}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="dashboard-header__left">
            <button 
              className="dashboard-header__menu-btn"
              onClick={() => {
                // 모바일에서는 사이드바 열기, 데스크톱에서는 접기/펼치기
                if (window.innerWidth < 768) {
                  setSidebarOpen(true);
                } else {
                  setCollapsed(!collapsed);
                }
              }}
            >
              {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </button>
            <h1 className="dashboard-header__title">{getPageTitle()}</h1>
          </div>
          <div className="dashboard-header__right">
            <button className="dashboard-header__action" onClick={toggleTheme}>
              {theme === 'light' ? <MoonIcon /> : <SunIcon />}
            </button>
          </div>
        </header>

        <div className="dashboard-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

