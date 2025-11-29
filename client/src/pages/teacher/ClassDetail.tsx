import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { classAPI, attendanceAPI } from '../../services/api';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import Button from '../../components/common/Button';
import Avatar from '../../components/common/Avatar';
import Modal from '../../components/common/Modal';
import { Input, Select } from '../../components/common/Input';
import { AttendanceBadge } from '../../components/common/Badge';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

interface ClassData {
  id: string;
  name: string;
  description?: string;
  schedule?: string;
  maxStudents: number;
  members: {
    student: { id: string; name: string; email: string; phone?: string; avatarUrl?: string };
  }[];
  seats: {
    id: string;
    row: number;
    col: number;
    label: string;
    student?: { id: string; name: string; avatarUrl?: string };
    attendance?: { status: string } | null;
  }[];
}

const ATTENDANCE_OPTIONS = [
  { value: 'PRESENT', label: '출석' },
  { value: 'ABSENT', label: '결석' },
  { value: 'LATE', label: '지각' },
  { value: 'SICK_LEAVE', label: '병가' },
  { value: 'VACATION', label: '휴가' },
  { value: 'EARLY_LEAVE', label: '조퇴' },
];

export default function TeacherClassDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [attendanceModal, setAttendanceModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState('PRESENT');
  const [seatModal, setSeatModal] = useState(false);
  const [seatConfig, setSeatConfig] = useState({ rows: 4, cols: 5 });
  const [seatAssignModal, setSeatAssignModal] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<{ id: string; label: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) fetchClassData();
  }, [id, selectedDate]);

  const fetchClassData = async () => {
    try {
      // Fetch class basic info
      const classRes = await classAPI.getById(id!);
      
      // Fetch attendance for selected date
      const attendanceRes = await attendanceAPI.getByClassDate(id!, selectedDate);
      
      // Merge data
      const data = classRes.data.data;
      const attendanceData = attendanceRes.data.data;
      
      // Update seats with attendance status
      const seatsWithAttendance = data.seats.map((seat: any) => {
        const attendance = attendanceData.seats.find((s: any) => s.id === seat.id)?.attendance;
        return { ...seat, attendance };
      });
      
      setClassData({ ...data, seats: seatsWithAttendance });
    } catch (error) {
      console.error('Failed to fetch class:', error);
      toast.error('클래스를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAttendance = async () => {
    if (!selectedStudent) return;
    
    setSubmitting(true);
    try {
      await attendanceAPI.create({
        classId: id,
        studentId: selectedStudent.id,
        date: selectedDate,
        status: attendanceStatus,
      });
      toast.success(`${selectedStudent.name}님의 출결이 기록되었습니다.`);
      setAttendanceModal(false);
      fetchClassData();
    } catch (error) {
      toast.error('출결 기록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSeats = async () => {
    if (seatConfig.rows < 1 || seatConfig.cols < 1) {
      toast.error('행과 열은 1 이상이어야 합니다.');
      return;
    }

    setSubmitting(true);
    try {
      await classAPI.createSeats(id!, seatConfig.rows, seatConfig.cols);
      toast.success('좌석이 생성되었습니다.');
      setSeatModal(false);
      fetchClassData();
    } catch (error) {
      toast.error('좌석 생성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const getSeatStatusClass = (seat: ClassData['seats'][0]) => {
    if (!seat.student) return 'empty';
    if (!seat.attendance) return 'empty';
    
    const statusMap: Record<string, string> = {
      PRESENT: 'present',
      ABSENT: 'absent',
      LATE: 'late',
      SICK_LEAVE: 'sick-leave',
      VACATION: 'vacation',
      EARLY_LEAVE: 'early-leave',
    };
    return statusMap[seat.attendance.status] || 'empty';
  };

  const openAttendanceModal = (student: { id: string; name: string }) => {
    setSelectedStudent(student);
    setAttendanceStatus('PRESENT');
    setAttendanceModal(true);
  };

  const openSeatAssignModal = (seat: { id: string; label: string; student?: { id: string; name: string } }) => {
    setSelectedSeat({ id: seat.id, label: seat.label });
    setSeatAssignModal(true);
  };

  const handleAssignSeat = async (studentId: string | null) => {
    if (!selectedSeat) return;

    setSubmitting(true);
    try {
      await classAPI.assignSeat(id!, selectedSeat.id, studentId);
      toast.success(studentId ? '좌석이 배정되었습니다.' : '좌석이 해제되었습니다.');
      setSeatAssignModal(false);
      setSelectedSeat(null);
      fetchClassData();
    } catch (error: any) {
      console.error('Failed to assign seat:', error);
      const errorMessage = error.response?.data?.message || '좌석 배정에 실패했습니다.';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading-screen"><div className="spinner" /></div>;
  }

  if (!classData) {
    return <div>클래스를 찾을 수 없습니다.</div>;
  }

  // Group seats by row
  const seatsByRow: Record<number, ClassData['seats']> = {};
  classData.seats.forEach((seat) => {
    if (!seatsByRow[seat.row]) seatsByRow[seat.row] = [];
    seatsByRow[seat.row].push(seat);
  });

  const maxCol = Math.max(...classData.seats.map((s) => s.col), 0);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header__top">
          <div className="flex items-center gap-md">
            <Button variant="ghost" icon onClick={() => navigate('/teacher/classes')}>
              <ArrowLeftIcon />
            </Button>
            <div>
              <h2 className="page-header__title">{classData.name}</h2>
              <p className="page-header__subtitle">{classData.schedule || '일정 미정'}</p>
            </div>
          </div>
          <div className="flex items-center gap-sm">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              inputSize="sm"
            />
            <Button variant="outline" onClick={() => setSeatModal(true)}>
              좌석 설정
            </Button>
          </div>
        </div>
      </div>

      {/* 통합 뷰: 좌석과 출석을 함께 표시 */}
      <div 
        style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 500px), 1fr))',
          gap: 'var(--spacing-lg)',
        }}
      >
        {/* Seat Grid */}
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
              <h4>좌석 현황</h4>
              <span className="text-sm text-tertiary">
                {format(new Date(selectedDate), 'yyyy년 M월 d일 (EEE)', { locale: ko })}
              </span>
            </div>
          </CardHeader>
          <CardBody>
            {classData.seats.length === 0 ? (
              <div className="text-center p-xl">
                <p className="text-tertiary mb-md">좌석이 설정되지 않았습니다.</p>
                <Button variant="primary" onClick={() => setSeatModal(true)}>
                  좌석 만들기
                </Button>
              </div>
            ) : (
              <div className="seat-grid">
                <div className="seat-grid__teacher">
                  <span>교탁</span>
                </div>
                
                {/* Column labels */}
                <div className="seat-grid__col-labels">
                  {Array.from({ length: maxCol }, (_, i) => (
                    <div key={i} className="seat-grid__col-label">{i + 1}</div>
                  ))}
                </div>

                {/* Seats */}
                <div className="seat-grid__container">
                  {Object.keys(seatsByRow).sort((a, b) => Number(a) - Number(b)).map((rowNum) => (
                    <div key={rowNum} className="seat-grid__row">
                      <div className="seat-grid__row-label">{String.fromCharCode(64 + Number(rowNum))}</div>
                      {seatsByRow[Number(rowNum)]
                        .sort((a, b) => a.col - b.col)
                        .map((seat) => (
                          <div
                            key={seat.id}
                            className={`seat seat--${getSeatStatusClass(seat)} ${!seat.student ? 'seat--assignable' : ''}`}
                            onClick={() => {
                              if (seat.student) {
                                openAttendanceModal(seat.student);
                              } else {
                                openSeatAssignModal(seat);
                              }
                            }}
                            title={seat.student ? `${seat.student.name} (출결 입력)` : `${seat.label} (좌석 배정)`}
                          >
                            {seat.student ? (
                              <>
                                <div className="seat__avatar">
                                  {seat.student.avatarUrl ? (
                                    <img src={seat.student.avatarUrl} alt="" />
                                  ) : (
                                    seat.student.name.slice(0, 1)
                                  )}
                                </div>
                                <span className="seat__name">{seat.student.name}</span>
                              </>
                            ) : (
                              <span className="seat__label">{seat.label}</span>
                            )}
                          </div>
                        ))}
                    </div>
                  ))}
                </div>

                {/* Legend */}
                <div className="seat-legend">
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
                    <span>병가</span>
                  </div>
                  <div className="seat-legend__item">
                    <div className="seat-legend__color seat-legend__color--vacation" />
                    <span>휴가</span>
                  </div>
                  <div className="seat-legend__item">
                    <div className="seat-legend__color seat-legend__color--empty" />
                    <span>미기록/빈좌석</span>
                  </div>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Student List */}
        <Card>
          <CardHeader>
            <h4>학생 목록</h4>
            <span className="text-sm text-tertiary">{classData.members.length}명</span>
          </CardHeader>
          <CardBody style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {classData.members.length === 0 ? (
              <p className="text-tertiary text-center p-lg">등록된 학생이 없습니다.</p>
            ) : (
              <div className="flex flex-col gap-sm">
                {classData.members.map((member) => (
                  <div 
                    key={member.student.id}
                    className="flex items-center justify-between p-sm rounded-md cursor-pointer"
                    style={{ background: 'var(--bg-secondary)' }}
                    onClick={() => openAttendanceModal(member.student)}
                  >
                    <div className="flex items-center gap-sm">
                      <Avatar src={member.student.avatarUrl} name={member.student.name} size="sm" />
                      <div>
                        <div className="text-sm font-medium">{member.student.name}</div>
                        <div className="text-xs text-tertiary">
                          {member.student.phone || '연락처 없음'}
                          {classData.seats.find(s => s.student?.id === member.student.id) && (
                            <span className="ml-sm" style={{ color: 'var(--color-success)' }}>
                              • 좌석 배정됨
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-xs">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          const assignedSeat = classData.seats.find(s => s.student?.id === member.student.id);
                          if (assignedSeat) {
                            openSeatAssignModal(assignedSeat);
                          } else {
                            toast('좌석을 클릭하여 학생을 배정하세요.', { icon: 'ℹ️' });
                          }
                        }}
                      >
                        좌석
                      </Button>
                      <Button variant="ghost" size="sm" onClick={(e) => {
                        e.stopPropagation();
                        openAttendanceModal(member.student);
                      }}>
                        출결
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Attendance Modal */}
      <Modal
        isOpen={attendanceModal}
        onClose={() => setAttendanceModal(false)}
        title="출결 기록"
        footer={
          <>
            <Button variant="outline" onClick={() => setAttendanceModal(false)}>취소</Button>
            <Button variant="primary" onClick={handleAttendance} loading={submitting}>저장</Button>
          </>
        }
      >
        {selectedStudent && (
          <div className="flex flex-col gap-md">
            <div className="flex items-center gap-md p-md rounded-md" style={{ background: 'var(--bg-secondary)' }}>
              <Avatar name={selectedStudent.name} size="md" />
              <div>
                <div className="font-medium">{selectedStudent.name}</div>
                <div className="text-sm text-tertiary">
                  {format(new Date(selectedDate), 'yyyy년 M월 d일', { locale: ko })}
                </div>
              </div>
            </div>
            <Select
              label="출결 상태"
              options={ATTENDANCE_OPTIONS}
              value={attendanceStatus}
              onChange={(e) => setAttendanceStatus(e.target.value)}
            />
          </div>
        )}
      </Modal>

      {/* Seat Config Modal */}
      <Modal
        isOpen={seatModal}
        onClose={() => setSeatModal(false)}
        title="좌석 설정"
        footer={
          <>
            <Button variant="outline" onClick={() => setSeatModal(false)}>취소</Button>
            <Button variant="primary" onClick={handleCreateSeats} loading={submitting}>생성</Button>
          </>
        }
      >
        <div className="flex flex-col gap-md">
          <p className="text-sm text-tertiary">
            ⚠️ 새 좌석을 생성하면 기존 좌석 배치가 초기화됩니다.
          </p>
          <Input
            type="number"
            label="행 수"
            value={seatConfig.rows}
            onChange={(e) => setSeatConfig({ ...seatConfig, rows: parseInt(e.target.value) || 1 })}
            min={1}
            max={10}
          />
          <Input
            type="number"
            label="열 수"
            value={seatConfig.cols}
            onChange={(e) => setSeatConfig({ ...seatConfig, cols: parseInt(e.target.value) || 1 })}
            min={1}
            max={10}
          />
          <div className="text-sm text-tertiary">
            총 {seatConfig.rows * seatConfig.cols}개의 좌석이 생성됩니다.
          </div>
        </div>
      </Modal>

      {/* Seat Assign Modal */}
      <Modal
        isOpen={seatAssignModal}
        onClose={() => {
          setSeatAssignModal(false);
          setSelectedSeat(null);
        }}
        title={`좌석 배정: ${selectedSeat?.label || ''}`}
        footer={
          <>
            <Button 
              variant="outline" 
              onClick={() => {
                if (selectedSeat && classData?.seats.find(s => s.id === selectedSeat.id)?.student) {
                  handleAssignSeat(null);
                } else {
                  setSeatAssignModal(false);
                  setSelectedSeat(null);
                }
              }}
            >
              {selectedSeat && classData?.seats.find(s => s.id === selectedSeat.id)?.student ? '좌석 해제' : '취소'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-md">
          {selectedSeat && classData?.seats.find(s => s.id === selectedSeat.id)?.student ? (
            <div>
              <p className="text-sm text-tertiary mb-md">
                현재 배정된 학생: <strong>{classData.seats.find(s => s.id === selectedSeat.id)?.student?.name}</strong>
              </p>
              <p className="text-sm text-tertiary mb-md">
                좌석을 해제하려면 "좌석 해제" 버튼을 클릭하세요.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-tertiary mb-md">
                좌석에 배정할 학생을 선택하세요.
              </p>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }} className="flex flex-col gap-sm">
                {classData?.members
                  .filter(m => !classData.seats.find(s => s.student?.id === m.student.id))
                  .map((member) => (
                    <div
                      key={member.student.id}
                      className="flex items-center justify-between p-sm rounded-md cursor-pointer"
                      style={{ 
                        background: 'var(--bg-secondary)',
                        transition: 'background var(--transition-fast)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                      onClick={() => handleAssignSeat(member.student.id)}
                    >
                      <div className="flex items-center gap-sm">
                        <Avatar src={member.student.avatarUrl} name={member.student.name} size="sm" />
                        <div>
                          <div className="text-sm font-medium">{member.student.name}</div>
                          <div className="text-xs text-tertiary">{member.student.email}</div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">배정</Button>
                    </div>
                  ))}
                {classData?.members.filter(m => !classData.seats.find(s => s.student?.id === m.student.id)).length === 0 && (
                  <p className="text-sm text-tertiary text-center p-md">
                    배정 가능한 학생이 없습니다. (모든 학생이 이미 좌석에 배정됨)
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}

