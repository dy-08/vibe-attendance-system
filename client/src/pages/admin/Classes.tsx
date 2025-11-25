import { useState, useEffect } from 'react';
import { classAPI, userAPI } from '../../services/api';
import { Card, CardBody } from '../../components/common/Card';
import { SearchInput, Input, Textarea, Select } from '../../components/common/Input';
import Button from '../../components/common/Button';
import Modal, { ConfirmModal } from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import toast from 'react-hot-toast';

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

interface ClassData {
  id: string;
  name: string;
  description?: string;
  schedule?: string;
  maxStudents: number;
  isActive: boolean;
  teacher: { id: string; name: string; email: string };
  _count: { members: number; seats: number };
}

interface Teacher {
  id: string;
  name: string;
  email: string;
}

export default function AdminClasses() {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [search, setSearch] = useState('');
  
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    schedule: '',
    maxStudents: 30,
    teacherId: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [classRes, teacherRes] = await Promise.all([
        classAPI.getAll(),
        userAPI.getAll({ role: 'TEACHER' }),
      ]);
      setClasses(classRes.data.data);
      setTeachers(teacherRes.data.data.users);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setFormData({
      name: '',
      description: '',
      schedule: '',
      maxStudents: 30,
      teacherId: teachers[0]?.id || '',
    });
    setCreateModal(true);
  };

  const openEditModal = (cls: ClassData) => {
    setSelectedClass(cls);
    setFormData({
      name: cls.name,
      description: cls.description || '',
      schedule: cls.schedule || '',
      maxStudents: cls.maxStudents,
      teacherId: cls.teacher.id,
    });
    setEditModal(true);
  };

  const handleCreate = async () => {
    if (!formData.name) {
      toast.error('클래스 이름을 입력해주세요.');
      return;
    }
    if (!formData.teacherId) {
      toast.error('담당 선생님을 선택해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      await classAPI.create(formData);
      toast.success('클래스가 생성되었습니다.');
      setCreateModal(false);
      fetchData();
    } catch (error) {
      toast.error('클래스 생성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedClass) return;

    setSubmitting(true);
    try {
      await classAPI.update(selectedClass.id, formData);
      toast.success('클래스가 수정되었습니다.');
      setEditModal(false);
      fetchData();
    } catch (error) {
      toast.error('클래스 수정에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedClass) return;

    setSubmitting(true);
    try {
      await classAPI.delete(selectedClass.id);
      toast.success('클래스가 삭제되었습니다.');
      setDeleteModal(false);
      fetchData();
    } catch (error) {
      toast.error('클래스 삭제에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredClasses = classes.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.teacher.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="loading-screen"><div className="spinner" /></div>;
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header__top">
          <div>
            <h2 className="page-header__title">클래스 관리</h2>
            <p className="page-header__subtitle">총 {classes.length}개 클래스</p>
          </div>
          <Button variant="primary" onClick={openCreateModal}>
            <PlusIcon />
            새 클래스
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card className="mb-lg">
        <CardBody>
          <div style={{ maxWidth: '400px' }}>
            <SearchInput
              placeholder="클래스명 또는 선생님 이름으로 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardBody>
      </Card>

      {/* Classes Table */}
      {filteredClasses.length === 0 ? (
        <EmptyState
          title="클래스가 없습니다"
          description={search ? '검색 결과가 없습니다.' : '새 클래스를 만들어보세요.'}
          action={{ label: '클래스 만들기', onClick: openCreateModal }}
        />
      ) : (
        <Card>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>클래스명</th>
                  <th>담당 선생님</th>
                  <th>일정</th>
                  <th>학생 수</th>
                  <th>상태</th>
                  <th className="table-cell--actions">작업</th>
                </tr>
              </thead>
              <tbody>
                {filteredClasses.map((cls) => (
                  <tr key={cls.id}>
                    <td>
                      <div>
                        <div className="font-medium">{cls.name}</div>
                        {cls.description && (
                          <div className="text-xs text-tertiary">{cls.description}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="text-sm">{cls.teacher.name}</div>
                      <div className="text-xs text-tertiary">{cls.teacher.email}</div>
                    </td>
                    <td>
                      <span className="text-sm">{cls.schedule || '-'}</span>
                    </td>
                    <td>
                      <span className="text-sm">{cls._count.members} / {cls.maxStudents}</span>
                    </td>
                    <td>
                      <span className={`badge badge--${cls.isActive ? 'success' : 'default'}`}>
                        {cls.isActive ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="table-cell--actions">
                      <div className="btn-group">
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(cls)}>
                          수정
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setSelectedClass(cls);
                            setDeleteModal(true);
                          }}
                        >
                          삭제
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={createModal}
        onClose={() => setCreateModal(false)}
        title="새 클래스 만들기"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateModal(false)}>취소</Button>
            <Button variant="primary" onClick={handleCreate} loading={submitting}>생성</Button>
          </>
        }
      >
        <ClassForm 
          formData={formData} 
          setFormData={setFormData} 
          teachers={teachers} 
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={editModal}
        onClose={() => setEditModal(false)}
        title="클래스 수정"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditModal(false)}>취소</Button>
            <Button variant="primary" onClick={handleEdit} loading={submitting}>저장</Button>
          </>
        }
      >
        <ClassForm 
          formData={formData} 
          setFormData={setFormData} 
          teachers={teachers} 
        />
      </Modal>

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDelete}
        title="클래스 삭제"
        message={`"${selectedClass?.name}" 클래스를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        type="danger"
        confirmText="삭제"
        loading={submitting}
      />
    </div>
  );
}

// Form Component
function ClassForm({ 
  formData, 
  setFormData, 
  teachers 
}: { 
  formData: any; 
  setFormData: (data: any) => void;
  teachers: Teacher[];
}) {
  return (
    <div className="flex flex-col gap-md">
      <Input
        label="클래스 이름"
        placeholder="예: 중등 수학 A반"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />
      <Textarea
        label="설명"
        placeholder="클래스에 대한 설명"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
      />
      <Input
        label="수업 일정"
        placeholder="예: 월,수,금 14:00-16:00"
        value={formData.schedule}
        onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
      />
      <Select
        label="담당 선생님"
        options={teachers.map((t) => ({ value: t.id, label: `${t.name} (${t.email})` }))}
        value={formData.teacherId}
        onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
        required
      />
      <Input
        type="number"
        label="최대 학생 수"
        value={formData.maxStudents}
        onChange={(e) => setFormData({ ...formData, maxStudents: parseInt(e.target.value) || 30 })}
        min={1}
        max={100}
      />
    </div>
  );
}

