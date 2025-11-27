# 배포 환경 설정 가이드

## Netlify + 서버 배포 시 소셜 로그인 설정

### 1. 서버 환경 변수 설정

서버 배포 환경(Railway, Render, Heroku 등)에서 다음 환경 변수를 설정하세요:

```env
# 클라이언트 URL (Netlify 배포 URL)
CLIENT_URL=https://academy-attendance.netlify.app

# 카카오 로그인
KAKAO_CLIENT_ID=your_kakao_client_id

# 네이버 로그인
NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret

# 기타 필수 환경 변수
DATABASE_URL=your_database_url
JWT_SECRET=your_jwt_secret
PORT=4000
```

**중요**: `CLIENT_URL`은 반드시 `https://academy-attendance.netlify.app`로 설정해야 합니다. (끝에 슬래시 없이)

### 2. Netlify 환경 변수 설정

Netlify 대시보드 > Site settings > Environment variables에서 설정:

```env
VITE_API_URL=https://your-server-url.com/api
```

**중요**: `your-server-url.com`을 실제 서버 배포 URL로 변경하세요.

### 3. 카카오 개발자 센터 설정

1. [카카오 개발자 센터](https://developers.kakao.com/) 접속
2. 내 애플리케이션 선택
3. 플랫폼 설정 > Web 플랫폼 추가:
   - 사이트 도메인: `https://academy-attendance.netlify.app`
4. 제품 설정 > 카카오 로그인 > Redirect URI 추가:
   - `https://academy-attendance.netlify.app/auth/kakao/callback`
5. 활성화 ON

### 4. 네이버 개발자 센터 설정

1. [네이버 개발자 센터](https://developers.naver.com/) 접속
2. 애플리케이션 선택
3. API 설정:
   - 서비스 URL: `https://academy-attendance.netlify.app`
   - Callback URL: `https://academy-attendance.netlify.app/auth/naver/callback`

**중요**: 
- URL 끝에 슬래시(`/`)를 붙이지 마세요
- `http://`가 아닌 `https://`를 사용하세요
- 정확히 일치해야 합니다 (대소문자, 슬래시 등)

### 5. 환경 변수 확인 방법

서버 로그에서 다음 메시지를 확인하세요:

```
Kakao auth URL - redirectUri: https://academy-attendance.netlify.app/auth/kakao/callback
Kakao auth URL - CLIENT_URL: https://academy-attendance.netlify.app
Naver auth URL - redirectUri: https://academy-attendance.netlify.app/auth/naver/callback
Naver auth URL - CLIENT_URL: https://academy-attendance.netlify.app
```

이 값들이 정확히 일치해야 합니다.

### 6. 문제 해결

#### 문제: "학생 출결관리 서비스 설정에 오류가 있어 네이버 아이디로 로그인할 수 없습니다"

**원인**: 
- 서버의 `CLIENT_URL` 환경 변수가 설정되지 않았거나 잘못 설정됨
- 카카오/네이버 개발자 센터의 Redirect URI가 배포 URL과 일치하지 않음

**해결 방법**:
1. 서버 환경 변수에서 `CLIENT_URL` 확인
2. 카카오/네이버 개발자 센터의 Redirect URI 확인
3. 서버 재시작
4. 브라우저 캐시 삭제 후 다시 시도

#### 문제: 소셜 로그인 버튼이 비활성화됨

**원인**: 
- Netlify의 `VITE_API_URL`이 설정되지 않음
- 서버 API에 연결할 수 없음

**해결 방법**:
1. Netlify 환경 변수에서 `VITE_API_URL` 확인
2. 서버가 정상적으로 실행 중인지 확인
3. CORS 설정 확인

### 7. 체크리스트

배포 전 확인사항:

- [ ] 서버의 `CLIENT_URL`이 `https://academy-attendance.netlify.app`로 설정됨
- [ ] Netlify의 `VITE_API_URL`이 서버 URL로 설정됨
- [ ] 카카오 개발자 센터의 Redirect URI가 배포 URL로 설정됨
- [ ] 네이버 개발자 센터의 Callback URL이 배포 URL로 설정됨
- [ ] 모든 URL이 `https://`로 시작함
- [ ] URL 끝에 슬래시(`/`)가 없음
- [ ] 서버가 재시작되어 새로운 환경 변수가 적용됨

