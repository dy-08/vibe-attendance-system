import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ email?: string; name?: string }>({});

  const validate = () => {
    const newErrors: typeof errors = {};
    
    if (!email.trim()) {
      newErrors.email = '이메일을 입력해주세요.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = '유효한 이메일을 입력해주세요.';
    }
    
    if (!name.trim()) {
      newErrors.name = '이름을 입력해주세요.';
    } else if (name.trim().length < 2) {
      newErrors.name = '이름은 최소 2자 이상이어야 합니다.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.resetPassword(email.trim(), name.trim());
      setSuccess(true);
      
      // 개발 환경에서만 임시 비밀번호 표시
      if (response.data.tempPassword) {
        setTempPassword(response.data.tempPassword);
        toast.success('임시 비밀번호가 생성되었습니다.');
      } else {
        toast.success('비밀번호 재설정 링크가 이메일로 전송되었습니다.');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || '비밀번호 재설정에 실패했습니다.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-form">
        <div className="auth-form__header">
          <h1 className="auth-form__title">비밀번호 재설정</h1>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-lg)' }}>
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--spacing-sm)' }}>
              비밀번호 재설정 완료
            </div>
            {tempPassword ? (
              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <p style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--spacing-sm)' }}>
                  임시 비밀번호가 생성되었습니다.
                </p>
                <div style={{ 
                  padding: 'var(--spacing-md)', 
                  background: 'var(--bg-secondary)', 
                  borderRadius: 'var(--radius-md)', 
                  marginBottom: 'var(--spacing-md)' 
                }}>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)', marginBottom: 'var(--spacing-xs)' }}>
                    임시 비밀번호
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xl)', fontFamily: 'monospace', fontWeight: 'var(--font-weight-semibold)' }}>
                    {tempPassword}
                  </div>
                </div>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)' }}>
                  로그인 후 비밀번호를 변경해주세요.
                </p>
              </div>
            ) : (
              <p style={{ color: 'var(--text-tertiary)' }}>
                비밀번호 재설정 링크가 이메일로 전송되었습니다.<br />
                이메일을 확인해주세요.
              </p>
            )}
          </div>
          <Button onClick={() => navigate('/login')} full>
            로그인하기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-form">
      <div className="auth-form__header">
        <h1 className="auth-form__title">비밀번호 찾기</h1>
        <p className="auth-form__subtitle">가입 시 입력한 이메일과 이름을 입력해주세요.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="auth-form__fields">
          <Input
            type="email"
            label="이메일"
            placeholder="이메일을 입력하세요"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<EmailIcon />}
            error={errors.email}
            disabled={loading}
          />

          <Input
            type="text"
            label="이름"
            placeholder="이름을 입력하세요"
            value={name}
            onChange={(e) => setName(e.target.value)}
            icon={<UserIcon />}
            error={errors.name}
            disabled={loading}
          />
        </div>

        <div className="auth-form__actions">
          <Button
            type="submit"
            full
            loading={loading}
          >
            비밀번호 재설정
          </Button>
        </div>
      </form>

      <div className="auth-form__footer">
        <div style={{ marginBottom: 'var(--spacing-sm)' }}>
          <Link to="/login" style={{ marginRight: 'var(--spacing-sm)' }}>
            로그인으로 돌아가기
          </Link>
          <span style={{ color: 'var(--text-tertiary)' }}>|</span>
          <Link to="/find-email" style={{ marginLeft: 'var(--spacing-sm)' }}>
            이메일 찾기
          </Link>
        </div>
      </div>
    </div>
  );
}

