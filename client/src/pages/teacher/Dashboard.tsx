import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { classAPI, statsAPI } from '../../services/api';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import StatCard from '../../components/common/StatCard';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
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

const AlertIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);

interface ClassData {
  id: string;
  name: string;
  schedule?: string;
  teacher: { id: string; name: string };
  _count: { members: number; seats: number };
}

interface ChartData {
  month: string;
  label: string;
  rate: number;
}

interface WarningStudent {
  student: { id: string; name: string; avatarUrl?: string };
  stats: { rate: number; absent: number; warning: boolean };
}

export default function TeacherDashboard() {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [warningStudents, setWarningStudents] = useState<WarningStudent[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [classRes] = await Promise.all([
        classAPI.getAll(),
      ]);
      
      const classData = classRes.data.data;
      setClasses(classData);

      // Fetch stats for first class if exists
      if (classData.length > 0) {
        const statsRes = await statsAPI.getClassStats(classData[0].id, 6);
        setChartData(statsRes.data.data.monthly || []);
        setWarningStudents(
          (statsRes.data.data.students || []).filter((s: WarningStudent) => s.stats.warning)
        );
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalStudents = classes.reduce((acc, c) => acc + c._count.members, 0);
  const avgRate = chartData.length > 0 
    ? Math.round(chartData.reduce((acc, d) => acc + d.rate, 0) / chartData.length) 
    : 0;

  if (loading) {
    return <div className="loading-screen"><div className="spinner" /></div>;
  }

  return (
    <div className="animate-fade-in">
      {/* Stats */}
      <div className="stats-grid">
        <StatCard
          icon={<GridIcon />}
          iconVariant="primary"
          label="담당 클래스"
          value={classes.length}
        />
        <StatCard
          icon={<UsersIcon />}
          iconVariant="secondary"
          label="총 학생 수"
          value={totalStudents}
        />
        <StatCard
          icon={<ChartIcon />}
          iconVariant="success"
          label="평균 출석률"
          value={`${avgRate}%`}
        />
        <StatCard
          icon={<AlertIcon />}
          iconVariant="warning"
          label="경고 학생"
          value={warningStudents.length}
        />
      </div>

      <div className="two-column">
        {/* Classes */}
        <Card>
          <CardHeader>
            <h4>내 클래스</h4>
            <Link to="/teacher/classes">
              <Button variant="ghost" size="sm">전체보기</Button>
            </Link>
          </CardHeader>
          <CardBody>
            {classes.length === 0 ? (
              <EmptyState
                title="클래스가 없습니다"
                description="새 클래스를 만들어 시작하세요."
                action={{ label: '클래스 만들기', onClick: () => {} }}
              />
            ) : (
              <div className="flex flex-col gap-md">
                {classes.slice(0, 4).map((cls) => (
                  <Link key={cls.id} to={`/teacher/classes/${cls.id}`}>
                    <div 
                      className="flex items-center justify-between p-md rounded-lg"
                      style={{ 
                        background: 'var(--bg-secondary)',
                        transition: 'background var(--transition-fast)',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                    >
                      <div>
                        <div className="font-medium">{cls.name}</div>
                        <div className="text-sm text-tertiary">{cls.schedule || '일정 미정'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold">{cls._count.members}</div>
                        <div className="text-xs text-tertiary">학생</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Chart */}
        <Card>
          <CardHeader>
            <h4>출석률 추이</h4>
          </CardHeader>
          <CardBody>
            {chartData.length === 0 ? (
              <EmptyState
                title="데이터가 없습니다"
                description="출결 데이터가 쌓이면 차트가 표시됩니다."
              />
            ) : (
              <div style={{ height: '250px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}
                      axisLine={{ stroke: 'var(--border-color)' }}
                    />
                    <YAxis 
                      domain={[0, 100]}
                      tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}
                      axisLine={{ stroke: 'var(--border-color)' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'var(--bg-primary)', 
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                      }}
                      formatter={(value: number) => [`${value}%`, '출석률']}
                    />
                    <Bar 
                      dataKey="rate" 
                      fill="var(--color-primary-400)" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Warning Students */}
      {warningStudents.length > 0 && (
        <Card className="mt-lg">
          <CardHeader>
            <h4>⚠️ 출석률 주의 학생</h4>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-md">
              {warningStudents.map((ws) => (
                <div 
                  key={ws.student.id}
                  className="flex items-center gap-sm p-sm rounded-md"
                  style={{ background: 'var(--color-warning-light)' }}
                >
                  <Avatar src={ws.student.avatarUrl} name={ws.student.name} size="sm" />
                  <div>
                    <div className="text-sm font-medium">{ws.student.name}</div>
                    <div className="text-xs" style={{ color: 'var(--color-warning-dark)' }}>
                      출석률 {ws.stats.rate}% | 결석 {ws.stats.absent}회
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

