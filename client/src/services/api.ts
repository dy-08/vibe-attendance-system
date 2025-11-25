import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

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
    if (error.response?.status === 401) {
      // 토큰 만료 시 로그아웃
      localStorage.removeItem('token');
      window.location.href = '/login';
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

