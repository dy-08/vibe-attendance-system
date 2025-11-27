import { useState, useEffect } from 'react';
import { userAPI, statsAPI, classAPI } from '../../services/api';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { SearchInput, Select } from '../../components/common/Input';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import ProgressRing from '../../components/common/ProgressRing';
import EmptyState from '../../components/common/EmptyState';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

interface Student {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  isActive: boolean;
}

interface StudentStats {
  student: Student;
  monthlyStats: { month: string; label: string; rate: number }[];
}

interface MonthlyAttendanceRate {
  studentId: string;
  studentName: string;
  studentEmail: string;
  avatarUrl?: string;
  total: number;
  present: number;
  absent: number;
  rate: number;
}

interface ClassData {
  id: string;
  name: string;
}

export default function TeacherStudents() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentStats | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'monthly'>('list');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [monthlyRates, setMonthlyRates] = useState<MonthlyAttendanceRate[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  useEffect(() => {
    fetchStudents();
    fetchClasses();
  }, []);

  useEffect(() => {
    if (viewMode === 'monthly' && selectedClass && selectedMonth) {
      fetchMonthlyRates();
    }
  }, [viewMode, selectedClass, selectedMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStudents = async () => {
    try {
      const response = await userAPI.getAll({ role: 'STUDENT' });
      setStudents(response.data.data.users);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await classAPI.getAll();
      const classData = response.data.data;
      setClasses(classData);
      if (classData.length > 0) {
        setSelectedClass(classData[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const fetchMonthlyRates = async () => {
    if (!selectedClass || !selectedMonth) return;
    
    setMonthlyLoading(true);
    try {
      const response = await statsAPI.getClassMonthlyRates(selectedClass, selectedMonth);
      const data = response.data.data;
      
      const rates: MonthlyAttendanceRate[] = data.students.map((item: any) => ({
        studentId: item.student.id,
        studentName: item.student.name,
        studentEmail: item.student.email || '',
        avatarUrl: item.student.avatarUrl,
        total: item.stats.total,
        present: item.stats.present,
        absent: item.stats.absent,
        rate: item.stats.rate,
      }));
      
      setMonthlyRates(rates);
    } catch (error) {
      console.error('Failed to fetch monthly rates:', error);
      toast.error('월별 출석률을 불러오는데 실패했습니다.');
    } finally {
      setMonthlyLoading(false);
    }
  };

  const fetchStudentStats = async (student: Student) => {
    setModalLoading(true);
    try {
      const response = await statsAPI.getStudentStats(student.id, 6);
      setSelectedStudent({
        student: response.data.data.student,
        monthlyStats: response.data.data.monthlyStats,
      });
    } catch (error) {
      console.error('Failed to fetch student stats:', error);
    } finally {
      setModalLoading(false);
    }
  };

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="loading-screen"><div className="spinner" /></div>;
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header__top">
          <div>
            <h2 className="page-header__title">학생 관리</h2>
            <p className="page-header__subtitle">
              {viewMode === 'list' ? `총 ${students.length}명` : '월별 출석률 조회'}
            </p>
          </div>
          <div className="flex gap-sm">
            <Button
              variant={viewMode === 'list' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              학생 목록
            </Button>
            <Button
              variant={viewMode === 'monthly' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setViewMode('monthly')}
            >
              월별 출석률
            </Button>
          </div>
        </div>
      </div>

      {viewMode === 'list' ? (
        <>
          {/* Search */}
          <Card className="mb-lg">
            <CardBody>
              <div style={{ maxWidth: '400px' }}>
                <SearchInput
                  placeholder="이름 또는 이메일로 검색..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </CardBody>
          </Card>

          {/* Student Grid */}
      {filteredStudents.length === 0 ? (
        <EmptyState
          title="학생이 없습니다"
          description={search ? '검색 결과가 없습니다.' : '등록된 학생이 없습니다.'}
        />
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-md)' }}>
          {filteredStudents.map((student) => (
            <Card 
              key={student.id} 
              hover 
              onClick={() => fetchStudentStats(student)}
              className="cursor-pointer"
            >
              <CardBody>
                <div className="flex items-center gap-md">
                  <Avatar src={student.avatarUrl} name={student.name} size="lg" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{student.name}</div>
                    <div className="text-sm text-tertiary truncate">{student.email}</div>
                    <div className="text-xs text-tertiary">{student.phone || '연락처 없음'}</div>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
        </>
      ) : (
        <>
          {/* Monthly Rates Filters */}
          <Card className="mb-lg">
            <CardBody>
              <div className="flex flex-wrap items-end gap-md">
                <div style={{ minWidth: '200px' }}>
                  <Select
                    label="클래스"
                    options={classes.map((c) => ({ value: c.id, label: c.name }))}
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">월</label>
                  <input
                    type="month"
                    className="input"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  />
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Monthly Rates Table */}
          {monthlyLoading ? (
            <Card>
              <CardBody className="text-center p-xl">
                <div className="spinner" />
              </CardBody>
            </Card>
          ) : monthlyRates.length === 0 ? (
            <Card>
              <CardBody className="text-center p-xl">
                <p className="text-tertiary">출석률 데이터가 없습니다.</p>
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <h4>{format(new Date(selectedMonth + '-01'), 'yyyy년 M월')} 출석률</h4>
                <span className="text-sm text-tertiary">{monthlyRates.length}명</span>
              </CardHeader>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'center' }}>번호</th>
                      <th>학생</th>
                      <th style={{ textAlign: 'center' }}>총 수업</th>
                      <th style={{ textAlign: 'center' }}>출석</th>
                      <th style={{ textAlign: 'center' }}>결석</th>
                      <th style={{ textAlign: 'center' }}>출석률</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyRates.map((rate, index) => (
                      <tr key={rate.studentId}>
                        <td style={{ textAlign: 'center' }}>
                          <span className="text-sm text-tertiary">{index + 1}</span>
                        </td>
                        <td>
                          <div className="user-cell">
                            <Avatar src={rate.avatarUrl} name={rate.studentName} size="sm" />
                            <div className="user-cell__info">
                              <span className="user-cell__name">{rate.studentName}</span>
                              <span className="user-cell__sub">{rate.studentEmail}</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="text-sm">{rate.total}회</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="text-sm" style={{ color: 'var(--color-success)' }}>
                            {rate.present}회
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="text-sm" style={{ color: 'var(--color-error)' }}>
                            {rate.absent}회
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            className="text-sm font-semibold"
                            style={{
                              color:
                                rate.rate >= 80
                                  ? 'var(--color-success)'
                                  : rate.rate >= 60
                                  ? 'var(--color-warning)'
                                  : 'var(--color-error)',
                            }}
                          >
                            {rate.rate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Student Detail Modal */}
      <Modal
        isOpen={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        title="학생 상세 정보"
        size="lg"
      >
        {modalLoading ? (
          <div className="flex items-center justify-center p-xl">
            <div className="spinner" />
          </div>
        ) : selectedStudent ? (
          <div className="flex flex-col gap-lg">
            {/* Student Info */}
            <div className="flex items-center gap-lg p-md rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
              <Avatar src={selectedStudent.student.avatarUrl} name={selectedStudent.student.name} size="xl" />
              <div>
                <h3 className="text-xl font-semibold">{selectedStudent.student.name}</h3>
                <p className="text-tertiary">{selectedStudent.student.email}</p>
                <p className="text-sm text-tertiary">{selectedStudent.student.phone || '연락처 없음'}</p>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="flex items-center justify-around text-center">
              {selectedStudent.monthlyStats.length > 0 && (
                <>
                  <ProgressRing
                    value={selectedStudent.monthlyStats[selectedStudent.monthlyStats.length - 1]?.rate || 0}
                    size="md"
                    label="이번 달"
                    color={
                      (selectedStudent.monthlyStats[selectedStudent.monthlyStats.length - 1]?.rate || 0) >= 80
                        ? 'success'
                        : (selectedStudent.monthlyStats[selectedStudent.monthlyStats.length - 1]?.rate || 0) >= 60
                        ? 'warning'
                        : 'error'
                    }
                  />
                  <div>
                    <div className="text-2xl font-bold text-primary">
                      {Math.round(
                        selectedStudent.monthlyStats.reduce((acc, m) => acc + m.rate, 0) /
                          selectedStudent.monthlyStats.length
                      )}%
                    </div>
                    <div className="text-sm text-tertiary">6개월 평균</div>
                  </div>
                </>
              )}
            </div>

            {/* Chart */}
            {selectedStudent.monthlyStats.length > 0 && (
              <div style={{ height: '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={selectedStudent.monthlyStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}
                    />
                    <YAxis 
                      domain={[0, 100]}
                      tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'var(--bg-primary)', 
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                      }}
                      formatter={(value: number) => [`${value}%`, '출석률']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="rate" 
                      stroke="var(--color-primary-500)" 
                      strokeWidth={2}
                      dot={{ fill: 'var(--color-primary-500)' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

