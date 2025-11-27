# 소셜 로그인 설정 가이드

로컬에서도 카카오톡과 네이버 간편 로그인을 사용할 수 있습니다. 아래 단계를 따라 설정하세요.

## 카카오 로그인 설정

### 1. 카카오 개발자 센터에서 앱 등록
1. [카카오 개발자 센터](https://developers.kakao.com/) 접속
2. 내 애플리케이션 > 애플리케이션 추가하기
3. 앱 이름, 사업자명 입력 후 저장

### 2. 플랫폼 설정
1. 앱 선택 > 플랫폼 설정
2. Web 플랫폼 추가
3. 사이트 도메인: `http://localhost:3000`

### 3. Redirect URI 설정
1. 앱 선택 > 제품 설정 > 카카오 로그인
2. Redirect URI 추가: `http://localhost:3000/auth/kakao/callback`
3. 활성화 ON

### 4. REST API 키 확인
1. 앱 선택 > 앱 설정 > 앱 키
2. REST API 키 복사

### 5. 환경변수 설정
`server/.env` 파일에 추가:
```
KAKAO_CLIENT_ID="your-rest-api-key"
```

## 네이버 로그인 설정

### 1. 네이버 개발자 센터에서 애플리케이션 등록
1. [네이버 개발자 센터](https://developers.naver.com/) 접속
2. 애플리케이션 > 애플리케이션 등록
3. 애플리케이션 이름, 사용 API 선택 (네이버 로그인 필수)

### 2. 서비스 URL 및 Callback URL 설정
1. 애플리케이션 선택
2. 서비스 URL: `http://localhost:3000`
3. Callback URL: `http://localhost:3000/auth/naver/callback`

### 3. Client ID와 Client Secret 확인
1. 애플리케이션 선택
2. Client ID와 Client Secret 복사

### 4. 환경변수 설정
`server/.env` 파일에 추가:
```
NAVER_CLIENT_ID="your-client-id"
NAVER_CLIENT_SECRET="your-client-secret"
```

## 환경변수 설정 후

1. 서버 재시작:
   ```bash
   cd server
   npm run dev
   ```

2. 클라이언트 재시작:
   ```bash
   cd client
   npm run dev
   ```

3. 로그인 페이지에서 카카오/네이버 로그인 버튼이 활성화됩니다.

## 주의사항

- 로컬에서 테스트할 때는 반드시 `http://localhost:3000`으로 접속해야 합니다.
- 환경변수가 설정되지 않으면 소셜 로그인 버튼이 비활성화됩니다.
- 프로덕션 배포 시에는 실제 도메인으로 Redirect URI를 변경해야 합니다.


