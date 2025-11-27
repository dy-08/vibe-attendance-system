import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody } from '../../components/common/Card';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

export default function WaitingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  // 권한이 변경되었는지 주기적으로 확인
  useEffect(() => {
    if (!user || user.role !== 'GUEST') return;

    const checkRoleUpdate = async () => {
      if (checking) return;
      setChecking(true);
      
      try {
        const response = await api.get('/auth/me');
        const updatedUser = response.data.data;
        
        // 권한이 변경되었으면 리다이렉트
        if (updatedUser.role !== 'GUEST') {
          const redirectPath = 
            updatedUser.role === 'STUDENT' ? '/student' :
            updatedUser.role === 'TEACHER' ? '/teacher' :
            updatedUser.role === 'SUPER_ADMIN' ? '/admin' :
            '/guest';
          window.location.href = redirectPath; // 완전한 페이지 리로드로 상태 업데이트
        }
      } catch (error) {
        // 에러 무시
      } finally {
        setChecking(false);
      }
    };

    // 5초마다 권한 확인
    const interval = setInterval(checkRoleUpdate, 5000);

    return () => clearInterval(interval);
  }, [user, checking]);

  return (
    <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto', padding: 'var(--spacing-xl)' }}>
      <Card>
        <CardBody>
          <div style={{ textAlign: 'center', padding: 'var(--spacing-xl) 0' }}>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              margin: '0 auto var(--spacing-lg)',
              borderRadius: '50%',
              background: 'var(--color-primary-100)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="40" 
                height="40" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="var(--color-primary-600)" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            
            <h2 style={{ 
              fontSize: 'var(--font-size-xl)', 
              fontWeight: 'var(--font-weight-bold)',
              marginBottom: 'var(--spacing-md)',
              color: 'var(--text-primary)'
            }}>
              권한 승인 대기 중
            </h2>
            
            <p style={{ 
              fontSize: 'var(--font-size-base)', 
              color: 'var(--text-secondary)',
              lineHeight: '1.6',
              marginBottom: 'var(--spacing-lg)'
            }}>
              안녕하세요, <strong>{user?.name}</strong>님!<br />
              계정이 생성되었지만 아직 권한이 부여되지 않았습니다.<br />
              관리자가 권한을 수정해주시면 서비스를 이용하실 수 있습니다.
            </p>

            <div style={{
              marginTop: 'var(--spacing-xl)',
              padding: 'var(--spacing-lg)',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'left'
            }}>
              <h3 style={{
                fontSize: 'var(--font-size-base)',
                fontWeight: 'var(--font-weight-semibold)',
                marginBottom: 'var(--spacing-sm)',
                color: 'var(--text-primary)'
              }}>
                다음 단계
              </h3>
              <ol style={{
                margin: 0,
                paddingLeft: 'var(--spacing-lg)',
                color: 'var(--text-secondary)',
                lineHeight: '1.8'
              }}>
                <li>관리자에게 계정 승인을 요청하세요</li>
                <li>관리자가 학생 또는 선생님 권한을 부여합니다</li>
                <li>권한이 부여되면 자동으로 해당 페이지로 이동합니다</li>
              </ol>
            </div>

            <div style={{ marginTop: 'var(--spacing-lg)' }}>
              <button
                onClick={() => window.location.reload()}
                className="btn btn--primary"
                style={{ minWidth: '120px' }}
              >
                새로고침
              </button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

