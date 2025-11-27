import { useState, useEffect } from 'react';
import { userAPI, classAPI } from '../../services/api';
import { Card, CardBody } from '../../components/common/Card';
import { SearchInput, Select } from '../../components/common/Input';
import Button from '../../components/common/Button';
import Avatar from '../../components/common/Avatar';
import { RoleBadge } from '../../components/common/Badge';
import Modal, { ConfirmModal } from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// Icons
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
}

interface Class {
  id: string;
  name: string;
  description?: string;
  schedule?: string;
  isActive?: boolean;
}

interface UserDetail extends User {
  studentClass?: {
    class: {
      id: string;
      name: string;
      schedule?: string;
    };
  }[];
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AdminUsers() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  const [editData, setEditData] = useState({
    name: '',
    role: '',
    isActive: true,
    classIds: [] as string[],
  });

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, roleFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await userAPI.getAll({
        page: pagination.page,
        limit: pagination.limit,
        role: roleFilter || undefined,
        search: search || undefined,
      });
      setUsers(response.data.data.users);
      setPagination(response.data.data.pagination);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchUsers();
  };

  const openEditModal = async (user: User) => {
    setSelectedUser(user);
    setEditData({
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      classIds: [],
    });
    setEditModal(true);
    setLoadingClasses(true);

    try {
      // 사용자 상세 정보 가져오기 (현재 클래스 정보 포함)
      const [userDetailRes, classesRes] = await Promise.all([
        userAPI.getById(user.id),
        classAPI.getAll(),
      ]);

      const userDetailData = userDetailRes.data.data;
      setUserDetail(userDetailData);
      setClasses(classesRes.data.data);

      // 현재 클래스 ID 설정
      if (userDetailData.studentClass && userDetailData.studentClass.length > 0) {
        setEditData(prev => ({
          ...prev,
          classIds: userDetailData.studentClass.map(sc => sc.class.id),
        }));
      }
    } catch (error) {
      console.error('Failed to fetch user detail or classes:', error);
      toast.error('사용자 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoadingClasses(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedUser) return;

    setSubmitting(true);
    try {
      const updateData = {
        ...editData,
        // STUDENT 역할이 아닌 경우 classIds 제거
        ...(editData.role === 'STUDENT' ? {} : { classIds: undefined }),
      };
      await userAPI.update(selectedUser.id, updateData);
      toast.success('사용자 정보가 수정되었습니다.');
      setEditModal(false);
      fetchUsers();
    } catch (error) {
      toast.error('수정에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;

    setSubmitting(true);
    try {
      await userAPI.delete(selectedUser.id);
      toast.success('사용자가 삭제되었습니다.');
      setDeleteModal(false);
      fetchUsers();
    } catch (error) {
      toast.error('삭제에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header__top">
          <div>
            <h2 className="page-header__title">사용자 관리</h2>
            <p className="page-header__subtitle">총 {pagination.total}명</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-lg">
        <CardBody>
          <div className="flex flex-wrap items-end gap-md">
            <div style={{ flex: '1', minWidth: '200px', maxWidth: '400px' }}>
              <SearchInput
                placeholder="이름 또는 이메일로 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div style={{ minWidth: '150px' }}>
              <Select
                options={[
                  { value: '', label: '전체 역할' },
                  { value: 'GUEST', label: '손님' },
                  { value: 'STUDENT', label: '학생' },
                  { value: 'TEACHER', label: '선생님' },
                  { value: 'SUPER_ADMIN', label: '관리자' },
                ]}
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              />
            </div>
            <Button variant="primary" onClick={handleSearch}>
              검색
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Users Table */}
      {loading ? (
        <div className="loading-screen"><div className="spinner" /></div>
      ) : users.length === 0 ? (
        <EmptyState
          title="사용자가 없습니다"
          description="검색 조건에 맞는 사용자가 없습니다."
        />
      ) : (
        <Card>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>사용자</th>
                  <th style={{ textAlign: 'center' }}>역할</th>
                  <th style={{ textAlign: 'center' }}>연락처</th>
                  <th style={{ textAlign: 'center' }}>가입일</th>
                  <th style={{ textAlign: 'center' }}>상태</th>
                  <th style={{ textAlign: 'center' }}>작업</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-cell">
                        <Avatar src={user.avatarUrl} name={user.name} size="sm" />
                        <div className="user-cell__info">
                          <span className="user-cell__name">{user.name}</span>
                          <span className="user-cell__sub">{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <RoleBadge role={user.role} />
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="text-sm">{user.phone || '-'}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="text-sm text-tertiary">
                        {format(new Date(user.createdAt), 'yyyy.MM.dd')}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <span className={`badge badge--${user.isActive ? 'success' : 'default'}`}>
                          {user.isActive ? '활성' : '비활성'}
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="btn-group" style={{ gap: 'var(--spacing-xs)', justifyContent: 'center' }}>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => openEditModal(user)}
                          style={{ 
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <EditIcon />
                          수정
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setSelectedUser(user);
                            setDeleteModal(true);
                          }}
                          style={{ 
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: 'var(--color-error)',
                            borderColor: 'var(--color-error)'
                          }}
                        >
                          <TrashIcon />
                          삭제
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <span className="pagination__info">
                {pagination.total}명 중 {(pagination.page - 1) * pagination.limit + 1}-
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>
              <div className="pagination__controls">
                <button
                  className="pagination__btn"
                  disabled={pagination.page === 1}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                >
                  ‹
                </button>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter((p) => Math.abs(p - pagination.page) <= 2)
                  .map((p) => (
                    <button
                      key={p}
                      className={`pagination__btn ${p === pagination.page ? 'pagination__btn--active' : ''}`}
                      onClick={() => setPagination((prev) => ({ ...prev, page: p }))}
                    >
                      {p}
                    </button>
                  ))}
                <button
                  className="pagination__btn"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={editModal}
        onClose={() => setEditModal(false)}
        title="사용자 수정"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditModal(false)}>취소</Button>
            <Button variant="primary" onClick={handleEdit} loading={submitting}>저장</Button>
          </>
        }
      >
        {selectedUser && (
          <div className="flex flex-col gap-md">
            <div className="flex items-center gap-md p-md rounded-md" style={{ background: 'var(--bg-secondary)' }}>
              <Avatar src={selectedUser.avatarUrl} name={selectedUser.name} size="lg" />
              <div>
                <div className="font-medium">{selectedUser.name}</div>
                <div className="text-sm text-tertiary">{selectedUser.email}</div>
              </div>
            </div>
            <Select
              label="역할"
              options={[
                { value: 'GUEST', label: '손님' },
                { value: 'STUDENT', label: '학생' },
                { value: 'TEACHER', label: '선생님' },
                { value: 'SUPER_ADMIN', label: '관리자' },
              ]}
              value={editData.role}
              onChange={(e) => setEditData({ ...editData, role: e.target.value })}
            />
            <Select
              label="상태"
              options={[
                { value: 'true', label: '활성' },
                { value: 'false', label: '비활성' },
              ]}
              value={String(editData.isActive)}
              onChange={(e) => setEditData({ ...editData, isActive: e.target.value === 'true' })}
            />
            {editData.role === 'STUDENT' && (
              <div className="flex flex-col gap-sm">
                <label className="input-label">클래스</label>
                {loadingClasses ? (
                  <div className="text-sm text-tertiary">클래스 목록을 불러오는 중...</div>
                ) : (
                  <>
                    {userDetail?.studentClass && userDetail.studentClass.length > 0 && (
                      <div className="text-sm text-tertiary mb-sm">
                        현재 클래스: {userDetail.studentClass.map(sc => sc.class.name).join(', ')}
                      </div>
                    )}
                    <div className="flex flex-col gap-xs" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {classes.length === 0 ? (
                        <div className="text-sm text-tertiary p-sm">
                          클래스가 없습니다.
                        </div>
                      ) : (
                        classes.map((cls) => (
                          <label
                            key={cls.id}
                            className="flex items-center gap-sm p-sm rounded-md cursor-pointer hover:bg-secondary"
                            style={{ 
                              background: editData.classIds.includes(cls.id) 
                                ? 'var(--bg-secondary)' 
                                : 'transparent' 
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={editData.classIds.includes(cls.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEditData({
                                    ...editData,
                                    classIds: [...editData.classIds, cls.id],
                                  });
                                } else {
                                  setEditData({
                                    ...editData,
                                    classIds: editData.classIds.filter(id => id !== cls.id),
                                  });
                                }
                              }}
                              style={{ margin: 0 }}
                            />
                            <div className="flex-1">
                              <div className="font-medium text-sm">{cls.name}</div>
                              {cls.description && (
                                <div className="text-xs text-tertiary">{cls.description}</div>
                              )}
                              {cls.schedule && (
                                <div className="text-xs text-tertiary">{cls.schedule}</div>
                              )}
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDelete}
        title="사용자 삭제"
        message={`${selectedUser?.name}님을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        type="danger"
        confirmText="삭제"
        loading={submitting}
      />
    </div>
  );
}

