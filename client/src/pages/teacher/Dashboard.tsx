import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { classAPI, statsAPI, attendanceAPI } from '../../services/api';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import StatCard from '../../components/common/StatCard';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import { AttendanceBadge } from '../../components/common/Badge';
import ProgressRing from '../../components/common/ProgressRing';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

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
  status?: string;
  periodDays?: number;
  currentPeriod?: {
    periodNumber: number;
    startDate: string;
    endDate: string;
    periodLabel: string;
    daysRemaining?: number;
  };
  teacher: { id: string; name: string };
  _count: { members: number; seats: number };
}

interface ChartData {
  month: string;
  label: string;
  rate: number;
}

interface StudentChartData {
  name: string;
  rate: number;
  present: number;
  absent: number;
  late: number;
  total: number;
}

interface WarningStudent {
  student: { id: string; name: string; avatarUrl?: string };
  stats: { rate: number; absent: number; warning: boolean };
}

interface ClassDetailStats {
  id: string;
  name: string;
  studentCount: number;
  attendanceRate: number;
  absentCount?: number; // 결석 횟수
  cancellationInfo?: {
    dates: string[];
    makeUpDates: string[];
  } | null;
  todayAttendance?: {
    present: number;
    absent: number;
    late: number;
    total: number;
  } | null;
}

