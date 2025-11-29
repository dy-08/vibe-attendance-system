import { useState, useEffect } from 'react';
import { cancellationAPI } from '../../services/api';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { Textarea } from '../../components/common/Input';
import EmptyState from '../../components/common/EmptyState';
import Avatar from '../../components/common/Avatar';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface CancellationRequest {
  id: string;
  reason: string;
  dates: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectedReason?: string;
  createdAt: string;
  reviewedAt?: string;
  class: { id: string; name: string };
  teacher: { id: string; name: string; email: string };
}

export default function AdminCancellationRequests() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<CancellationRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<CancellationRequest | null>(null);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectedReason, setRejectedReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const response = await cancellationAPI.getAll(params);
      setRequests(response.data.data);
    } catch (error) {
      console.error('Failed to fetch cancellation requests:', error);
      toast.error('휴강 신청 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    if (!confirm('이 휴강 신청을 승인하시겠습니까? 보강일은 자동으로 연장됩니다.')) {
      return;
    }

    setSubmitting(true);
    try {
      await cancellationAPI.approve(requestId);
      toast.success('휴강 신청이 승인되었습니다.');
      fetchRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '승인에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    if (!rejectedReason.trim()) {
      toast.error('거절 사유를 입력해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      await cancellationAPI.reject(selectedRequest.id, rejectedReason);
      toast.success('휴강 신청이 거절되었습니다.');
      setRejectModal(false);
      setRejectedReason('');
      setSelectedRequest(null);
      fetchRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '거절에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading-screen"><div className="spinner" /></div>;
  }

  const filteredRequests = statusFilter === 'all' 
    ? requests 
    : requests.filter(r => r.status === statusFilter);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      <div className="page-header">
        <div className="page-header__top">
          <div>
            <h2 className="page-header__title">휴강 신청 관리</h2>
            <p className="page-header__subtitle">
              총 {requests.length}건 · 대기 {requests.filter(r => r.status === 'PENDING').length}건
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: 'var(--spacing-sm) var(--spacing-md)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="all">전체</option>
              <option value="PENDING">대기 중</option>
              <option value="APPROVED">승인됨</option>
              <option value="REJECTED">거절됨</option>
            </select>
          </div>
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <EmptyState
          title="휴강 신청이 없습니다"
          description={statusFilter !== 'all' ? '해당 상태의 신청이 없습니다.' : '현재 휴강 신청이 없습니다.'}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {filteredRequests.map((req) => (
            <Card key={req.id}>
              <CardBody>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                      <Avatar src={undefined} name={req.teacher.name} size="md" />
                      <div>
                        <div className="text-sm font-medium">{req.teacher.name}</div>
                        <div className="text-xs text-tertiary">{req.teacher.email}</div>
                      </div>
                    </div>
                    <span
                      className={`badge badge--${
                        req.status === 'APPROVED' ? 'success' :
                        req.status === 'REJECTED' ? 'error' : 'warning'
                      }`}
                    >
                      {req.status === 'APPROVED' ? '승인됨' :
                       req.status === 'REJECTED' ? '거절됨' : '대기 중'}
                    </span>
                  </div>

                  {/* Class Info */}
                  <div style={{ 
                    padding: 'var(--spacing-sm)', 
                    background: 'var(--bg-secondary)', 
                    borderRadius: 'var(--radius-sm)',
                  }}>
                    <div className="text-sm font-medium" style={{ marginBottom: '4px' }}>
                      {req.class.name}
                    </div>
                    <div className="text-xs text-tertiary">
                      신청일: {format(new Date(req.createdAt), 'yyyy년 M월 d일 HH:mm')}
                    </div>
                  </div>

                  {/* Dates */}
                  <div>
                    <div className="text-xs text-tertiary" style={{ marginBottom: 'var(--spacing-xs)' }}>
                      휴강 일자
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-xs)' }}>
                      {req.dates.map((date) => (
                        <span key={date} className="badge badge--default">
                          {format(new Date(date), 'yyyy년 M월 d일')}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Reason */}
                  <div>
                    <div className="text-xs text-tertiary" style={{ marginBottom: 'var(--spacing-xs)' }}>
                      휴강 사유
                    </div>
                    <div className="text-sm" style={{ 
                      padding: 'var(--spacing-sm)', 
                      background: 'var(--bg-secondary)', 
                      borderRadius: 'var(--radius-sm)',
                    }}>
                      {req.reason}
                    </div>
                  </div>

                  {/* Rejected Reason */}
                  {req.rejectedReason && (
                    <div>
                      <div className="text-xs text-tertiary" style={{ marginBottom: 'var(--spacing-xs)' }}>
                        거절 사유
                      </div>
                      <div className="text-sm" style={{ 
                        padding: 'var(--spacing-sm)', 
                        background: 'rgba(239, 68, 68, 0.1)', 
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--color-error)',
                      }}>
                        {req.rejectedReason}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
                    {req.status === 'PENDING' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(req);
                            setRejectModal(true);
                          }}
                          style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}
                        >
                          거절
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleApprove(req.id)}
                          loading={submitting}
                        >
                          승인
                        </Button>
                      </>
                    )}
                    {(req.status === 'REJECTED' || req.status === 'APPROVED') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (!confirm('이 휴강 신청 내역을 삭제하시겠습니까?')) {
                            return;
                          }
                          setSubmitting(true);
                          try {
                            await cancellationAPI.delete(req.id);
                            toast.success('휴강 신청이 삭제되었습니다.');
                            fetchRequests();
                          } catch (error: any) {
                            toast.error(error.response?.data?.message || '삭제에 실패했습니다.');
                          } finally {
                            setSubmitting(false);
                          }
                        }}
                        loading={submitting}
                        style={{ 
                          color: 'var(--color-error)', 
                          borderColor: 'var(--color-error)',
                        }}
                      >
                        삭제
                      </Button>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      <Modal
        isOpen={rejectModal}
        onClose={() => {
          setRejectModal(false);
          setRejectedReason('');
          setSelectedRequest(null);
        }}
        title="휴강 신청 거절"
        footer={
          <>
            <Button variant="outline" onClick={() => setRejectModal(false)}>
              취소
            </Button>
            <Button variant="primary" onClick={handleReject} loading={submitting}>
              거절
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-md">
          {selectedRequest && (
            <>
              <div>
                <div className="text-sm text-tertiary" style={{ marginBottom: 'var(--spacing-xs)' }}>
                  선생님
                </div>
                <div className="text-sm font-medium">{selectedRequest.teacher.name}</div>
              </div>
              <div>
                <div className="text-sm text-tertiary" style={{ marginBottom: 'var(--spacing-xs)' }}>
                  클래스
                </div>
                <div className="text-sm font-medium">{selectedRequest.class.name}</div>
              </div>
              <div>
                <div className="text-sm text-tertiary" style={{ marginBottom: 'var(--spacing-xs)' }}>
                  휴강 일자
                </div>
                <div className="text-sm">
                  {selectedRequest.dates.map(d => format(new Date(d), 'yyyy년 M월 d일')).join(', ')}
                </div>
              </div>
            </>
          )}
          <Textarea
            label="거절 사유"
            placeholder="거절 사유를 입력하세요"
            value={rejectedReason}
            onChange={(e) => setRejectedReason(e.target.value)}
            rows={3}
            required
          />
        </div>
      </Modal>
    </div>
  );
}

