# 학원 출결 관리 시스템 📚

학원의 출결을 효율적으로 관리하는 풀스택 웹 애플리케이션입니다.

## ✨ 주요 기능

### 👨‍🎓 학생
- 내 출결 현황 확인 (월별 달력 뷰)
- 출석률 시각화 (차트)
- 80% 미만 출석률 경고 알림
- 프로필 관리 (사진, 연락처)

### 👩‍🏫 선생님
- 클래스별 좌석 배치도 (출결 상태별 색상 표시)
- 실시간 출결 체크
- 학생별/클래스별 출석률 통계
- 일괄 출결 처리

### 👔 슈퍼관리자
- 전체 사용자(학생/선생님) 관리
- 전체 클래스 관리
- 전체 출결 통계 대시보드
- 출석률 경고 학생 모니터링

### 공통 기능
- 🌓 다크/라이트 모드
- 📱 반응형 디자인
- 🖼️ 프로필 사진 업로드
- 🔐 JWT 기반 인증

## 🛠️ 기술 스택

### Frontend
- React 18 + TypeScript
- Vite (빌드 도구)
- SASS (스타일링)
- React Router (라우팅)
- Recharts (차트)
- React Hot Toast (알림)

### Backend
- Node.js + Express
- TypeScript
- Prisma ORM
- PostgreSQL (Supabase)
- JWT (인증)
- Multer (파일 업로드)
- Zod (검증)

## 🚀 시작하기

### 1. 의존성 설치

```bash
cd attendance-system
npm run install:all
```

### 2. 데이터베이스 설정

1. [Supabase](https://supabase.com)에 가입하고 새 프로젝트 생성
2. Settings > Database > Connection string > URI 복사
3. `server/.env` 파일 생성:

```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
JWT_SECRET="your-super-secret-jwt-key"
PORT=4000
CLIENT_URL="http://localhost:3000"
```

### 3. 데이터베이스 마이그레이션

```bash
npm run db:push
```

### 4. 샘플 데이터 생성 (선택)

```bash
npm run db:seed
```

### 5. 개발 서버 실행

```bash
npm run dev
```

- 프론트엔드: http://localhost:3000
- 백엔드: http://localhost:4000
- Prisma Studio: `npm run db:studio`

## 📁 프로젝트 구조

```
attendance-system/
├── client/                 # React 프론트엔드
│   ├── src/
│   │   ├── components/     # 재사용 컴포넌트
│   │   │   ├── common/     # 공통 컴포넌트 (Button, Modal, etc.)
│   │   │   ├── layouts/    # 레이아웃 컴포넌트
│   │   │   └── ...
│   │   ├── pages/          # 페이지 컴포넌트
│   │   │   ├── auth/       # 로그인, 회원가입
│   │   │   ├── student/    # 학생 페이지
│   │   │   ├── teacher/    # 선생님 페이지
│   │   │   └── admin/      # 관리자 페이지
│   │   ├── contexts/       # React Context (Auth, Theme)
│   │   ├── services/       # API 호출
│   │   ├── styles/         # SASS 스타일
│   │   │   ├── base/       # 리셋, 타이포그래피
│   │   │   ├── components/ # 컴포넌트 스타일
│   │   │   ├── pages/      # 페이지 스타일
│   │   │   └── utils/      # 변수, 믹스인
│   │   └── utils/          # 유틸리티 함수
│   └── ...
├── server/                 # Express 백엔드
│   ├── src/
│   │   ├── routes/         # API 라우트
│   │   ├── controllers/    # 컨트롤러
│   │   ├── middlewares/    # 미들웨어 (auth, error)
│   │   └── lib/            # Prisma 클라이언트
│   └── prisma/
│       ├── schema.prisma   # DB 스키마
│       └── seed.ts         # 시드 데이터
└── ...
```

## 🔑 테스트 계정

시드 데이터 실행 후 사용 가능:

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| 관리자 | admin@academy.com | password123 |
| 선생님 | teacher1@academy.com | password123 |
| 학생 | student1@academy.com | password123 |

## 🎨 디자인 시스템

### 색상
- **Primary**: 파스텔 민트/티파니 (#14b8a6)
- **Secondary**: 파스텔 라벤더 (#a855f7)
- **Accent**: 파스텔 피치 (#f97316)

### 출결 상태 색상
- 🟢 출석: 파스텔 그린
- 🔴 결석: 파스텔 핑크
- 🟡 지각: 파스텔 옐로우
- 🔵 병가: 파스텔 블루
- 🟣 휴가: 파스텔 라벤더

### 폰트
- Pretendard (한글)
- System fonts (fallback)

## 📝 API 엔드포인트

### Auth
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `GET /api/auth/me` - 현재 사용자 정보
- `PUT /api/auth/password` - 비밀번호 변경

### Users
- `GET /api/users` - 사용자 목록
- `GET /api/users/:id` - 사용자 상세
- `PUT /api/users/:id` - 사용자 수정
- `DELETE /api/users/:id` - 사용자 삭제

### Classes
- `GET /api/classes` - 클래스 목록
- `GET /api/classes/:id` - 클래스 상세
- `POST /api/classes` - 클래스 생성
- `PUT /api/classes/:id` - 클래스 수정
- `POST /api/classes/:id/seats` - 좌석 생성

### Attendance
- `GET /api/attendance` - 출결 조회
- `GET /api/attendance/my` - 내 출결 (학생)
- `POST /api/attendance` - 출결 기록
- `POST /api/attendance/bulk` - 일괄 출결

### Stats
- `GET /api/stats/overview` - 전체 통계 (관리자)
- `GET /api/stats/class/:id` - 클래스 통계
- `GET /api/stats/student/:id` - 학생 통계

## 🚀 배포

### Vercel (Frontend)
```bash
cd client
vercel
```

### Railway (Backend)
```bash
cd server
railway up
```

## 📄 라이선스

MIT License

