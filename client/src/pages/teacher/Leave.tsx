import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { userAPI, classAPI, cancellationAPI } from '../../services/api';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { Input, Textarea } from '../../components/common/Input';
import EmptyState from '../../components/common/EmptyState';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface TeacherInfo {
  joinedDate?: string;
  annualLeave: number;
  monthlyLeave: number;
  totalLeave: number; // 연차 + 월차 합계
}

interface ClassData {
  id: string;
  name: string;
  schedule?: string;
  startDate?: string;
  periodDays: number;
}

interface CancellationRequest {
  id: string;
  reason: string;
  dates: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectedReason?: string;
  createdAt: string;
  reviewedAt?: string;
  class: { id: string; name: string };
  isNew?: boolean; // 새로운 답변이 있는지 여부
}

export default function TeacherLeave() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [teacherInfo, setTeacherInfo] = useState<TeacherInfo>({
    annualLeave: 0,
    monthlyLeave: 0,
    totalLeave: 0,
  });
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [requests, setRequests] = useState<CancellationRequest[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    classId: '',
    reason: '',
    dates: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      if (!user) return;
      
      const [userRes, classesRes, requestsRes] = await Promise.all([
        userAPI.getById(user.id),
        classAPI.getAll(),
        cancellationAPI.getMy(),
      ]);

      const userData = userRes.data.data;
      const annualLeave = userData.annualLeave || 0;
      const monthlyLeave = userData.monthlyLeave || 0;
      setTeacherInfo({
        joinedDate: userData.joinedDate,
        annualLeave,
        monthlyLeave,
        totalLeave: annualLeave + monthlyLeave, // 연차와 월차 합계
      });

      const allClasses = classesRes.data.data || [];
      console.log('Fetched classes:', allClasses); // 디버깅용
      setClasses(allClasses);
      
      // 요청 목록에 새로운 답변 여부 표시
      const requestsData = (requestsRes.data.data || []).map((req: any) => {
        // reviewedAt이 있고, 선생님이 마지막으로 확인한 시간보다 이후인 경우 "새로운 답변"
        // 간단하게는 reviewedAt이 있고 status가 APPROVED나 REJECTED인 경우를 "새로운 답변"으로 표시
        // localStorage에 마지막 확인 시간을 저장하여 비교
        const lastChecked = localStorage.getItem(`lastChecked_${req.id}`);
        const isNew = req.reviewedAt && 
          (req.status === 'APPROVED' || req.status === 'REJECTED') &&
          (!lastChecked || new Date(req.reviewedAt) > new Date(lastChecked));
        
        return {
          ...req,
          isNew,
        };
      });
      setRequests(requestsData);
      
      // 페이지 로드 시 모든 새로운 답변을 자동으로 읽음 처리 (선택사항)
      // 또는 사용자가 명시적으로 클릭할 때만 읽음 처리
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDate = () => {
    if (!selectedDate) return;
    
    // 지난 날짜 체크
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    
    if (selected < today) {
      toast.error('지난 날짜는 선택할 수 없습니다.');
      return;
    }
    
    if (!formData.dates.includes(selectedDate)) {
      setFormData({ ...formData, dates: [...formData.dates, selectedDate] });
      setSelectedDate('');
    } else {
      toast.error('이미 추가된 날짜입니다.');
    }
  };

  const handleRemoveDate = (date: string) => {
    setFormData({ ...formData, dates: formData.dates.filter(d => d !== date) });
  };

  const handleSubmit = async () => {
    if (!formData.classId) {
      toast.error('클래스를 선택해주세요.');
      return;
    }
    if (!formData.reason.trim()) {
      toast.error('휴강 사유를 입력해주세요.');
      return;
    }
    if (formData.dates.length === 0) {
      toast.error('휴강 일자를 최소 1개 이상 선택해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      await cancellationAPI.create(formData);
      toast.success('휴강 신청이 완료되었습니다.');
      setModalOpen(false);
      setFormData({ classId: '', reason: '', dates: [] });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '휴강 신청에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading-screen"><div className="spinner" /></div>;
  }

  const workYears = teacherInfo.joinedDate 
    ? Math.floor((new Date().getTime() - new Date(teacherInfo.joinedDate).getTime()) / (1000 * 60 * 60 * 24 * 365))
    : 0;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {/* 연차/월차 정보 */}
      <div className="stats-grid">
        <Card>
          <CardBody>
            <div style={{ textAlign: 'center', padding: 'var(--spacing-md) 0' }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 'var(--spacing-xs)', lineHeight: '1.2' }}>
                {teacherInfo.totalLeave}
              </div>
              <div className="text-sm text-tertiary" style={{ fontSize: '13px' }}>남은 연차 (일)</div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div style={{ textAlign: 'center', padding: 'var(--spacing-md) 0' }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-info)', marginBottom: 'var(--spacing-xs)', lineHeight: '1.2' }}>
                {workYears}
              </div>
              <div className="text-sm text-tertiary" style={{ fontSize: '13px' }}>근무 연차</div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div style={{ textAlign: 'center', padding: 'var(--spacing-md) 0' }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)', lineHeight: '1.2' }}>
                {teacherInfo.joinedDate ? format(new Date(teacherInfo.joinedDate), 'yyyy년 M월 d일') : '미등록'}
              </div>
              <div className="text-sm text-tertiary" style={{ fontSize: '13px' }}>입사일</div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* 휴강 신청 */}
      <Card>
        <CardHeader>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div>
              <h4 style={{ margin: 0 }}>휴강 신청</h4>
              <p className="text-sm text-tertiary" style={{ margin: '4px 0 0 0' }}>
                사정으로 인한 휴강 신청 (보강은 개강 마지막날 뒤로 연장)
              </p>
            </div>
            <Button variant="primary" onClick={() => setModalOpen(true)}>
              휴강 신청
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          {requests.length === 0 ? (
            <EmptyState
              title="휴강 신청 내역이 없습니다"
              description="휴강이 필요한 경우 신청해주세요."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              {requests.map((req) => (
                <Card key={req.id}>
                  <CardBody>
                    <div
                      style={{
                        position: 'relative',
                      }}
                      onClick={() => {
                        // 클릭 시 읽음 처리
                        if (req.isNew && req.reviewedAt) {
                          localStorage.setItem(`lastChecked_${req.id}`, req.reviewedAt);
                          setRequests(requests.map(r => 
                            r.id === req.id ? { ...r, isNew: false } : r
                          ));
                        }
                      }}
                    >
                      {req.isNew && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: 'var(--color-info)',
                            boxShadow: '0 0 0 2px var(--bg-primary)',
                          }}
                          title="새로운 답변이 있습니다"
                        />
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div className="text-sm font-medium" style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {req.class.name}
                              {req.isNew && (
                                <span className="badge badge--info" style={{ fontSize: '10px', padding: '2px 6px' }}>
                                  새 답변
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-tertiary">
                              신청일: {format(new Date(req.createdAt), 'yyyy년 M월 d일')}
                              {req.reviewedAt && (
                                <> · 처리일: {format(new Date(req.reviewedAt), 'yyyy년 M월 d일')}</>
                              )}
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
                        {req.status === 'REJECTED' && (
                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!confirm('이 휴강 신청 내역을 삭제하시겠습니까?')) {
                                  return;
                                }
                                try {
                                  await cancellationAPI.delete(req.id);
                                  toast.success('휴강 신청이 삭제되었습니다.');
                                  fetchData();
                                } catch (error: any) {
                                  toast.error(error.response?.data?.message || '삭제에 실패했습니다.');
                                }
                              }}
                              style={{ 
                                color: 'var(--color-error)', 
                                borderColor: 'var(--color-error)',
                              }}
                            >
                              삭제
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* 휴강 신청 모달 */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setFormData({ classId: '', reason: '', dates: [] });
          setSelectedDate('');
        }}
        title="휴강 신청"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              취소
            </Button>
            <Button variant="primary" onClick={handleSubmit} loading={submitting}>
              신청
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-md">
          <div className="form-group">
            <label className="form-label">클래스 선택</label>
            {classes.length === 0 ? (
              <div className="text-sm text-tertiary" style={{ padding: 'var(--spacing-sm)' }}>
                담당하고 있는 클래스가 없습니다.
              </div>
            ) : (
              <select
                className="input"
                value={formData.classId}
                onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
              >
                <option value="">클래스를 선택하세요</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          
          <div className="form-group">
            <label className="form-label">휴강 사유</label>
            <Textarea
              placeholder="휴강 사유를 입력하세요"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={3}
            />
          </div>

          <div className="form-group">
            <label className="form-label">휴강 일자</label>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  const today = new Date().toISOString().split('T')[0];
                  if (e.target.value < today) {
                    toast.error('지난 날짜는 선택할 수 없습니다.');
                    return;
                  }
                  setSelectedDate(e.target.value);
                }}
                min={new Date().toISOString().split('T')[0]}
                style={{ flex: 1 }}
              />
              <Button variant="outline" onClick={handleAddDate}>
                추가
              </Button>
            </div>
            {formData.dates.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-xs)' }}>
                {formData.dates.map((date) => (
                  <span
                    key={date}
                    className="badge badge--default"
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
                  >
                    {format(new Date(date), 'yyyy년 M월 d일')}
                    <button
                      onClick={() => handleRemoveDate(date)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        color: 'inherit',
                        fontSize: '14px',
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="form-hint">
              보강은 개강 마지막날 뒤로 자동 연장됩니다.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

