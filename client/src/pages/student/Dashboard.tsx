import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { attendanceAPI, classAPI } from '../../services/api';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import StatCard from '../../components/common/StatCard';
import ProgressRing from '../../components/common/ProgressRing';
import { AttendanceBadge } from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import Modal, { ConfirmModal } from '../../components/common/Modal';
import toast from 'react-hot-toast';
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
  class: { 
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
  };
  stats: {
    total: number;
    present: number;
    absent: number;
    late: number;
    lateToAbsent?: number;
    rate: number;
    remainingAbsent: number;
    warning: boolean;
    isWaiting?: boolean;
  };
  cancellationInfo?: {
    dates: string[];
    makeUpDates: string[];
  } | null;
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
  const [withdrawModal, setWithdrawModal] = useState<{ classId: string; className: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await attendanceAPI.getMy();
      const data = response.data.data;
      console.log('Student dashboard data:', data); // 디버깅용
      setClassStats(data.classes || []);
      setRecentAttendances(data.attendances?.slice(0, 10) || []);
    } catch (error: any) {
      console.error('Failed to fetch data:', error);
      toast.error(error.response?.data?.message || '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate overall stats (개강 준비 상태 클래스 제외)
  const activeClassStats = classStats.filter(cs => !cs.stats.isWaiting);
  const overallStats = activeClassStats.reduce(
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

  const handleWithdraw = async () => {
    if (!withdrawModal) return;

    setSubmitting(true);
    try {
      await classAPI.withdraw(withdrawModal.classId);
      toast.success(`${withdrawModal.className} 수강이 철회되었습니다.`);
      setWithdrawModal(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '수강 철회에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

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
              <div className="flex flex-col gap-md">
                {classStats.map((cs) => (
                  <Card key={cs.class.id} style={{ padding: 'var(--spacing-md)' }}>
                    <div className="flex items-start gap-md">
                      <ProgressRing
                        value={cs.stats.isWaiting ? 0 : cs.stats.rate}
                        size="md"
                        color={
                          cs.stats.isWaiting ? 'default' :
                          cs.stats.rate >= 80 ? 'success' :
                          cs.stats.rate >= 60 ? 'warning' : 'error'
                        }
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-sm">
                          <div className="flex items-center gap-sm">
                            <div className="font-medium text-lg">
                              {cs.class.name}
                            </div>
                            {cs.class.status && (
                              <span className={`badge badge--${
                                cs.class.status === 'ACTIVE' ? 'success' : 
                                cs.class.status === 'PREPARING' ? 'warning' : 
                                cs.class.status === 'COMPLETED' ? 'info' : 
                                'default'
                              }`} style={{ fontSize: '11px' }}>
                                {cs.class.status === 'ACTIVE' ? '개강 중' : 
                                 cs.class.status === 'PREPARING' ? '개강 준비 (대기)' : 
                                 cs.class.status === 'COMPLETED' ? '수료' : 
                                 '폐강'}
                              </span>
                            )}
                          </div>
                          {cs.class.status !== 'COMPLETED' && cs.class.status !== 'CANCELLED' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setWithdrawModal({ classId: cs.class.id, className: cs.class.name })}
                              style={{ color: 'var(--color-error)' }}
                            >
                              수강 철회
                            </Button>
                          )}
                        </div>
                        <div className="text-sm text-tertiary mb-sm">
                          {cs.class.schedule || '일정 미정'}
                        </div>
                        {cs.class.currentPeriod && cs.class.status === 'ACTIVE' && cs.class.currentPeriod.daysRemaining !== undefined && (
                          <div className="text-xs font-medium mb-xs" style={{ 
                            color: cs.class.currentPeriod.daysRemaining <= 7 ? 'var(--color-warning)' : 'var(--color-info)',
                          }}>
                            {cs.class.currentPeriod.daysRemaining > 0 
                              ? `수료까지 ${cs.class.currentPeriod.daysRemaining}일 남음`
                              : '이번 기간 종료'}
                          </div>
                        )}
                        {cs.stats.isWaiting ? (
                          <div className="text-sm text-tertiary" style={{ fontStyle: 'italic' }}>
                            개강 준비 중입니다. 출석률은 개강 후 집계됩니다.
                          </div>
                        ) : (
                          <>
                            <div className="text-xs text-tertiary mb-xs">
                              출석 {cs.stats.present} | 결석 {cs.stats.absent} | 지각 {cs.stats.late}
                              {cs.stats.lateToAbsent > 0 && (
                                <span className="text-warning"> (지각 {cs.stats.late}번 = 결석 {cs.stats.lateToAbsent}번 반영)</span>
                              )}
                            </div>
                            {cs.class.periodDays && (
                              <div className="text-xs text-tertiary mb-xs">
                                기간 단위: {cs.class.periodDays}일
                              </div>
                            )}
                            {cs.cancellationInfo && cs.cancellationInfo.dates.length > 0 && (
                              <div className="text-xs mb-xs" style={{ marginTop: 'var(--spacing-xs)' }}>
                                <div className="text-tertiary mb-xs" style={{ fontWeight: 600 }}>휴강/보강 안내</div>
                                <div style={{ 
                                  padding: 'var(--spacing-xs)', 
                                  background: 'rgba(59, 130, 246, 0.1)', 
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '11px',
                                }}>
                                  <div className="mb-xs">
                                    <span style={{ color: 'var(--color-error)', fontWeight: 600 }}>휴강일: </span>
                                    {cs.cancellationInfo.dates.map((date, idx) => (
                                      <span key={date}>
                                        {format(new Date(date), 'M월 d일')}
                                        {idx < cs.cancellationInfo!.dates.length - 1 && ', '}
                                      </span>
                                    ))}
                                  </div>
                                  {cs.cancellationInfo.makeUpDates.length > 0 && (
                                    <div>
                                      <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>보강일: </span>
                                      {cs.cancellationInfo.makeUpDates.map((date, idx) => (
                                        <span key={date}>
                                          {format(new Date(date), 'M월 d일')}
                                          {idx < cs.cancellationInfo!.makeUpDates.length - 1 && ', '}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            <div className="text-sm font-medium mt-xs">
                              출석률: {cs.stats.rate}%
                            </div>
                            {cs.stats.warning && (
                              <div className="text-xs text-error mt-xs animate-pulse">
                                ⚠️ 결석 허용 {cs.stats.remainingAbsent}번 남음
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
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

      {/* 수강 철회 확인 모달 */}
      {withdrawModal && (
        <ConfirmModal
          isOpen={!!withdrawModal}
          onClose={() => setWithdrawModal(null)}
          onConfirm={handleWithdraw}
          title="수강 철회"
          message={`${withdrawModal.className} 수강을 철회하시겠습니까?\n\n수강 철회 후에는 출석 기록을 확인할 수 없습니다.`}
          confirmText="철회하기"
          cancelText="취소"
          variant="danger"
          loading={submitting}
        />
      )}
    </div>
  );
}

