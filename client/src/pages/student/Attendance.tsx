import { useState, useEffect } from 'react';
import { attendanceAPI } from '../../services/api';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Select } from '../../components/common/Input';
import { AttendanceBadge } from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
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
}

export default function StudentAttendance() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [loading, setLoading] = useState(true);

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
              const statusClass = getStatusClass(attendance?.status);
              
              return (
                <div
                  key={day.toISOString()}
                  className={`calendar__day ${
                    !isSameMonth(day, currentDate) ? 'calendar__day--other-month' : ''
                  } ${isToday(day) ? 'calendar__day--today' : ''}`}
                >
                  <span className="calendar__day-number">
                    {format(day, 'd')}
                  </span>
                  {attendance && (
                    <span className={`calendar__day-status calendar__day-status--${statusClass}`} />
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
              <div className="flex items-center justify-around text-center">
                <div>
                  <div className="text-3xl font-bold text-primary">{attendanceRate}%</div>
                  <div className="text-sm text-tertiary">출석률</div>
                </div>
                <div>
                  <div className="text-2xl font-bold" style={{ color: 'var(--color-success)' }}>
                    {selectedStats.present}
                  </div>
                  <div className="text-sm text-tertiary">출석</div>
                </div>
                <div>
                  <div className="text-2xl font-bold" style={{ color: 'var(--color-error)' }}>
                    {selectedStats.absent}
                  </div>
                  <div className="text-sm text-tertiary">결석</div>
                </div>
                <div>
                  <div className="text-2xl font-bold" style={{ color: 'var(--color-warning)' }}>
                    {selectedStats.late}
                  </div>
                  <div className="text-sm text-tertiary">지각</div>
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
    </div>
  );
}

