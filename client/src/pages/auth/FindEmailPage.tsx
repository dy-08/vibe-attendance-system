import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '../../components/common/Input';
import Button from '../../components/common/Button';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const PhoneIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
  </svg>
);

export default function FindEmailPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [foundEmail, setFoundEmail] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  const validate = () => {
    const newErrors: typeof errors = {};
    
    if (!name.trim()) {
      newErrors.name = '이름을 입력해주세요.';
    } else if (name.trim().length < 2) {
      newErrors.name = '이름은 최소 2자 이상이어야 합니다.';
    }
    
    if (!phone.trim()) {
      newErrors.phone = '전화번호를 입력해주세요.';
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
      const response = await authAPI.findEmail(name.trim(), phone.trim());
      setFoundEmail(response.data.data.email);
      toast.success('이메일을 찾았습니다.');
    } catch (error: any) {
      const message = error.response?.data?.message || '이메일 찾기에 실패했습니다.';
      toast.error(message);
      setFoundEmail(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form">
      <div className="auth-form__header">
        <h1 className="auth-form__title">이메일 찾기</h1>
        <p className="auth-form__subtitle">가입 시 입력한 이름과 전화번호를 입력해주세요.</p>
      </div>

      {foundEmail ? (
        <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-lg)' }}>
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--spacing-sm)' }}>
              이메일을 찾았습니다
            </div>
            <div style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-primary-500)' }}>{foundEmail}</div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'center' }}>
            <Button onClick={() => navigate('/login')}>로그인하기</Button>
            <Button variant="outline" onClick={() => {
              setFoundEmail(null);
              setName('');
              setPhone('');
            }}>다시 찾기</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="auth-form__fields">
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

            <Input
              type="tel"
              label="전화번호"
              placeholder="전화번호를 입력하세요"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              icon={<PhoneIcon />}
              error={errors.phone}
              disabled={loading}
            />
          </div>

          <div className="auth-form__actions">
            <Button
              type="submit"
              full
              loading={loading}
            >
              이메일 찾기
            </Button>
          </div>
        </form>
      )}

      <div className="auth-form__footer">
        <div style={{ marginBottom: 'var(--spacing-sm)' }}>
          <Link to="/login" style={{ marginRight: 'var(--spacing-sm)' }}>
            로그인으로 돌아가기
          </Link>
          <span style={{ color: 'var(--text-tertiary)' }}>|</span>
          <Link to="/reset-password" style={{ marginLeft: 'var(--spacing-sm)' }}>
            비밀번호 찾기
          </Link>
        </div>
      </div>
    </div>
  );
}

