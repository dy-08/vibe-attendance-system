import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { userAPI, uploadAPI, authAPI } from '../../services/api';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import Button from '../../components/common/Button';
import Avatar from '../../components/common/Avatar';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';

const CameraIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
    <circle cx="12" cy="13" r="4"></circle>
  </svg>
);

export default function StudentProfile() {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드 가능합니다.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('파일 크기는 5MB 이하여야 합니다.');
      return;
    }

    setLoading(true);
    try {
      const response = await uploadAPI.avatar(file);
      const avatarUrl = response.data.data.avatarUrl;
      
      await userAPI.updateProfile({ avatarUrl });
      updateUser({ avatarUrl });
      toast.success('프로필 사진이 변경되었습니다.');
    } catch (error) {
      toast.error('업로드에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!formData.name || formData.name.length < 2) {
      toast.error('이름은 2자 이상이어야 합니다.');
      return;
    }

    setLoading(true);
    try {
      await userAPI.updateProfile({
        name: formData.name,
        phone: formData.phone || null,
      });
      updateUser({ name: formData.name, phone: formData.phone });
      setEditing(false);
      toast.success('프로필이 수정되었습니다.');
    } catch (error) {
      toast.error('프로필 수정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toast.error('모든 필드를 입력해주세요.');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('새 비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    try {
      await authAPI.updatePassword(passwordData.currentPassword, passwordData.newPassword);
      setPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('비밀번호가 변경되었습니다.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || '비밀번호 변경에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <Card>
        <CardHeader>
          <h4>프로필 정보</h4>
          {!editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              수정
            </Button>
          )}
        </CardHeader>
        <CardBody>
          {/* Avatar */}
          <div className="flex flex-col items-center gap-md mb-xl">
            <div className="avatar-upload">
              <Avatar src={user.avatarUrl} name={user.name} size="2xl" />
              <div className="avatar-upload__overlay">
                <CameraIcon />
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                disabled={loading}
              />
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{user.name}</div>
              <div className="text-sm text-tertiary">{user.email}</div>
            </div>
          </div>

          {/* Form */}
          <div className="flex flex-col gap-md">
            <Input
              label="이름"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={!editing}
            />
            <Input
              label="이메일"
              value={user.email}
              disabled
              hint="이메일은 변경할 수 없습니다."
            />
            <Input
              label="전화번호"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="010-1234-5678"
              disabled={!editing}
            />
          </div>

          {/* Actions */}
          {editing ? (
            <div className="flex gap-sm mt-lg">
              <Button 
                variant="outline" 
                onClick={() => {
                  setEditing(false);
                  setFormData({ name: user.name, phone: user.phone || '' });
                }}
              >
                취소
              </Button>
              <Button variant="primary" onClick={handleSaveProfile} loading={loading}>
                저장
              </Button>
            </div>
          ) : (
            <div className="mt-xl">
              <Button 
                variant="outline" 
                full
                onClick={() => setPasswordModal(true)}
              >
                비밀번호 변경
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Password Change Modal */}
      <Modal
        isOpen={passwordModal}
        onClose={() => setPasswordModal(false)}
        title="비밀번호 변경"
        footer={
          <>
            <Button variant="outline" onClick={() => setPasswordModal(false)}>
              취소
            </Button>
            <Button variant="primary" onClick={handleChangePassword} loading={loading}>
              변경
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-md">
          <Input
            type="password"
            label="현재 비밀번호"
            value={passwordData.currentPassword}
            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
          />
          <Input
            type="password"
            label="새 비밀번호"
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
            hint="6자 이상"
          />
          <Input
            type="password"
            label="새 비밀번호 확인"
            value={passwordData.confirmPassword}
            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
}

