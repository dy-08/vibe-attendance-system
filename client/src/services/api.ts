import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// 개발 환경에서 API URL 확인
if (import.meta.env.DEV) {
  console.log('API URL:', API_URL);
  console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
}

// 프로덕션 환경에서도 API URL 확인 (디버깅용)
if (import.meta.env.PROD) {
  console.log('Production API URL:', API_URL);
  console.log('VITE_API_URL from env:', import.meta.env.VITE_API_URL);
}

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - 토큰 추가
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - 에러 처리
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const isAuthEndpoint = url.includes('/auth/login') || 
                          url.includes('/auth/kakao/callback') || 
                          url.includes('/auth/naver/callback');
    
    // 네트워크 에러 또는 API URL 문제
    if (!error.response) {
      console.error('Network error or API not reachable:', {
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        fullURL: error.config?.baseURL + error.config?.url,
        message: error.message,
      });
      
      // 프로덕션 환경에서 API URL이 설정되지 않은 경우
      if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
        console.error('VITE_API_URL is not set in production! Please set it in Netlify environment variables.');
      }
    }
    
    if (error.response?.status === 401) {
      // 토큰 만료 시 로그아웃 (로그인 API는 제외)
      if (!isAuthEndpoint) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    } else if (error.response?.status === 403) {
      // 접근 권한 없음 (비활성화된 계정 등)
      // 로그인 관련 API는 각 컴포넌트에서 처리하므로 인터셉터에서는 처리하지 않음
      if (!isAuthEndpoint) {
        const message = error.response?.data?.message;
        if (message?.includes('비활성화')) {
          // 비활성화된 계정인 경우 로그아웃하고 로그인 페이지로
          localStorage.removeItem('token');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login?inactive=true';
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

// API 함수들
export const authAPI = {
  login: (email: string, password: string) => 
    api.post('/auth/login', { email, password }),
  register: (data: any) => 
    api.post('/auth/register', data),
  me: () => 
    api.get('/auth/me'),
  updatePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/password', { currentPassword, newPassword }),
  getKakaoUrl: () =>
    api.get('/auth/kakao'),
  kakaoCallback: (code: string) =>
    api.post('/auth/kakao/callback', { code }),
  getNaverUrl: () =>
    api.get('/auth/naver'),
  naverCallback: (code: string, state: string) =>
    api.post('/auth/naver/callback', { code, state }),
  findEmail: (name: string, phone: string) =>
    api.post('/auth/find-email', { name, phone }),
  resetPassword: (email: string, name: string) =>
    api.post('/auth/reset-password', { email, name }),
};

export const userAPI = {
  getAll: (params?: any) => 
    api.get('/users', { params }),
  getById: (id: string) => 
    api.get(`/users/${id}`),
  update: (id: string, data: any) => 
    api.put(`/users/${id}`, data),
  updateProfile: (data: any) => 
    api.put('/users/profile/me', data),
  delete: (id: string) => 
    api.delete(`/users/${id}`),
  deleteMyAccount: () => 
    api.delete('/users/profile/me'),
};

export const classAPI = {
  getAll: () => 
    api.get('/classes'),
  getById: (id: string) => 
    api.get(`/classes/${id}`),
  create: (data: any) => 
    api.post('/classes', data),
  update: (id: string, data: any) => 
    api.put(`/classes/${id}`, data),
  delete: (id: string) => 
    api.delete(`/classes/${id}`),
  addStudent: (classId: string, studentId: string) =>
    api.post(`/classes/${classId}/students`, { studentId }),
  removeStudent: (classId: string, studentId: string) =>
    api.delete(`/classes/${classId}/students/${studentId}`),
  createSeats: (classId: string, rows: number, cols: number) =>
    api.post(`/classes/${classId}/seats`, { rows, cols }),
  assignSeat: (classId: string, seatId: string, studentId: string | null) =>
    api.put(`/classes/${classId}/seats/${seatId}`, { studentId }),
};

export const attendanceAPI = {
  getAll: (params?: any) => 
    api.get('/attendance', { params }),
  getByClassDate: (classId: string, date: string) =>
    api.get(`/attendance/class/${classId}/date/${date}`),
  getMy: (params?: any) =>
    api.get('/attendance/my', { params }),
  create: (data: any) => 
    api.post('/attendance', data),
  createBulk: (data: any) =>
    api.post('/attendance/bulk', data),
};

export const statsAPI = {
  getClassStats: (classId: string, months?: number) =>
    api.get(`/stats/class/${classId}`, { params: { months } }),
  getOverview: () =>
    api.get('/stats/overview'),
  getStudentStats: (studentId: string, months?: number) =>
    api.get(`/stats/student/${studentId}`, { params: { months } }),
  getClassMonthlyRates: (classId: string, month: string) =>
    api.get(`/stats/class/${classId}/monthly`, { params: { month } }),
};

export const uploadAPI = {
  avatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post('/upload/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

