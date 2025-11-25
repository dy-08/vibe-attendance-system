import { useState, useEffect } from 'react';
import { userAPI } from '../../services/api';
import { Card, CardBody } from '../../components/common/Card';
import { SearchInput, Select } from '../../components/common/Input';
import Button from '../../components/common/Button';
import Avatar from '../../components/common/Avatar';
import { RoleBadge } from '../../components/common/Badge';
import Modal, { ConfirmModal } from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

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
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [editData, setEditData] = useState({
    name: '',
    role: '',
    isActive: true,
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

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditData({
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    });
    setEditModal(true);
  };

  const handleEdit = async () => {
    if (!selectedUser) return;

    setSubmitting(true);
    try {
      await userAPI.update(selectedUser.id, editData);
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
                  <th>역할</th>
                  <th>연락처</th>
                  <th>가입일</th>
                  <th>상태</th>
                  <th className="table-cell--actions">작업</th>
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
                    <td>
                      <RoleBadge role={user.role} />
                    </td>
                    <td>
                      <span className="text-sm">{user.phone || '-'}</span>
                    </td>
                    <td>
                      <span className="text-sm text-tertiary">
                        {format(new Date(user.createdAt), 'yyyy.MM.dd')}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge--${user.isActive ? 'success' : 'default'}`}>
                        {user.isActive ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="table-cell--actions">
                      <div className="btn-group">
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(user)}>
                          수정
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setSelectedUser(user);
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

