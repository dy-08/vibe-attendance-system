import { useState, useEffect } from 'react';
import { attendanceAPI } from '../../services/api';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Select } from '../../components/common/Input';
import { AttendanceBadge } from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';

const ChevronLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);

const ChevronRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  note?: string;
  class: { id: string; name: string };
}

interface ClassInfo {
  class: { id: string; name: string };
  stats: {
    total: number;
    present: number;
    absent: number;
    late: number;
    rate: number;
  };
  cancellationInfo?: {
    dates: string[];
    makeUpDates: string[];
  } | null;
}

export default function StudentAttendance() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await attendanceAPI.getMy({
        year: currentDate.getFullYear(),
        month: currentDate.getMonth() + 1,
      });
      const data = response.data.data;
      setAttendances(data.attendances || []);
      setClasses(data.classes || []);
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  // 모든 클래스의 휴강/보강 날짜 수집
  const allCancellationDates = new Set<string>();
  const allMakeUpDates = new Set<string>();
  classes.forEach((c) => {
    if (c.cancellationInfo) {
      c.cancellationInfo.dates.forEach((date) => allCancellationDates.add(date));
      c.cancellationInfo.makeUpDates.forEach((date) => allMakeUpDates.add(date));
    }
  });

  // Generate calendar days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - getDay(monthStart));
  const endDate = new Date(monthEnd);
  endDate.setDate(endDate.getDate() + (6 - getDay(monthEnd)));
  
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  // Filter attendances by selected class
  const filteredAttendances = selectedClass === 'all' 
    ? attendances 
    : attendances.filter((a) => a.class.id === selectedClass);

  // Get attendance status for a specific day
  const getAttendanceForDay = (day: Date) => {
    return filteredAttendances.find(
      (a) => format(new Date(a.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
    );
  };

  // Check if a day is a cancellation or make-up date
  const getDayType = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    if (allCancellationDates.has(dayStr)) return 'cancellation';
    if (allMakeUpDates.has(dayStr)) return 'makeup';
    return null;
  };

  // Get status color class
  const getStatusClass = (status?: string) => {
    const statusMap: Record<string, string> = {
      PRESENT: 'present',
      ABSENT: 'absent',
      LATE: 'late',
      SICK_LEAVE: 'other',
      VACATION: 'other',
    };
    return status ? statusMap[status] || '' : '';
  };

  // Get status label
  const getStatusLabel = (status?: string) => {
    const statusMap: Record<string, string> = {
      PRESENT: '출석',
      ABSENT: '결석',
      LATE: '지각',
      EARLY_LEAVE: '조퇴',
      SICK_LEAVE: '병가',
      VACATION: '휴가',
    };
    return status ? statusMap[status] || status : '';
  };

  // Handle day click
  const handleDayClick = (day: Date) => {
    const attendance = getAttendanceForDay(day);
    const dayType = getDayType(day);
    if (attendance || dayType) {
      setSelectedDay(day);
      setDetailModalOpen(true);
    }
  };

  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  // Calculate selected class stats
  const selectedStats = selectedClass === 'all'
    ? classes.reduce(
        (acc, c) => ({
          present: acc.present + c.stats.present,
          absent: acc.absent + c.stats.absent,
          late: acc.late + c.stats.late,
          total: acc.total + c.stats.total,
        }),
        { present: 0, absent: 0, late: 0, total: 0 }
      )
    : classes.find((c) => c.class.id === selectedClass)?.stats || { present: 0, absent: 0, late: 0, total: 0 };

  const attendanceRate = selectedStats.total > 0
    ? Math.round(((selectedStats.present + selectedStats.late) / selectedStats.total) * 100)
    : 100;

  if (loading) {
    return <div className="loading-screen"><div className="spinner" /></div>;
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header__top">
          <div>
            <h2 className="page-header__title">출결 현황</h2>
            <p className="page-header__subtitle">
              {format(currentDate, 'yyyy년 M월', { locale: ko })} 출결 기록
            </p>
          </div>
          <div style={{ width: '200px' }}>
            <Select
              options={[
                { value: 'all', label: '전체 클래스' },
                ...classes.map((c) => ({ value: c.class.id, label: c.class.name })),
              ]}
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="two-column">
        {/* Calendar */}
        <Card>
          <div className="calendar__header" style={{ padding: 'var(--spacing-lg)' }}>
            <button className="btn btn--ghost btn--icon" onClick={goToPrevMonth}>
              <ChevronLeftIcon />
            </button>
            <h3 className="calendar__title">
              {format(currentDate, 'yyyy년 M월', { locale: ko })}
            </h3>
            <button className="btn btn--ghost btn--icon" onClick={goToNextMonth}>
              <ChevronRightIcon />
            </button>
          </div>
          <div className="calendar__grid">
            {dayNames.map((day) => (
              <div key={day} className="calendar__day-header">{day}</div>
            ))}
            {calendarDays.map((day) => {
              const attendance = getAttendanceForDay(day);
              const dayType = getDayType(day);
              const statusClass = getStatusClass(attendance?.status);
              const statusText = attendance ? 
                (attendance.status === 'PRESENT' ? '출석' :
                 attendance.status === 'ABSENT' ? '결석' :
                 attendance.status === 'LATE' ? '지각' :
                 attendance.status === 'EARLY_LEAVE' ? '조퇴' :
                 attendance.status === 'SICK_LEAVE' ? '병가' :
                 attendance.status === 'VACATION' ? '휴가' : '') : '';
              
              return (
                <div
                  key={day.toISOString()}
                  className={`calendar__day ${
                    !isSameMonth(day, currentDate) ? 'calendar__day--other-month' : ''
                  } ${isToday(day) ? 'calendar__day--today' : ''} ${attendance ? 'calendar__day--has-attendance' : ''}`}
                  onClick={() => (attendance || dayType) && handleDayClick(day)}
                  style={{ 
                    cursor: (attendance || dayType) ? 'pointer' : 'default', 
                    position: 'relative',
                    background: dayType === 'cancellation' ? 'rgba(239, 68, 68, 0.1)' :
                                dayType === 'makeup' ? 'rgba(34, 197, 94, 0.1)' : undefined,
                  }}
                  title={attendance ? `${format(day, 'M월 d일')}: ${statusText}` : 
                         dayType === 'cancellation' ? `${format(day, 'M월 d일')}: 휴강` :
                         dayType === 'makeup' ? `${format(day, 'M월 d일')}: 보강` : ''}
                >
                  <span className="calendar__day-number">
                    {format(day, 'd')}
                  </span>
                  {attendance && (
                    <>
                      <span className={`calendar__day-status calendar__day-status--${statusClass}`} />
                      <span 
                        className="text-xs" 
                        style={{ 
                          position: 'absolute',
                          bottom: '2px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          fontSize: '9px',
                          fontWeight: 600,
                          color: statusClass === 'present' ? 'var(--color-success)' :
                                 statusClass === 'absent' ? 'var(--color-error)' :
                                 statusClass === 'late' ? 'var(--color-warning)' : 'var(--text-tertiary)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {statusText}
                      </span>
                    </>
                  )}
                  {!attendance && dayType && (
                    <span 
                      className="text-xs" 
                      style={{ 
                        position: 'absolute',
                        bottom: '2px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: '9px',
                        fontWeight: 600,
                        color: dayType === 'cancellation' ? 'var(--color-error)' : 'var(--color-success)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {dayType === 'cancellation' ? '휴강' : '보강'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Legend */}
          <div className="seat-legend" style={{ margin: 'var(--spacing-md)', marginTop: 0 }}>
            <div className="seat-legend__item">
              <div className="seat-legend__color seat-legend__color--present" />
              <span>출석</span>
            </div>
            <div className="seat-legend__item">
              <div className="seat-legend__color seat-legend__color--absent" />
              <span>결석</span>
            </div>
            <div className="seat-legend__item">
              <div className="seat-legend__color seat-legend__color--late" />
              <span>지각</span>
            </div>
            <div className="seat-legend__item">
              <div className="seat-legend__color seat-legend__color--sick-leave" />
              <span>병가/휴가</span>
            </div>
            <div className="seat-legend__item">
              <div style={{ 
                width: '12px', 
                height: '12px', 
                borderRadius: '2px', 
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid var(--color-error)',
              }} />
              <span>휴강</span>
            </div>
            <div className="seat-legend__item">
              <div style={{ 
                width: '12px', 
                height: '12px', 
                borderRadius: '2px', 
                background: 'rgba(34, 197, 94, 0.2)',
                border: '1px solid var(--color-success)',
              }} />
              <span>보강</span>
            </div>
          </div>
        </Card>

        {/* Stats & List */}
        <div className="flex flex-col gap-lg">
          {/* Stats Card */}
          <Card>
            <CardHeader>
              <h4>이번 달 요약</h4>
            </CardHeader>
            <CardBody>
              <div className="flex items-center justify-around" style={{ padding: 'var(--spacing-md) 0' }}>
                {/* 출석률 */}
                <div className="flex flex-col items-center" style={{ flex: 1 }}>
                  <div className="text-4xl font-bold text-primary mb-sm">{attendanceRate}%</div>
                  <div className="text-sm text-tertiary font-medium">출석률</div>
                </div>
                
                {/* 구분선 */}
                <div style={{ 
                  width: '1px', 
                  height: '60px', 
                  background: 'var(--border-color)',
                  margin: '0 var(--spacing-lg)'
                }} />
                
                {/* 출석 */}
                <div className="flex flex-col items-center" style={{ flex: 1 }}>
                  <div className="text-3xl font-bold mb-sm" style={{ color: 'var(--color-success)' }}>
                    {selectedStats.present}
                  </div>
                  <div className="text-sm text-tertiary font-medium">출석</div>
                </div>
                
                {/* 구분선 */}
                <div style={{ 
                  width: '1px', 
                  height: '60px', 
                  background: 'var(--border-color)',
                  margin: '0 var(--spacing-lg)'
                }} />
                
                {/* 결석 */}
                <div className="flex flex-col items-center" style={{ flex: 1 }}>
                  <div className="text-3xl font-bold mb-sm" style={{ color: 'var(--color-error)' }}>
                    {selectedStats.absent}
                  </div>
                  <div className="text-sm text-tertiary font-medium">결석</div>
                </div>
                
                {/* 구분선 */}
                <div style={{ 
                  width: '1px', 
                  height: '60px', 
                  background: 'var(--border-color)',
                  margin: '0 var(--spacing-lg)'
                }} />
                
                {/* 지각 */}
                <div className="flex flex-col items-center" style={{ flex: 1 }}>
                  <div className="text-3xl font-bold mb-sm" style={{ color: 'var(--color-warning)' }}>
                    {selectedStats.late}
                  </div>
                  <div className="text-sm text-tertiary font-medium">지각</div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Attendance List */}
          <Card className="flex-1">
            <CardHeader>
              <h4>출결 기록</h4>
            </CardHeader>
            <CardBody style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {filteredAttendances.length === 0 ? (
                <EmptyState
                  title="출결 기록이 없습니다"
                  description="이번 달 출결 기록이 없습니다."
                />
              ) : (
                <div className="flex flex-col gap-sm">
                  {filteredAttendances.map((att) => (
                    <div 
                      key={att.id}
                      className="flex items-center justify-between p-sm rounded-md"
                      style={{ background: 'var(--bg-secondary)' }}
                    >
                      <div>
                        <div className="text-sm font-medium">
                          {format(new Date(att.date), 'M월 d일 (EEE)', { locale: ko })}
                        </div>
                        <div className="text-xs text-tertiary">{att.class.name}</div>
                        {att.note && (
                          <div className="text-xs text-tertiary mt-xs">📝 {att.note}</div>
                        )}
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

      {/* Attendance Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedDay(null);
        }}
        title={selectedDay ? format(selectedDay, 'yyyy년 M월 d일 (EEE)', { locale: ko }) : ''}
      >
        {selectedDay && (() => {
          const attendance = getAttendanceForDay(selectedDay);
          const dayType = getDayType(selectedDay);
          
          if (attendance) {
            return (
              <div className="flex flex-col gap-md">
                <div className="flex items-center justify-between p-md rounded-md" style={{ background: 'var(--bg-secondary)' }}>
                  <div>
                    <div className="text-sm text-tertiary mb-xs">클래스</div>
                    <div className="text-lg font-semibold">{attendance.class.name}</div>
                  </div>
                  <AttendanceBadge status={attendance.status} />
                </div>
                
                {attendance.note && (
                  <div className="p-md rounded-md" style={{ background: 'var(--bg-secondary)' }}>
                    <div className="text-sm text-tertiary mb-xs">메모</div>
                    <div className="text-sm">{attendance.note}</div>
                  </div>
                )}
                
                <div className="p-md rounded-md" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="text-sm text-tertiary mb-xs">출결 상태</div>
                  <div className="text-sm font-medium">{getStatusLabel(attendance.status)}</div>
                </div>
              </div>
            );
          }
          
          if (dayType) {
            const classWithCancellation = classes.find(c => {
              if (!c.cancellationInfo) return false;
              const dayStr = format(selectedDay, 'yyyy-MM-dd');
              if (dayType === 'cancellation') {
                return c.cancellationInfo.dates.includes(dayStr);
              } else {
                return c.cancellationInfo.makeUpDates.includes(dayStr);
              }
            });
            
            return (
              <div className="flex flex-col gap-md">
                <div className="p-md rounded-md" style={{ 
                  background: dayType === 'cancellation' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                  border: `1px solid ${dayType === 'cancellation' ? 'var(--color-error)' : 'var(--color-success)'}`,
                }}>
                  <div className="text-sm text-tertiary mb-xs">클래스</div>
                  <div className="text-lg font-semibold">{classWithCancellation?.class.name || '알 수 없음'}</div>
                </div>
                
                <div className="p-md rounded-md" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="text-sm text-tertiary mb-xs">상태</div>
                  <div className="text-sm font-medium" style={{ 
                    color: dayType === 'cancellation' ? 'var(--color-error)' : 'var(--color-success)',
                  }}>
                    {dayType === 'cancellation' ? '휴강일' : '보강일'}
                  </div>
                </div>
              </div>
            );
          }
          
          return null;
        })()}
      </Modal>
    </div>
  );
}

