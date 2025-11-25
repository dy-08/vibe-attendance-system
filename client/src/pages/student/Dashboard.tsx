import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { attendanceAPI, classAPI } from '../../services/api';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import StatCard from '../../components/common/StatCard';
import ProgressRing from '../../components/common/ProgressRing';
import { AttendanceBadge } from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const AlertIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

interface ClassStats {
  class: { id: string; name: string; schedule?: string };
  stats: {
    total: number;
    present: number;
    absent: number;
    late: number;
    rate: number;
    remainingAbsent: number;
    warning: boolean;
  };
}

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  note?: string;
  class: { id: string; name: string };
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [classStats, setClassStats] = useState<ClassStats[]>([]);
  const [recentAttendances, setRecentAttendances] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await attendanceAPI.getMy();
      const data = response.data.data;
      setClassStats(data.classes || []);
      setRecentAttendances(data.attendances?.slice(0, 10) || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate overall stats
  const overallStats = classStats.reduce(
    (acc, cs) => ({
      present: acc.present + cs.stats.present,
      absent: acc.absent + cs.stats.absent,
      late: acc.late + cs.stats.late,
      total: acc.total + cs.stats.total,
    }),
    { present: 0, absent: 0, late: 0, total: 0 }
  );

  const overallRate = overallStats.total > 0 
    ? Math.round((overallStats.present / overallStats.total) * 100) 
    : 100;

  // Find classes with warnings
  const warningClasses = classStats.filter((cs) => cs.stats.warning);

  if (loading) {
    return <div className="loading-screen"><div className="spinner" /></div>;
  }

  return (
    <div className="animate-fade-in">
      {/* Warning Alert */}
      {warningClasses.length > 0 && (
        <div className="warning-alert">
          <div className="warning-alert__icon">
            <AlertIcon />
          </div>
          <div className="warning-alert__content">
            <div className="warning-alert__title">출석률 경고</div>
            <div className="warning-alert__message">
              {warningClasses.map((wc, idx) => (
                <span key={wc.class.id}>
                  {wc.class.name}: 결석 {wc.stats.remainingAbsent}번 남음
                  {idx < warningClasses.length - 1 && ' | '}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="stats-grid">
        <StatCard
          icon={<CalendarIcon />}
          iconVariant="primary"
          label="이번 달 총 수업"
          value={overallStats.total}
        />
        <StatCard
          icon={<CheckIcon />}
          iconVariant="success"
          label="출석"
          value={overallStats.present}
        />
        <StatCard
          icon={<AlertIcon />}
          iconVariant="error"
          label="결석"
          value={overallStats.absent}
        />
      </div>

      <div className="two-column">
        {/* Attendance Rate by Class */}
        <Card>
          <CardHeader>
            <h4>클래스별 출석률</h4>
          </CardHeader>
          <CardBody>
            {classStats.length === 0 ? (
              <EmptyState
                title="등록된 클래스가 없습니다"
                description="클래스에 등록되면 출석률을 확인할 수 있습니다."
              />
            ) : (
              <div className="flex flex-col gap-lg">
                {classStats.map((cs) => (
                  <div key={cs.class.id} className="flex items-center gap-lg">
                    <ProgressRing
                      value={cs.stats.rate}
                      size="sm"
                      color={
                        cs.stats.rate >= 80 ? 'success' :
                        cs.stats.rate >= 60 ? 'warning' : 'error'
                      }
                    />
                    <div className="flex-1">
                      <div className="font-medium text-primary">
                        {cs.class.name}
                      </div>
                      <div className="text-sm text-tertiary">
                        {cs.class.schedule || '일정 미정'}
                      </div>
                      <div className="text-xs text-tertiary mt-xs">
                        출석 {cs.stats.present} | 결석 {cs.stats.absent} | 지각 {cs.stats.late}
                      </div>
                      {cs.stats.warning && (
                        <div className="text-xs text-error mt-xs animate-pulse">
                          ⚠️ 결석 허용 {cs.stats.remainingAbsent}번 남음
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Recent Attendance */}
        <Card>
          <CardHeader>
            <h4>최근 출결 기록</h4>
          </CardHeader>
          <CardBody>
            {recentAttendances.length === 0 ? (
              <EmptyState
                title="출결 기록이 없습니다"
                description="출결 기록이 생기면 여기에 표시됩니다."
              />
            ) : (
              <div className="flex flex-col gap-sm">
                {recentAttendances.map((att) => (
                  <div 
                    key={att.id} 
                    className="flex items-center justify-between p-sm rounded-md"
                    style={{ background: 'var(--bg-secondary)' }}
                  >
                    <div>
                      <div className="text-sm font-medium">{att.class.name}</div>
                      <div className="text-xs text-tertiary">
                        {format(new Date(att.date), 'M월 d일 (EEE)', { locale: ko })}
                      </div>
                    </div>
                    <AttendanceBadge status={att.status} />
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

