import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function SocialCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { socialLogin, user } = useAuth();
  const processedRef = useRef(false);

  useEffect(() => {
    // 이미 처리된 경우 중복 실행 방지
    if (processedRef.current) return;

    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const provider = window.location.pathname.includes('/kakao') ? 'kakao' : 'naver';

      if (error) {
        toast.error('소셜 로그인에 실패했습니다.');
        navigate('/login');
        return;
      }

      if (!code) {
        toast.error('인증 코드를 받을 수 없습니다.');
        navigate('/login');
        return;
      }

      // 처리 시작 표시
      processedRef.current = true;

      try {
        const result = await socialLogin(provider, code, state || undefined);
        console.log('Social login result:', result);
        
        // 성공 시 역할에 맞는 대시보드로 이동
        // socialLogin이 반환하는 사용자 정보를 직접 사용
        if (result && result.user) {
          const redirectPath = 
            result.user.role === 'STUDENT' ? '/student' :
            result.user.role === 'TEACHER' ? '/teacher' :
            result.user.role === 'SUPER_ADMIN' ? '/admin' :
            '/guest'; // GUEST는 대기 페이지로
          
          console.log('Redirecting to:', redirectPath);
          // window.location을 사용하여 완전한 페이지 로드 보장
          window.location.href = redirectPath;
          return;
        }
        
        console.log('No result from socialLogin, waiting for user state update...');
        // user 상태가 업데이트되기를 기다린 후 리다이렉트 (fallback)
      } catch (error: any) {
        console.error('Social login error:', error);
        processedRef.current = false; // 실패 시 다시 시도 가능하도록
        const errorMessage = error.response?.data?.message || '소셜 로그인에 실패했습니다.';
        
        // 비활성화된 계정인 경우 로그인 페이지로 리다이렉트하고 모달 표시를 위한 파라미터 전달
        if (error.response?.status === 403 && errorMessage.includes('비활성화')) {
          // navigate 대신 window.location을 사용하여 완전한 페이지 로드 보장
          window.location.href = '/login?inactive=true';
          return;
        }
        
        if (errorMessage.includes('authorization code not found') || errorMessage.includes('invalid_grant')) {
          toast.error('인증 코드가 만료되었거나 이미 사용되었습니다. 다시 로그인해주세요.');
        } else {
          toast.error(errorMessage);
        }
        navigate('/login');
      }
    };

    handleCallback();
  }, [searchParams, navigate, socialLogin]);

  // user 상태가 업데이트되면 리다이렉트 (fallback - socialLogin이 반환값을 주지 않은 경우)
  useEffect(() => {
    if (user && processedRef.current) {
      console.log('User state updated, redirecting...', user);
      // 약간의 지연을 두어 상태 업데이트가 완전히 완료되도록 함
      const timer = setTimeout(() => {
        const redirectPath = 
          user.role === 'STUDENT' ? '/student' :
          user.role === 'TEACHER' ? '/teacher' :
          user.role === 'SUPER_ADMIN' ? '/admin' :
          '/guest'; // GUEST는 대기 페이지로
        
        console.log('Fallback redirect to:', redirectPath);
        // window.location을 사용하여 완전한 페이지 로드 보장
        window.location.href = redirectPath;
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [user]);

  return (
    <div className="loading-screen">
      <div className="spinner" />
      <p>소셜 로그인 처리 중...</p>
    </div>
  );
}


