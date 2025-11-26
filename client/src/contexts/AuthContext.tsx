import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, authAPI } from '../services/api';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'STUDENT' | 'TEACHER' | 'SUPER_ADMIN';
  phone?: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
  socialLogin: (provider: 'kakao' | 'naver', code: string, state?: string) => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: 'STUDENT' | 'TEACHER';
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 초기 로드 시 토큰 확인
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.data);
    } catch {
      localStorage.removeItem('token');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user, token } = response.data.data;
      
      localStorage.setItem('token', token);
      setUser(user);
      toast.success(`환영합니다, ${user.name}님!`);
    } catch (error: any) {
      const message = error.response?.data?.message || '로그인에 실패했습니다.';
      toast.error(message);
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await api.post('/auth/register', data);
      const { user, token } = response.data.data;
      
      localStorage.setItem('token', token);
      setUser(user);
      toast.success('회원가입이 완료되었습니다!');
    } catch (error: any) {
      const message = error.response?.data?.message || '회원가입에 실패했습니다.';
      toast.error(message);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    toast.success('로그아웃 되었습니다.');
  };

  const updateUser = (data: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...data });
    }
  };

  const socialLogin = async (provider: 'kakao' | 'naver', code: string, state?: string) => {
    try {
      const response = provider === 'kakao' 
        ? await authAPI.kakaoCallback(code)
        : await authAPI.naverCallback(code, state || '');
      
      const { user, token } = response.data.data;
      
      localStorage.setItem('token', token);
      setUser(user);
      toast.success(`환영합니다, ${user.name}님!`);
    } catch (error: any) {
      const message = error.response?.data?.message || '소셜 로그인에 실패했습니다.';
      toast.error(message);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateUser, socialLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

