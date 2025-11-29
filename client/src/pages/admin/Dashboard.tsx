import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { statsAPI } from '../../services/api';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import StatCard from '../../components/common/StatCard';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import ProgressRing from '../../components/common/ProgressRing';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import toast from 'react-hot-toast';

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const TeacherIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const GridIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"></rect>
    <rect x="14" y="3" width="7" height="7"></rect>
    <rect x="14" y="14" width="7" height="7"></rect>
    <rect x="3" y="14" width="7" height="7"></rect>
  </svg>
);

const ChartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"></line>
    <line x1="12" y1="20" x2="12" y2="4"></line>
    <line x1="6" y1="20" x2="6" y2="14"></line>
  </svg>
);

interface OverviewData {
  counts: {
    totalStudents: number;
    totalTeachers: number;
    totalClasses: number;
    activeClasses: number;
  };
  monthlyStats: {
    total: number;
    present: number;
    absent: number;
    rate: number;
  };
  classStats: { id: string; name: string; rate: number; status?: string }[];
  cancelledClasses?: { id: string; name: string; status: string }[];
  warningStudents: { id: string; name: string; email: string; avatarUrl?: string; rate: number; absent: number }[];
}

// 파스텔 톤 색상
const COLORS = ['#86efac', '#fca5a5', '#fde047', '#93c5fd'];

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OverviewData | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await statsAPI.getOverview();
      setData(response.data.data);
    } catch (error: any) {
      console.error('Failed to fetch overview:', error);
      const errorMessage = error.response?.data?.message || '대시보드 데이터를 불러오는데 실패했습니다.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-screen"><div className="spinner" /></div>;
  }

  if (!data) {
    return <div>데이터를 불러올 수 없습니다.</div>;
  }

  const pieData = [
    { name: '출석', value: data.monthlyStats.present },
    { name: '결석', value: data.monthlyStats.absent },
  ];

  return (
    <div className="animate-fade-in">
      {/* Stats */}
      <div className="stats-grid">
        <StatCard
          icon={<UsersIcon />}
          iconVariant="primary"
          label="총 학생 수"
          value={data.counts.totalStudents}
        />
        <StatCard
          icon={<TeacherIcon />}
          iconVariant="secondary"
          label="총 선생님 수"
          value={data.counts.totalTeachers}
        />
        <StatCard
          icon={<GridIcon />}
          iconVariant="success"
          label="활성 클래스"
          value={data.counts.activeClasses}
        />
        <StatCard
          icon={<ChartIcon />}
          iconVariant="warning"
          label="이번 달 출석률"
          value={`${data.monthlyStats.rate}%`}
        />
      </div>

      <div className="two-column">
        {/* Attendance Overview */}
        <Card>
          <CardHeader>
            <h4>이번 달 출결 현황</h4>
          </CardHeader>
          <CardBody>
            <div className="flex items-center justify-around">
              <div style={{ width: '150px', height: '150px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-md">
                <div className="flex items-center gap-sm">
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: '#86efac' }} />
                  <span className="text-sm">출석: {data.monthlyStats.present}</span>
                </div>
                <div className="flex items-center gap-sm">
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: '#fca5a5' }} />
                  <span className="text-sm">결석: {data.monthlyStats.absent}</span>
                </div>
                <div className="text-2xl font-bold mt-md">
                  {data.monthlyStats.rate}%
                </div>
                <div className="text-sm text-tertiary">전체 출석률</div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Class Stats */}
        <Card>
          <CardHeader>
            <h4>클래스별 출석률</h4>
            <Link to="/admin/classes">
              <Button variant="ghost" size="sm">전체보기</Button>
            </Link>
          </CardHeader>
          <CardBody>
            {data.classStats.length === 0 ? (
              <p className="text-tertiary text-center">클래스가 없습니다.</p>
            ) : (
              <div style={{ height: '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.classStats.slice(0, 5)} layout="vertical">
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      width={100}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`${value}%`, '출석률']}
                      contentStyle={{ 
                        background: 'var(--bg-primary)', 
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    />
                    <Bar dataKey="rate" fill="#7dd3fc" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Cancelled Classes - 부드럽게 표시 */}
      {data.cancelledClasses && data.cancelledClasses.length > 0 && (
        <Card className="mt-lg" style={{ 
          border: '1px solid rgba(239, 68, 68, 0.2)', 
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(239, 68, 68, 0.02) 100%)',
        }}>
          <CardHeader>
            <h4 style={{ 
              color: 'var(--text-primary)',
              fontWeight: 500,
            }}>
              <span style={{ 
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.6)',
                marginRight: '8px',
                verticalAlign: 'middle',
              }} />
              폐강된 클래스 ({data.cancelledClasses.length}개)
            </h4>
            <Link to="/admin/classes">
              <Button variant="ghost" size="sm">전체보기</Button>
            </Link>
          </CardHeader>
          <CardBody>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
              {data.cancelledClasses.map((cls) => (
                <div 
                  key={cls.id}
                  className="flex items-center gap-md p-md rounded-lg"
                  style={{ 
                    background: 'var(--bg-primary)', 
                    border: '1px solid rgba(239, 68, 68, 0.15)',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.03)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.15)';
                    e.currentTarget.style.background = 'var(--bg-primary)';
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate" style={{ 
                      color: 'var(--text-primary)',
                      opacity: 0.85,
                    }}>
                      {cls.name}
                    </div>
                    <div className="text-xs text-tertiary mt-xs" style={{ 
                      color: 'rgba(239, 68, 68, 0.7)',
                    }}>
                      폐강 처리됨
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Warning Students */}
      {data.warningStudents.length > 0 && (
        <Card className="mt-lg">
          <CardHeader>
            <h4>⚠️ 출석률 주의 학생 ({data.warningStudents.length}명)</h4>
            <Link to="/admin/users">
              <Button variant="ghost" size="sm">전체보기</Button>
            </Link>
          </CardHeader>
          <CardBody>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 'var(--spacing-md)' }}>
              {data.warningStudents.slice(0, 6).map((student) => (
                <div 
                  key={student.id}
                  className="flex items-center gap-md p-md rounded-lg"
                  style={{ background: 'var(--color-error-light)' }}
                >
                  <Avatar src={student.avatarUrl} name={student.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{student.name}</div>
                    <div className="text-sm" style={{ color: 'var(--color-error-dark)' }}>
                      출석률 {student.rate}% | 결석 {student.absent}회
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Quick Actions - 개선된 레이아웃 */}
      <Card className="mt-lg">
        <CardHeader>
          <h4>빠른 작업</h4>
        </CardHeader>
        <CardBody>
          <div 
            style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 'var(--spacing-md)',
            }}
          >
            <Link to="/admin/users" style={{ textDecoration: 'none' }}>
              <div 
                className="quick-actions__item"
                style={{ 
                  padding: 'var(--spacing-md)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-tertiary)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-secondary)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div className="quick-actions__icon quick-actions__icon--primary" style={{ marginBottom: 'var(--spacing-sm)' }}>
                  <UsersIcon />
                </div>
                <span className="quick-actions__label" style={{ fontSize: '0.875rem', fontWeight: 500 }}>사용자 관리</span>
                <div className="text-xs text-tertiary" style={{ marginTop: '4px' }}>
                  학생, 선생님 계정 관리
                </div>
              </div>
            </Link>
            <Link to="/admin/classes" style={{ textDecoration: 'none' }}>
              <div 
                className="quick-actions__item"
                style={{ 
                  padding: 'var(--spacing-md)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-tertiary)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-secondary)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div className="quick-actions__icon quick-actions__icon--secondary" style={{ marginBottom: 'var(--spacing-sm)' }}>
                  <GridIcon />
                </div>
                <span className="quick-actions__label" style={{ fontSize: '0.875rem', fontWeight: 500 }}>클래스 관리</span>
                <div className="text-xs text-tertiary" style={{ marginTop: '4px' }}>
                  클래스 생성 및 관리
                </div>
              </div>
            </Link>
            <Link to="/teacher/attendance" style={{ textDecoration: 'none' }}>
              <div 
                className="quick-actions__item"
                style={{ 
                  padding: 'var(--spacing-md)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-tertiary)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-secondary)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div className="quick-actions__icon" style={{ marginBottom: 'var(--spacing-sm)', color: 'var(--color-success)' }}>
                  <ChartIcon />
                </div>
                <span className="quick-actions__label" style={{ fontSize: '0.875rem', fontWeight: 500 }}>출석 관리</span>
                <div className="text-xs text-tertiary" style={{ marginTop: '4px' }}>
                  출석 기록 및 확인
                </div>
              </div>
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

