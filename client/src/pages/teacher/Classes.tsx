import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { classAPI } from '../../services/api';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import EmptyState from '../../components/common/EmptyState';

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const SeatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="9" y1="3" x2="9" y2="21"></line>
    <line x1="15" y1="3" x2="15" y2="21"></line>
    <line x1="3" y1="9" x2="21" y2="9"></line>
    <line x1="3" y1="15" x2="21" y2="15"></line>
  </svg>
);

interface ClassData {
  id: string;
  name: string;
  description?: string;
  schedule?: string;
  maxStudents: number;
  isActive: boolean;
  teacher: { id: string; name: string };
  _count: { members: number; seats: number };
}

export default function TeacherClasses() {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassData[]>([]);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await classAPI.getAll();
      setClasses(response.data.data);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return <div className="loading-screen"><div className="spinner" /></div>;
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header__top">
          <div>
            <h2 className="page-header__title">내 클래스 목록</h2>
            <p className="page-header__subtitle">담당하고 있는 클래스 목록 · 총 {classes.length}개</p>
          </div>
        </div>
      </div>

      {classes.length === 0 ? (
        <EmptyState
          title="담당 클래스가 없습니다"
          description="현재 담당하고 있는 클래스가 없습니다."
        />
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--spacing-lg)' }}>
          {classes.map((cls) => (
            <Link key={cls.id} to={`/teacher/classes/${cls.id}`} style={{ textDecoration: 'none' }}>
              <Card hover className="h-full" style={{ 
                transition: 'all var(--transition-normal)',
                border: '1px solid var(--border-color)',
              }}>
                <CardBody style={{ padding: 'var(--spacing-lg)' }}>
                  {/* Header */}
                  <div className="flex items-start justify-between mb-lg">
                    <div 
                      className="p-md rounded-lg flex items-center justify-center"
                      style={{ 
                        background: 'linear-gradient(135deg, var(--color-primary-100), var(--color-primary-50))',
                        width: '48px',
                        height: '48px'
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7"></rect>
                        <rect x="14" y="3" width="7" height="7"></rect>
                        <rect x="14" y="14" width="7" height="7"></rect>
                        <rect x="3" y="14" width="7" height="7"></rect>
                      </svg>
                    </div>
                    <span 
                      className={`badge badge--${cls.isActive ? 'success' : 'default'}`}
                      style={{ fontSize: 'var(--font-size-xs)' }}
                    >
                      {cls.isActive ? '활성' : '비활성'}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="mb-sm" style={{ 
                    fontSize: 'var(--font-size-lg)', 
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--text-primary)',
                    lineHeight: '1.4'
                  }}>
                    {cls.name}
                  </h3>
                  <p className="text-sm text-tertiary mb-lg" style={{ 
                    minHeight: '40px',
                    lineHeight: '1.5'
                  }}>
                    {cls.description || '설명 없음'}
                  </p>

                  {/* Schedule */}
                  {cls.schedule && (
                    <div className="flex items-center gap-xs mb-md" style={{ 
                      padding: 'var(--spacing-sm)',
                      background: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-sm)'
                    }}>
                      <CalendarIcon />
                      <span className="text-sm text-secondary">{cls.schedule}</span>
                    </div>
                  )}

                  {/* Footer Stats */}
                  <div className="flex items-center justify-between pt-lg" style={{ 
                    borderTop: '1px solid var(--border-color)',
                    marginTop: 'auto'
                  }}>
                    <div className="flex items-center gap-xs">
                      <div style={{ 
                        color: 'var(--color-primary-500)',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        <UsersIcon />
                      </div>
                      <span className="text-sm font-medium">
                        {cls._count.members} / {cls.maxStudents}
                      </span>
                    </div>
                    <div className="flex items-center gap-xs text-sm text-tertiary">
                      <SeatIcon />
                      <span>좌석 {cls._count.seats}개</span>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

