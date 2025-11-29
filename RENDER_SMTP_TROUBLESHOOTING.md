# Render.com SMTP 이메일 발송 문제 해결 가이드

## 문제 증상
- 로컬 환경에서는 이메일이 정상적으로 발송됨
- Render.com 배포 환경에서는 이메일이 발송되지 않음
- 환경 변수는 정상적으로 설정되어 있음

## 원인 분석

Render.com은 일부 네트워크 제한이 있을 수 있습니다:
1. **SMTP 포트(587) 차단**: Render.com의 아웃바운드 연결 정책으로 인해 SMTP 포트가 차단될 수 있음
2. **Gmail IP 차단**: Gmail이 Render.com의 IP 주소를 차단할 수 있음
3. **타임아웃**: 네트워크 지연으로 인한 연결 타임아웃

## 해결 방법

### 1. Render.com 로그 확인

서버 시작 시 자동으로 SMTP 연결 테스트가 실행됩니다. Render.com 대시보드 > Logs에서 다음 메시지를 확인하세요:

```
✅ 이메일 서버 연결 성공
❌ 이메일 서버 연결 실패
```

**에러 코드별 의미:**
- `ETIMEDOUT`, `ECONNRESET`, `ESOCKETTIMEDOUT`: 네트워크 타임아웃 → Render.com 네트워크 제한 가능성
- `EAUTH`: 인증 실패 → Gmail 앱 비밀번호 확인 필요
- `ECONNREFUSED`: 연결 거부 → SMTP 포트 차단 가능성

### 2. Gmail 설정 확인

1. **2단계 인증 활성화**: Google 계정 > 보안 > 2단계 인증
2. **앱 비밀번호 생성**: Google 계정 > 보안 > 앱 비밀번호
3. **앱 비밀번호를 `SMTP_PASS`에 설정**

### 3. Render.com 네트워크 설정 확인

Render.com의 무료 플랜은 일부 네트워크 제한이 있을 수 있습니다. 다음을 확인하세요:

1. Render.com 대시보드 > 서비스 설정
2. 네트워크/방화벽 설정 확인
3. 아웃바운드 연결 허용 여부 확인

### 4. 대안: 이메일 서비스 제공업체 사용

Render.com에서 Gmail SMTP가 작동하지 않는 경우, 다음 서비스를 사용하는 것을 권장합니다:

#### Resend (권장)
- **장점**: 
  - API 기반으로 포트 제한 없음
  - 무료 플랜 제공 (3,000건/월)
  - 빠른 설정
- **설정**:
  1. [Resend.com](https://resend.com) 가입
  2. API 키 발급
  3. 환경 변수 설정:
     ```
     EMAIL_PROVIDER=resend
     RESEND_API_KEY=your-api-key
     ```

#### SendGrid
- **장점**: 
  - 무료 플랜 제공 (100건/일)
  - 안정적인 서비스
- **설정**:
  1. [SendGrid.com](https://sendgrid.com) 가입
  2. API 키 발급
  3. 환경 변수 설정:
     ```
     EMAIL_PROVIDER=sendgrid
     SENDGRID_API_KEY=your-api-key
     ```

#### Brevo (구 Sendinblue)
- **장점**: 
  - 무료 플랜 제공 (300건/일)
  - SMTP 및 API 모두 지원
- **설정**:
  1. [Brevo.com](https://brevo.com) 가입
  2. SMTP 키 또는 API 키 발급
  3. 환경 변수 설정

### 5. 임시 해결책: 이메일 발송을 큐로 처리

이메일 발송을 비동기 큐로 처리하여 네트워크 문제를 우회할 수 있습니다:

```typescript
// 이메일 발송을 백그라운드 작업으로 처리
// 실패 시 재시도 로직 추가
```

## 디버깅 체크리스트

- [ ] Render.com 로그에서 SMTP 연결 테스트 결과 확인
- [ ] 에러 코드 확인 (`ETIMEDOUT`, `EAUTH`, `ECONNREFUSED` 등)
- [ ] Gmail 앱 비밀번호가 올바르게 설정되었는지 확인
- [ ] Render.com 환경 변수가 올바르게 설정되었는지 확인
- [ ] Render.com 플랜이 네트워크 제한이 있는지 확인

## 추가 도움말

문제가 계속되면:
1. Render.com 로그의 전체 에러 메시지를 확인
2. Resend 또는 SendGrid 같은 이메일 서비스 제공업체 사용 고려
3. Render.com 지원팀에 문의 (네트워크 제한 확인)

