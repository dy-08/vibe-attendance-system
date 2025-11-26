import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function SocialCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { socialLogin } = useAuth();

  useEffect(() => {
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

      try {
        await socialLogin(provider, code, state || undefined);
        // 성공 시 대시보드로 이동 (App.tsx에서 처리)
        navigate('/');
      } catch (error) {
        navigate('/login');
      }
    };

    handleCallback();
  }, [searchParams, navigate, socialLogin]);

  return (
    <div className="loading-screen">
      <div className="spinner" />
      <p>소셜 로그인 처리 중...</p>
    </div>
  );
}