interface RecentAttendance {
  id: string;
  date: string;
  status: string;
  student: { id: string; name: string; avatarUrl?: string };
  class: { id: string; name: string };
}

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedClassName, setSelectedClassName] = useState<string>('');
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [studentChartData, setStudentChartData] = useState<StudentChartData[]>([]);
  const [warningStudents, setWarningStudents] = useState<WarningStudent[]>([]);
  const [classDetailStats, setClassDetailStats] = useState<ClassDetailStats[]>([]);
  const [recentAttendances, setRecentAttendances] = useState<RecentAttendance[]>([]);
  const [todayStats, setTodayStats] = useState<{ total: number; present: number; absent: number; late: number }>({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
  });

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

      // 학생이 있는 첫 번째 클래스를 찾아서 통계 조회
      const classWithStudents = classData.find((c: ClassData) => c._count.members > 0) || classData[0];
      
      if (classWithStudents) {
        setSelectedClassId(classWithStudents.id);
        setSelectedClassName(classWithStudents.name);
        await fetchClassStats(classWithStudents.id, classWithStudents.name);
      } else {
        setChartData([]);
        setWarningStudents([]);
      }

      // 클래스별 상세 통계 및 오늘의 출석 현황
      await fetchClassDetailStats(classData);
      
      // 최근 출석 기록
      await fetchRecentAttendances();
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchClassDetailStats = async (classData: ClassData[]) => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const statsPromises = classData.map(async (cls) => {
        try {
          const statsRes = await statsAPI.getClassStats(cls.id, 1);
          const currentPeriod = statsRes.data?.data?.periods?.[0];
          const attendanceRate = currentPeriod?.rate || 0;

          // 오늘의 출석 현황
          let todayAttendance = null;
          try {
            const todayRes = await attendanceAPI.getClassAttendance(cls.id, today);
            const todayData = todayRes.data?.data;
            if (todayData) {
              const students = todayData.students || [];
              const present = students.filter((s: any) => s.attendance?.status === 'PRESENT').length;
              const absent = students.filter((s: any) => s.attendance?.status === 'ABSENT').length;
              const late = students.filter((s: any) => s.attendance?.status === 'LATE').length;
              todayAttendance = {
                present,
                absent,
                late,
                total: students.length,
              };
            }
          } catch (e) {
            // 오늘 출석 데이터가 없을 수 있음
          }

          return {
            id: cls.id,
            name: cls.name,
            studentCount: cls._count.members,
            attendanceRate,
            todayAttendance,
          };
        } catch (e) {
          return {
            id: cls.id,
            name: cls.name,
            studentCount: cls._count.members,
            attendanceRate: 0,
            todayAttendance: null,
          };
        }
      });

      const stats = await Promise.all(statsPromises);
      setClassDetailStats(stats);

      // 오늘 전체 통계 계산
      const todayTotal = stats.reduce((acc, s) => acc + (s.todayAttendance?.total || 0), 0);
      const todayPresent = stats.reduce((acc, s) => acc + (s.todayAttendance?.present || 0), 0);
      const todayAbsent = stats.reduce((acc, s) => acc + (s.todayAttendance?.absent || 0), 0);
      const todayLate = stats.reduce((acc, s) => acc + (s.todayAttendance?.late || 0), 0);
      setTodayStats({ total: todayTotal, present: todayPresent, absent: todayAbsent, late: todayLate });
    } catch (error) {
      console.error('Failed to fetch class detail stats:', error);
    }
  };

  const fetchRecentAttendances = async () => {
    try {
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const response = await attendanceAPI.getAll({
        startDate: format(weekAgo, 'yyyy-MM-dd'),
        endDate: format(today, 'yyyy-MM-dd'),
      });
      
      const attendances = response.data?.data || [];
      // 최근 10개만
      setRecentAttendances(attendances.slice(0, 10));
    } catch (error) {
      console.error('Failed to fetch recent attendances:', error);
    }
  };

  const fetchClassStats = async (classId: string, className: string) => {
    try {
      console.log('📊 Fetching stats for class:', classId, className);
      const statsRes = await statsAPI.getClassStats(classId, 6);
          console.log('📊 Stats API Response:', JSON.stringify(statsRes.data, null, 2));
          
          // API 응답 구조: periods 배열로 변경됨
          const periods = statsRes.data?.data?.periods || [];
          console.log('📈 Periods data:', periods);
          console.log('📈 Periods count:', periods.length);
          
          // periods 데이터를 chartData 형식으로 변환
          const chartDataFromPeriods = periods.map((p: any) => {
            const chartItem = {
              month: p.startDate,
              label: p.periodLabel || `${p.period}기간`,
              rate: Number(p.rate) || 0,
            };
            console.log('📊 Chart item:', chartItem);
            return chartItem;
          });
          
      console.log('📊 Chart data (final):', chartDataFromPeriods);
      console.log('📊 Chart data length:', chartDataFromPeriods.length);
      setChartData(chartDataFromPeriods);
      
      const students = statsRes.data?.data?.students || [];
      const warnings = students.filter((s: WarningStudent) => s.stats?.warning);
      console.log('⚠️ Warning students:', warnings.length);
      setWarningStudents(warnings);

      // 학생별 출석률 차트 데이터 생성
      const studentChartDataFromStudents = students.map((s: any) => ({
        name: s.student.name,
        rate: s.stats.rate,
        present: s.stats.present,
        absent: s.stats.absent,
        late: s.stats.late,
        total: s.stats.total,
      }));
      setStudentChartData(studentChartDataFromStudents);
    } catch (statsError: any) {
      console.error('❌ Failed to fetch stats:', statsError);
      console.error('Error response:', statsError.response?.data);
      console.error('Error stack:', statsError.stack);
      // 통계 데이터 로드 실패해도 계속 진행
      setChartData([]);
      setStudentChartData([]);
      setWarningStudents([]);
    }
  };

  const handleClassChange = async (classId: string) => {
    const selectedClass = classes.find(c => c.id === classId);
    if (selectedClass) {
      setSelectedClassId(classId);
      setSelectedClassName(selectedClass.name);
      await fetchClassStats(classId, selectedClass.name);
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
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {/* 통계 카드 */}
      <div className="stats-grid">
        <StatCard
          icon={<GridIcon />}
          iconVariant="primary"
          label="담당 클래스"
          value={classes.length}
          onClick={() => navigate('/teacher/my-classes')}
        />
        <StatCard
          icon={<UsersIcon />}
          iconVariant="secondary"
          label="총 학생 수"
          value={totalStudents}
          onClick={() => navigate('/teacher/students')}
        />
        <StatCard
          icon={<ChartIcon />}
          iconVariant="success"
          label="평균 출석률"
          value={`${avgRate}%`}
          onClick={() => {
            if (selectedClassId) {
              navigate(`/teacher/classes/${selectedClassId}`);
            }
          }}
        />
        <StatCard
          icon={<AlertIcon />}
          iconVariant="warning"
          label="경고 학생"
          value={warningStudents.length}
          onClick={() => {
            if (selectedClassId) {
              navigate(`/teacher/classes/${selectedClassId}`);
            }
          }}
        />
      </div>

      {/* 오늘의 출석 현황 - 가장 중요 */}
      {todayStats.total > 0 && (
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div>
                <h4 style={{ margin: 0 }}>오늘의 출석 현황</h4>
                <p className="text-sm text-tertiary" style={{ margin: '4px 0 0 0' }}>
                  {format(new Date(), 'yyyy년 M월 d일')}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
              gap: 'var(--spacing-md)' 
            }}>
              <div style={{ 
                textAlign: 'center', 
                padding: 'var(--spacing-lg)', 
                background: 'var(--bg-secondary)', 
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
              }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 'var(--spacing-xs)' }}>
                  {todayStats.total}
                </div>
                <div className="text-sm text-tertiary">전체 학생</div>
              </div>
              <div style={{ 
                textAlign: 'center', 
                padding: 'var(--spacing-lg)', 
                background: 'var(--bg-secondary)', 
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
              }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-success)', marginBottom: 'var(--spacing-xs)' }}>
                  {todayStats.present}
                </div>
                <div className="text-sm text-tertiary">출석</div>
              </div>
              <div style={{ 
                textAlign: 'center', 
                padding: 'var(--spacing-lg)', 
                background: 'var(--bg-secondary)', 
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
              }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-warning)', marginBottom: 'var(--spacing-xs)' }}>
                  {todayStats.late}
                </div>
                <div className="text-sm text-tertiary">지각</div>
              </div>
              <div style={{ 
                textAlign: 'center', 
                padding: 'var(--spacing-lg)', 
                background: 'var(--bg-secondary)', 
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
              }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-error)', marginBottom: 'var(--spacing-xs)' }}>
                  {todayStats.absent}
                </div>
                <div className="text-sm text-tertiary">결석</div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* 경고 학생 - 주의가 필요한 학생 */}
      {warningStudents.length > 0 && (
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div>
                <h4 style={{ margin: 0 }}>출석률 주의 학생</h4>
                <p className="text-sm text-tertiary" style={{ margin: '4px 0 0 0' }}>
                  {selectedClassName} · {warningStudents.length}명
                </p>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
              gap: 'var(--spacing-md)',
            }}>
              {warningStudents.map((ws) => (
                <div 
                  key={ws.student.id}
                  className="flex items-center gap-md p-md rounded-lg"
                  style={{ 
                    background: 'rgba(251, 191, 36, 0.1)', 
                    border: '1px solid rgba(251, 191, 36, 0.2)',
                  }}
                >
                  <Avatar src={ws.student.avatarUrl} name={ws.student.name} size="md" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="text-sm font-medium" style={{ marginBottom: '4px' }}>{ws.student.name}</div>
                    <div className="text-xs" style={{ color: 'var(--color-warning-dark)' }}>
                      출석률 {ws.stats.rate}% · 결석 {ws.stats.absent}회
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* 클래스별 상세 통계 */}
      {classDetailStats.length > 0 && (
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div>
                <h4 style={{ margin: 0 }}>클래스별 상세 통계</h4>
                <p className="text-sm text-tertiary" style={{ margin: '4px 0 0 0' }}>
                  각 클래스의 출석률 및 학생 현황
                </p>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', 
              gap: 'var(--spacing-md)' 
            }}>
              {classDetailStats.map((stat) => (
                <Link 
                  key={stat.id}
                  to={`/teacher/classes/${stat.id}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div
                    style={{
                      padding: 'var(--spacing-md)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-tertiary)';
                      e.currentTarget.style.borderColor = 'var(--color-primary)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-secondary)';
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start', 
                      marginBottom: 'var(--spacing-sm)' 
                    }}>
                      <h5 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{stat.name}</h5>
                      <ProgressRing
                        value={stat.attendanceRate}
                        size="sm"
                        color={
                          stat.attendanceRate >= 80 ? 'success' :
                          stat.attendanceRate >= 60 ? 'warning' : 'error'
                        }
                      />
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: stat.todayAttendance ? 'var(--spacing-sm)' : 0,
                    }}>
                      <div className="text-xs text-tertiary">학생 {stat.studentCount}명</div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                        <div className="text-xs font-medium" style={{ 
                          color: stat.attendanceRate >= 80 ? 'var(--color-success)' :
                                 stat.attendanceRate >= 60 ? 'var(--color-warning)' : 'var(--color-error)'
                        }}>
                          출석률 {stat.attendanceRate}%
                        </div>
                        {stat.absentCount !== undefined && stat.absentCount > 0 && (
                          <div className="text-xs text-tertiary">
                            결석 {stat.absentCount}회
                          </div>
                        )}
                      </div>
                    </div>
                    {stat.cancellationInfo && stat.cancellationInfo.dates.length > 0 && (
                      <div style={{ 
                        marginTop: 'var(--spacing-sm)',
                        padding: 'var(--spacing-sm)',
                        background: 'rgba(59, 130, 246, 0.1)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                      }}>
                        <div className="text-xs font-medium" style={{ color: 'var(--color-info)', marginBottom: '4px' }}>
                          휴강 정보
                        </div>
                        <div className="text-xs text-tertiary" style={{ marginBottom: '2px' }}>
                          휴강일: {stat.cancellationInfo.dates.map((d: string) => format(new Date(d), 'M월 d일')).join(', ')}
                        </div>
                        {stat.cancellationInfo.makeUpDates && stat.cancellationInfo.makeUpDates.length > 0 && (
                          <div className="text-xs text-tertiary">
                            보강일: {stat.cancellationInfo.makeUpDates.map((d: string) => format(new Date(d), 'M월 d일')).join(', ')}
                          </div>
                        )}
                      </div>
                    )}
                    {stat.todayAttendance && (
                      <div style={{ 
                        marginTop: 'var(--spacing-sm)', 
                        padding: 'var(--spacing-sm)', 
                        background: 'var(--bg-primary)', 
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                      }}>
                        <div className="text-xs text-tertiary" style={{ marginBottom: 'var(--spacing-xs)' }}>
                          오늘 출석 현황
                        </div>
                        <div style={{ 
                          display: 'flex', 
                          gap: 'var(--spacing-md)', 
                          fontSize: '12px',
                          justifyContent: 'space-around',
                        }}>
                          <span style={{ color: 'var(--color-success)', fontWeight: 500 }}>
                            출석 {stat.todayAttendance.present}
                          </span>
                          <span style={{ color: 'var(--color-warning)', fontWeight: 500 }}>
                            지각 {stat.todayAttendance.late}
                          </span>
                          <span style={{ color: 'var(--color-error)', fontWeight: 500 }}>
                            결석 {stat.todayAttendance.absent}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* 학생별 출석률 차트 */}
      {studentChartData.length > 0 && (
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '16px',
                  flexShrink: 0,
                }}>
                  {selectedClassName ? selectedClassName.charAt(0) : 'C'}
                </div>
                <div>
                  <h4 style={{ margin: 0 }}>{selectedClassName || '학생별 출석률'}</h4>
                  <p className="text-sm text-tertiary" style={{ margin: '4px 0 0 0' }}>
                    클래스별 학생 출석률 상세 통계
                  </p>
                </div>
              </div>
              {classes.length > 0 && (
                <select
                  value={selectedClassId}
                  onChange={(e) => handleClassChange(e.target.value)}
                  style={{
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    outline: 'none',
                    minWidth: '200px',
                  }}
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </CardHeader>
          <CardBody>
            <div>
              {/* 통계 요약 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 'var(--spacing-md)',
                paddingBottom: 'var(--spacing-lg)',
                marginBottom: 'var(--spacing-lg)',
                borderBottom: '1px solid var(--border-color)',
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 'var(--spacing-xs)' }}>
                    {studentChartData.length}
                  </div>
                  <div className="text-sm text-tertiary">학생 수</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-success)', marginBottom: 'var(--spacing-xs)' }}>
                    {Math.round(studentChartData.reduce((acc, d) => acc + d.rate, 0) / studentChartData.length)}%
                  </div>
                  <div className="text-sm text-tertiary">평균 출석률</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-info)', marginBottom: 'var(--spacing-xs)' }}>
                    {Math.max(...studentChartData.map(d => d.rate))}%
                  </div>
                  <div className="text-sm text-tertiary">최고 출석률</div>
                </div>
              </div>

              {/* 학생별 출석률 차트 */}
              <div style={{ height: '400px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={studentChartData} 
                    margin={{ top: 20, right: 20, left: 20, bottom: 60 }}
                    layout="vertical"
                  >
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      stroke="var(--border-color)" 
                      opacity={0.3}
                      horizontal={false}
                    />
                    <XAxis 
                      type="number"
                      domain={[0, 100]}
                      tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}
                      axisLine={{ stroke: 'var(--border-color)' }}
                      tickLine={{ stroke: 'var(--border-color)' }}
                      label={{ value: '출석률 (%)', position: 'insideBottom', offset: -10, fill: 'var(--text-secondary)', fontSize: 13, fontWeight: 500 }}
                      tickFormatter={(value: number) => `${value}%`}
                    />
                    <YAxis 
                      type="category"
                      dataKey="name"
                      tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}
                      axisLine={{ stroke: 'var(--border-color)' }}
                      tickLine={false}
                      width={100}
                      label={{ value: '학생 이름', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 13, fontWeight: 500 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'var(--bg-primary)', 
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--spacing-sm)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === 'rate') return [`${value}%`, '출석률'];
                        return [value, name];
                      }}
                      labelFormatter={(label) => `학생: ${label}`}
                      cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    />
                    <Bar 
                      dataKey="rate" 
                      fill="url(#studentGradient)"
                      radius={[0, 6, 6, 0]}
                      minPointSize={4}
                    >
                      {studentChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={
                            entry.rate >= 80 ? '#10b981' :
                            entry.rate >= 60 ? '#f59e0b' : '#ef4444'
                          }
                        />
                      ))}
                    </Bar>
                    <defs>
                      <linearGradient id="studentGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#667eea" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#764ba2" stopOpacity={0.8}/>
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* 최근 출석 기록 */}
      {recentAttendances.length > 0 && (
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div>
                <h4 style={{ margin: 0 }}>최근 출석 기록</h4>
                <p className="text-sm text-tertiary" style={{ margin: '4px 0 0 0' }}>
                  최근 7일간의 출석 기록
                </p>
              </div>
              <Link to="/teacher/attendance">
                <Button variant="ghost" size="sm">전체보기</Button>
              </Link>
            </div>
          </CardHeader>
          <CardBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              {recentAttendances.map((att) => (
                <div 
                  key={att.id}
                  className="flex items-center justify-between p-md rounded-lg"
                  style={{ 
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div className="flex items-center gap-md" style={{ flex: 1, minWidth: 0 }}>
                    <Avatar src={att.student.avatarUrl} name={att.student.name} size="md" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="text-sm font-medium truncate" style={{ marginBottom: '2px' }}>
                        {att.student.name}
                      </div>
                      <div className="text-xs text-tertiary">
                        {att.class.name} · {format(new Date(att.date), 'yyyy년 M월 d일')}
                      </div>
                    </div>
                  </div>
                  <AttendanceBadge status={att.status} />
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

    </div>
  );
}

