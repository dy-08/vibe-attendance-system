import { useState, useEffect } from 'react';
import { classAPI, attendanceAPI } from '../../services/api';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Select } from '../../components/common/Input';
import Button from '../../components/common/Button';
import Avatar from '../../components/common/Avatar';
import { AttendanceBadge } from '../../components/common/Badge';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const ATTENDANCE_OPTIONS = [
  { value: 'PRESENT', label: '출석' },
  { value: 'ABSENT', label: '결석' },
  { value: 'LATE', label: '지각' },
  { value: 'SICK_LEAVE', label: '병가' },
  { value: 'VACATION', label: '휴가' },
  { value: 'EARLY_LEAVE', label: '조퇴' },
];

interface ClassData {
  id: string;
  name: string;
}

interface StudentAttendance {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  attendance: { status: string } | null;
  selectedStatus: string;
}

export default function TeacherAttendance() {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchAttendance();
    }
  }, [selectedClass, selectedDate]);

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
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    try {
      const response = await attendanceAPI.getByClassDate(selectedClass, selectedDate);
      const data = response.data.data;
      
      setStudents(
        data.students.map((s: any) => ({
          ...s,
          selectedStatus: s.attendance?.status || 'PRESENT',
        }))
      );
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    }
  };

  const handleStatusChange = (studentId: string, status: string) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId ? { ...s, selectedStatus: status } : s
      )
    );
  };

  const handleBulkSave = async () => {
    setSubmitting(true);
    try {
      const attendances = students.map((s) => ({
        studentId: s.id,
        status: s.selectedStatus,
      }));

      await attendanceAPI.createBulk({
        classId: selectedClass,
        date: selectedDate,
        attendances,
      });

      toast.success('출결이 저장되었습니다.');
      fetchAttendance();
    } catch (error) {
      toast.error('출결 저장에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAllPresent = () => {
    setStudents((prev) =>
      prev.map((s) => ({ ...s, selectedStatus: 'PRESENT' }))
    );
  };

  if (loading) {
    return <div className="loading-screen"><div className="spinner" /></div>;
  }

  if (classes.length === 0) {
    return (
      <Card>
        <CardBody className="text-center p-xl">
          <p className="text-tertiary">담당 클래스가 없습니다.</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header__top">
          <div>
            <h2 className="page-header__title">출결 관리</h2>
            <p className="page-header__subtitle">
              {format(new Date(selectedDate), 'yyyy년 M월 d일 (EEEE)', { locale: ko })}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
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
            <div>
              <label className="form-label">날짜</label>
              <input
                type="date"
                className="input"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="flex gap-sm ml-auto">
              <Button variant="outline" onClick={handleAllPresent}>
                전체 출석
              </Button>
              <Button variant="primary" onClick={handleBulkSave} loading={submitting}>
                저장
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Student List */}
      <Card>
        <CardHeader>
          <h4>학생 목록</h4>
          <span className="text-sm text-tertiary">{students.length}명</span>
        </CardHeader>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>학생</th>
                <th>현재 상태</th>
                <th style={{ width: '200px' }}>변경</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id}>
                  <td>
                    <div className="user-cell">
                      <Avatar src={student.avatarUrl} name={student.name} size="sm" />
                      <div className="user-cell__info">
                        <span className="user-cell__name">{student.name}</span>
                        <span className="user-cell__sub">{student.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    {student.attendance ? (
                      <AttendanceBadge status={student.attendance.status} />
                    ) : (
                      <span className="text-tertiary text-sm">미기록</span>
                    )}
                  </td>
                  <td>
                    <Select
                      options={ATTENDANCE_OPTIONS}
                      value={student.selectedStatus}
                      onChange={(e) => handleStatusChange(student.id, e.target.value)}
                      inputSize="sm"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

