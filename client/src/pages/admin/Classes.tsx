import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { classAPI, userAPI, settingsAPI } from '../../services/api';
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
  status: 'PREPARING' | 'ACTIVE' | 'CANCELLED' | 'COMPLETED';
  isActive: boolean;
  startDate?: string | null;
  periodDays?: number;
  currentPeriod?: {
    periodNumber: number;
    startDate: string;
    endDate: string;
    periodLabel: string;
    daysRemaining?: number;
  };
  teacher: { id: string; name: string; email: string };
  _count: { members: number; seats: number };
}

interface Teacher {
  id: string;
  name: string;
  email: string;
}

type SortOption = 'startDate' | 'status' | 'name' | 'createdAt';
type SortOrder = 'asc' | 'desc';

export default function AdminClasses() {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('startDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [periodConfig, setPeriodConfig] = useState({
    min: 1,
    max: 365,
    default: 30,
  });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    schedule: '',
    maxStudents: 30,
    teacherId: '',
      status: 'PREPARING' as 'PREPARING' | 'ACTIVE' | 'CANCELLED' | 'COMPLETED',
    startDate: '',
    periodDays: 30,
  });

  useEffect(() => {
    fetchData();
    fetchPeriodConfig();
  }, []);

  const fetchPeriodConfig = async () => {
    try {
      const res = await settingsAPI.get();
      const config = res.data.data;
      setPeriodConfig({
        min: config['periodDays.min'] || 1,
        max: config['periodDays.max'] || 365,
        default: config['periodDays.default'] || 30,
      });
      // formData의 periodDays도 기본값으로 업데이트
      setFormData(prev => ({
        ...prev,
        periodDays: prev.periodDays || (config['periodDays.default'] || 30),
      }));
    } catch (error) {
      console.error('Failed to fetch period config:', error);
    }
  };

  const fetchData = async () => {
    try {
      const [classRes, teacherRes] = await Promise.all([
        classAPI.getAll(),
        userAPI.getAll({ role: 'TEACHER' }),
      ]);
      setClasses(classRes.data.data);
      setTeachers(teacherRes.data.data.users);
      
      // 선생님이 없을 때 경고
      if (teacherRes.data.data.users.length === 0) {
        toast.error('등록된 선생님이 없습니다. 먼저 선생님 계정을 생성해주세요.');
      }
    } catch (error: any) {
      console.error('Failed to fetch data:', error);
      const errorMessage = error.response?.data?.message || '데이터를 불러오는데 실패했습니다.';
      toast.error(errorMessage);
      
      // 에러 발생 시 빈 배열로 설정하여 UI가 깨지지 않도록 함
      if (!classes.length) {
        setClasses([]);
      }
      if (!teachers.length) {
        setTeachers([]);
      }
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
      status: 'PREPARING',
      startDate: '',
      periodDays: 30,
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
      status: cls.status || 'PREPARING',
      startDate: (cls as any).startDate ? (cls as any).startDate.split('T')[0] : '',
      periodDays: (cls as any).periodDays || 30,
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

  const handleResetPeriod = async (cls: ClassData) => {
    if (!confirm(`${cls.name} 클래스를 다음 기수로 시작하시겠습니까?\n\n현재 기간이 종료되고 새로운 기간이 시작됩니다.`)) {
      return;
    }

    setSubmitting(true);
    try {
      // 서버에서 다음 기간 시작일을 자동 계산하도록 요청
      await classAPI.resetPeriod(cls.id);
      
      toast.success('다음 기수가 시작되었습니다.');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '다음 기수 시작에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async (cls: ClassData) => {
    if (!confirm(`${cls.name} 클래스를 수료 처리하시겠습니까?`)) {
      return;
    }

    setSubmitting(true);
    try {
      await classAPI.update(cls.id, {
        status: 'COMPLETED',
      });
      toast.success('클래스가 수료 처리되었습니다.');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '수료 처리에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (cls: ClassData) => {
    if (!confirm(`${cls.name} 클래스를 폐강 처리하시겠습니까?\n\n이 작업은 되돌릴 수 있습니다.`)) {
      return;
    }

    setSubmitting(true);
    try {
      await classAPI.update(cls.id, {
        status: 'CANCELLED',
      });
      toast.success('클래스가 폐강 처리되었습니다.');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '폐강 처리에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  // 필터링 및 정렬
  const filteredClasses = classes
    .filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.teacher.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'startDate':
          const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
          const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case 'status':
          const statusOrder = { 'PREPARING': 0, 'ACTIVE': 1, 'COMPLETED': 2, 'CANCELLED': 3 };
          comparison = (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'createdAt':
          // createdAt은 API에서 제공하지 않으므로 startDate로 대체
          const createdA = a.startDate ? new Date(a.startDate).getTime() : 0;
          const createdB = b.startDate ? new Date(b.startDate).getTime() : 0;
          comparison = createdA - createdB;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  if (loading) {
    return <div className="loading-screen"><div className="spinner" /></div>;
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header__top" style={{ flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <h2 className="page-header__title">클래스 관리</h2>
            <p className="page-header__subtitle">총 {classes.length}개 클래스</p>
          </div>
          <Button variant="primary" onClick={openCreateModal} style={{ flexShrink: 0 }}>
            <PlusIcon />
            새 클래스
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="mb-lg">
        <CardBody>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: 'var(--spacing-md)',
          }}>
            <div style={{ maxWidth: '100%', width: '100%' }}>
              <SearchInput
                placeholder="클래스명 또는 선생님 이름으로 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div style={{ 
              display: 'flex', 
              gap: 'var(--spacing-md)',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}>
              {/* 상태 필터 */}
              <Select
                label="상태 필터"
                options={[
                  { value: 'all', label: '전체' },
                  { value: 'PREPARING', label: '개강 준비' },
                  { value: 'ACTIVE', label: '개강' },
                  { value: 'COMPLETED', label: '수료' },
                  { value: 'CANCELLED', label: '폐강' },
                ]}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ minWidth: '140px' }}
              />
              
              {/* 정렬 기준 */}
              <Select
                label="정렬 기준"
                options={[
                  { value: 'startDate', label: '개강 날짜' },
                  { value: 'status', label: '상태' },
                  { value: 'name', label: '클래스명' },
                ]}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                style={{ minWidth: '140px' }}
              />
              
              {/* 정렬 순서 */}
              <Select
                label="정렬 순서"
                options={[
                  { value: 'desc', label: '내림차순' },
                  { value: 'asc', label: '오름차순' },
                ]}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                style={{ minWidth: '120px' }}
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Classes Grid/Cards - 반응형 */}
      {filteredClasses.length === 0 ? (
        <EmptyState
          title="클래스가 없습니다"
          description={search ? '검색 결과가 없습니다.' : '새 클래스를 만들어보세요.'}
          action={{ label: '클래스 만들기', onClick: openCreateModal }}
        />
      ) : (
        <div 
          style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
            gap: 'var(--spacing-lg)',
          }}
          className="classes-grid"
        >
          {filteredClasses.map((cls) => (
            <Card key={cls.id} style={{ display: 'flex', flexDirection: 'column' }}>
              <CardBody style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                {/* 헤더: 클래스명, 상태 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--spacing-sm)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 className="font-medium" style={{ margin: 0, marginBottom: '4px', fontSize: '1.1rem' }}>
                      {cls.name}
                    </h3>
                    {cls.description && (
                      <div className="text-sm text-tertiary" style={{ marginTop: '4px' }}>
                        {cls.description}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                    <span className={`badge badge--${
                      cls.status === 'ACTIVE' ? 'success' : 
                      cls.status === 'PREPARING' ? 'warning' : 
                      cls.status === 'COMPLETED' ? 'info' : 
                      'error'
                    }`}>
                      {cls.status === 'ACTIVE' ? '개강' : 
                       cls.status === 'PREPARING' ? '개강 준비' : 
                       cls.status === 'COMPLETED' ? '수료' : 
                       '폐강'}
                    </span>
                    {!cls.isActive && (
                      <span className="badge badge--default" style={{ fontSize: '10px' }}>
                        비활성
                      </span>
                    )}
                  </div>
                </div>

                {/* 단위기간 정보 - 강조 표시 */}
                {cls.currentPeriod && (
                  <div 
                    style={{ 
                      padding: 'var(--spacing-sm)',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <div className="text-xs text-tertiary" style={{ marginBottom: '4px' }}>
                      현재 기간
                    </div>
                    <div className="font-medium text-sm" style={{ color: 'var(--color-primary)' }}>
                      {cls.currentPeriod.periodLabel}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                      {cls.periodDays && (
                        <div className="text-xs text-tertiary">
                          기간 단위: {cls.periodDays}일
                        </div>
                      )}
                      {cls.currentPeriod.daysRemaining !== undefined && cls.status === 'ACTIVE' && (
                        <div className="text-xs font-medium" style={{ 
                          color: cls.currentPeriod.daysRemaining <= 7 ? 'var(--color-warning)' : 'var(--color-info)',
                        }}>
                          {cls.currentPeriod.daysRemaining > 0 
                            ? `수료까지 ${cls.currentPeriod.daysRemaining}일 남음`
                            : '이번 기간 종료'}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 빠른 액세스 링크 */}
                <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                  <Link to={`/teacher/classes/${cls.id}`} style={{ flex: 1, minWidth: '100px' }}>
                    <Button variant="outline" size="sm" style={{ width: '100%' }}>
                      상세보기
                    </Button>
                  </Link>
                  <Link to={`/teacher/attendance?classId=${cls.id}`} style={{ flex: 1, minWidth: '100px' }}>
                    <Button variant="outline" size="sm" style={{ width: '100%' }}>
                      출석관리
                    </Button>
                  </Link>
                </div>

                {/* 정보 그리드 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)', fontSize: '0.875rem' }}>
                  <div>
                    <div className="text-xs text-tertiary">담당 선생님</div>
                    <div className="font-medium">{cls.teacher.name}</div>
                    <div className="text-xs text-tertiary">{cls.teacher.email}</div>
                  </div>
                  <div>
                    <div className="text-xs text-tertiary">학생 수</div>
                    <div className="font-medium">
                      {cls._count.members} / {cls.maxStudents}
                    </div>
                    <div className="text-xs text-tertiary" style={{ marginTop: '4px' }}>
                      {cls.schedule || '일정 미정'}
                    </div>
                  </div>
                </div>

                {/* 액션 버튼 - 통일된 레이아웃 */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-xs)', marginTop: 'auto', paddingTop: 'var(--spacing-sm)', borderTop: '1px solid var(--border-color)' }}>
                  {/* 첫 번째 줄: 수정, 상태별 액션 버튼들 */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-xs)', width: '100%' }}>
                    <Button variant="ghost" size="sm" onClick={() => openEditModal(cls)} style={{ flex: '1 1 auto', minWidth: '70px' }}>
                      수정
                    </Button>
                    {/* 개강 준비 상태: 다음 기수, 폐강 */}
                    {cls.status === 'PREPARING' && (
                      <>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleResetPeriod(cls)}
                          title="다음 기수로 시작 (단위기간 재설정)"
                          style={{ flex: '1 1 auto', minWidth: '70px' }}
                        >
                          다음 기수
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleCancel(cls)}
                          style={{ color: 'var(--color-error)', flex: '1 1 auto', minWidth: '70px' }}
                        >
                          폐강
                        </Button>
                      </>
                    )}
                    {/* 개강 상태: 수료, 폐강, 다음 기수 */}
                    {cls.status === 'ACTIVE' && (
                      <>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleComplete(cls)}
                          style={{ color: 'var(--color-info)', flex: '1 1 auto', minWidth: '70px' }}
                        >
                          수료
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleCancel(cls)}
                          style={{ color: 'var(--color-error)', flex: '1 1 auto', minWidth: '70px' }}
                        >
                          폐강
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleResetPeriod(cls)}
                          title="다음 기수로 시작 (단위기간 재설정)"
                          style={{ flex: '1 1 auto', minWidth: '70px' }}
                        >
                          다음 기수
                        </Button>
                      </>
                    )}
                  </div>
                  {/* 두 번째 줄: 삭제 버튼 (항상 마지막) */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setSelectedClass(cls);
                      setDeleteModal(true);
                    }}
                    style={{ 
                      color: 'var(--color-error)', 
                      width: '100%',
                      marginTop: 'var(--spacing-xs)'
                    }}
                  >
                    삭제
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
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
          periodConfig={periodConfig}
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
          periodConfig={periodConfig}
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
  teachers,
  periodConfig
}: { 
  formData: any; 
  setFormData: (data: any) => void;
  teachers: Teacher[];
  periodConfig: { min: number; max: number; default: number };
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
        options={teachers.length > 0 
          ? teachers.map((t) => ({ value: t.id, label: `${t.name} (${t.email})` }))
          : [{ value: '', label: '등록된 선생님이 없습니다' }]
        }
        value={formData.teacherId}
        onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
        required
        disabled={teachers.length === 0}
      />
      <Input
        type="number"
        label="최대 학생 수"
        value={formData.maxStudents}
        onChange={(e) => setFormData({ ...formData, maxStudents: parseInt(e.target.value) || 30 })}
        min={1}
        max={100}
      />
      <Input
        type="date"
        label="개강일자 (선택사항)"
        value={formData.startDate}
        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
        hint="출석률 계산 시작일. 설정하지 않으면 오늘부터 시작합니다."
      />
      <Input
        type="number"
        label="기간 단위 (일수)"
        value={formData.periodDays}
        onChange={(e) => setFormData({ ...formData, periodDays: parseInt(e.target.value) || periodConfig.default })}
        min={periodConfig.min}
        max={periodConfig.max}
        hint={`개강일자부터 몇 일 단위로 출석률을 계산할지 설정합니다. (기본값: ${periodConfig.default}일, 범위: ${periodConfig.min}일 ~ ${periodConfig.max}일)`}
      />
      <Select
        label="클래스 상태"
        options={[
          { value: 'PREPARING', label: '개강 준비 (학생 모집 중)' },
          { value: 'ACTIVE', label: '개강 (진행 중)' },
          { value: 'CANCELLED', label: '폐강 (인원 미달 등으로 취소)' },
          { value: 'COMPLETED', label: '수료 (정상 종료)' },
        ]}
        value={formData.status}
        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
        hint="개강 준비: 학생 모집 중, 개강: 수업 진행 중, 폐강: 수업 종료"
      />
    </div>
  );
}

