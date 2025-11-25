import { useState, useEffect } from 'react';
import { userAPI, statsAPI } from '../../services/api';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { SearchInput } from '../../components/common/Input';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import ProgressRing from '../../components/common/ProgressRing';
import EmptyState from '../../components/common/EmptyState';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

export default function TeacherStudents() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentStats | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

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
            <p className="page-header__subtitle">총 {students.length}명</p>
          </div>
        </div>
      </div>

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

