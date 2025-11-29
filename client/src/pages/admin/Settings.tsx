import { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Select } from '../../components/common/Input';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';

type FontFamily = 'system' | 'pretendard' | 'noto-sans' | 'nanum-gothic';

export default function AdminSettings() {
  const [fontFamily, setFontFamily] = useState<FontFamily>(() => {
    const saved = localStorage.getItem('fontFamily');
    return (saved as FontFamily) || 'system';
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // 폰트 적용
    document.documentElement.style.setProperty('--font-family', getFontFamilyValue(fontFamily));
    localStorage.setItem('fontFamily', fontFamily);
  }, [fontFamily]);


  const getFontFamilyValue = (font: FontFamily): string => {
    const fonts = {
      'system': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      'pretendard': '"Pretendard", -apple-system, BlinkMacSystemFont, sans-serif',
      'noto-sans': '"Noto Sans KR", sans-serif',
      'nanum-gothic': '"Nanum Gothic", sans-serif',
    };
    return fonts[font];
  };

  const handleFontChange = (font: FontFamily) => {
    setFontFamily(font);
    toast.success('폰트가 변경되었습니다.');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // localStorage에 저장
      localStorage.setItem('fontFamily', fontFamily);
      
      // 폰트 즉시 적용
      document.documentElement.style.setProperty('--font-family', getFontFamilyValue(fontFamily));
      
      toast.success('설정이 저장되었습니다.');
      
      // TODO: 서버에 설정 저장 (향후 구현)
      // await settingsAPI.update({ font: fontFamily });
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('설정 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header__top">
          <div>
            <h2 className="page-header__title">시스템 설정</h2>
            <p className="page-header__subtitle">화면 표시 설정</p>
          </div>
          <Button variant="primary" onClick={handleSave} loading={saving}>
            저장
          </Button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        {/* 폰트 설정 */}
        <Card>
          <CardHeader>
            <h4>폰트 설정</h4>
          </CardHeader>
          <CardBody>
            <div className="flex flex-col gap-md" style={{ maxWidth: '600px' }}>
              <div style={{ 
                padding: 'var(--spacing-md)',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--spacing-sm)',
              }}>
                <p className="text-sm text-tertiary">
                  시스템 전체에 적용될 폰트를 선택할 수 있습니다. 
                  변경 사항은 즉시 적용됩니다.
                </p>
              </div>

              <Select
                label="폰트 선택"
                options={[
                  { value: 'system', label: '시스템 기본 폰트' },
                  { value: 'pretendard', label: 'Pretendard (권장)' },
                  { value: 'noto-sans', label: 'Noto Sans KR' },
                  { value: 'nanum-gothic', label: 'Nanum Gothic' },
                ]}
                value={fontFamily}
                onChange={(e) => handleFontChange(e.target.value as FontFamily)}
              />

              <div style={{ 
                marginTop: 'var(--spacing-sm)',
                padding: 'var(--spacing-md)',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
              }}>
                <div className="text-sm font-medium mb-xs">현재 폰트 미리보기:</div>
                <div style={{ 
                  fontSize: '18px',
                  fontFamily: getFontFamilyValue(fontFamily),
                  padding: 'var(--spacing-md)',
                  background: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                }}>
                  안녕하세요! 이것은 {fontFamily === 'system' ? '시스템 기본' : fontFamily === 'pretendard' ? 'Pretendard' : fontFamily === 'noto-sans' ? 'Noto Sans KR' : 'Nanum Gothic'} 폰트입니다.
                  <br />
                  Hello! This is a font preview.
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

      </div>
    </div>
  );
}

