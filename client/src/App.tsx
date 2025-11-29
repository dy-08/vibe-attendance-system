import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Layouts
import AuthLayout from './components/layouts/AuthLayout';
import DashboardLayout from './components/layouts/DashboardLayout';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import FindEmailPage from './pages/auth/FindEmailPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import SocialCallback from './pages/auth/SocialCallback';

// Student Pages
import StudentDashboard from './pages/student/Dashboard';
import StudentAttendance from './pages/student/Attendance';
import StudentProfile from './pages/student/Profile';

// Teacher Pages
import TeacherDashboard from './pages/teacher/Dashboard';
import TeacherClasses from './pages/teacher/Classes';
import TeacherClassDetail from './pages/teacher/ClassDetail';
import TeacherStudents from './pages/teacher/Students';
import TeacherAttendance from './pages/teacher/Attendance';
import TeacherLeave from './pages/teacher/Leave';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminClasses from './pages/admin/Classes';
import AdminSettings from './pages/admin/Settings';
import AdminCancellationRequests from './pages/admin/CancellationRequests';

// Guest Pages
import WaitingPage from './pages/guest/WaitingPage';

// Protected Route Component
function ProtectedRoute({ 
  children, 
  allowedRoles 
}: { 
  children: React.ReactNode; 
  allowedRoles?: string[];
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>로딩 중...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // 역할에 맞는 대시보드로 리다이렉트
    const redirectPath = 
      user.role === 'STUDENT' ? '/student' :
      user.role === 'TEACHER' ? '/teacher' :
      user.role === 'SUPER_ADMIN' ? '/admin' :
      '/guest'; // GUEST는 대기 페이지로
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}

// Public Route (로그인한 사용자는 대시보드로)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (user) {
    const redirectPath = 
      user.role === 'STUDENT' ? '/student' :
      user.role === 'TEACHER' ? '/teacher' :
      user.role === 'SUPER_ADMIN' ? '/admin' :
      '/guest'; // GUEST는 대기 페이지로
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<AuthLayout />}>
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          } 
        />
        <Route 
          path="/register" 
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          } 
        />
        <Route 
          path="/find-email" 
          element={
            <PublicRoute>
              <FindEmailPage />
            </PublicRoute>
          } 
        />
        <Route 
          path="/reset-password" 
          element={
            <PublicRoute>
              <ResetPasswordPage />
            </PublicRoute>
          } 
        />
        <Route 
          path="/auth/kakao/callback" 
          element={<SocialCallback />} 
        />
        <Route 
          path="/auth/naver/callback" 
          element={<SocialCallback />} 
        />
      </Route>

      {/* Student Routes */}
      <Route 
        path="/student" 
        element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<StudentDashboard />} />
        <Route path="attendance" element={<StudentAttendance />} />
        <Route path="profile" element={<StudentProfile />} />
      </Route>

      {/* Teacher Routes */}
      <Route 
        path="/teacher" 
        element={
          <ProtectedRoute allowedRoles={['TEACHER']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<TeacherDashboard />} />
        <Route path="my-classes" element={<TeacherClasses />} />
        <Route path="classes" element={<TeacherClasses />} />
        <Route path="classes/:id" element={<TeacherClassDetail />} />
        <Route path="leave" element={<TeacherLeave />} />
        <Route path="students" element={<TeacherStudents />} />
        <Route path="attendance" element={<TeacherAttendance />} />
      </Route>

      {/* Admin Routes */}
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="classes" element={<AdminClasses />} />
        <Route path="cancellation-requests" element={<AdminCancellationRequests />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* Guest Routes */}
      <Route 
        path="/guest" 
        element={
          <ProtectedRoute allowedRoles={['GUEST']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<WaitingPage />} />
      </Route>

      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      
      {/* 404 */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;

