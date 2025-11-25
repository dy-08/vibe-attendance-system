import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { classAPI } from '../../services/api';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { Input, Textarea } from '../../components/common/Input';
import EmptyState from '../../components/common/EmptyState';
import toast from 'react-hot-toast';

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const GridIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"></rect>
    <rect x="14" y="3" width="7" height="7"></rect>
    <rect x="14" y="14" width="7" height="7"></rect>
    <rect x="3" y="14" width="7" height="7"></rect>
  </svg>
);

interface ClassData {
  id: string;
  name: string;
  description?: string;
  schedule?: string;
  maxStudents: number;
  isActive: boolean;
  teacher: { id: string; name: string };
  _count: { members: number; seats: number };
}

export default function TeacherClasses() {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    schedule: '',
    maxStudents: 30,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await classAPI.getAll();
      setClasses(response.data.data);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name) {
      toast.error('클래스 이름을 입력해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      await classAPI.create(formData);
      toast.success('클래스가 생성되었습니다.');
      setModalOpen(false);
      setFormData({ name: '', description: '', schedule: '', maxStudents: 30 });
      fetchClasses();
    } catch (error) {
      toast.error('클래스 생성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

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
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            <PlusIcon />
            새 클래스
          </Button>
        </div>
      </div>

      {classes.length === 0 ? (
        <EmptyState
          title="클래스가 없습니다"
          description="새 클래스를 만들어 학생들을 관리하세요."
          action={{ label: '클래스 만들기', onClick: () => setModalOpen(true) }}
        />
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-lg)' }}>
          {classes.map((cls) => (
            <Link key={cls.id} to={`/teacher/classes/${cls.id}`}>
              <Card hover className="h-full">
                <CardBody>
                  <div className="flex items-start justify-between mb-md">
                    <div 
                      className="p-sm rounded-md"
                      style={{ background: 'var(--color-primary-100)' }}
                    >
                      <GridIcon />
                    </div>
                    <span 
                      className={`badge badge--${cls.isActive ? 'success' : 'default'}`}
                    >
                      {cls.isActive ? '활성' : '비활성'}
                    </span>
                  </div>
                  <h4 className="mb-xs">{cls.name}</h4>
                  <p className="text-sm text-tertiary mb-md">
                    {cls.description || '설명 없음'}
                  </p>
                  <div className="text-xs text-tertiary mb-md">
                    📅 {cls.schedule || '일정 미정'}
                  </div>
                  <div className="flex items-center justify-between pt-md" style={{ borderTop: '1px solid var(--border-color)' }}>
                    <div className="flex items-center gap-xs text-sm">
                      <UsersIcon />
                      <span>{cls._count.members} / {cls.maxStudents}</span>
                    </div>
                    <div className="text-sm text-tertiary">
                      좌석 {cls._count.seats}개
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="새 클래스 만들기"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              취소
            </Button>
            <Button variant="primary" onClick={handleCreate} loading={submitting}>
              생성
            </Button>
          </>
        }
      >
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
            placeholder="클래스에 대한 설명을 입력하세요"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <Input
            label="수업 일정"
            placeholder="예: 월,수,금 14:00-16:00"
            value={formData.schedule}
            onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
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
      </Modal>
    </div>
  );
}

