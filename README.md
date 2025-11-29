## Vibe Attendance System - 학원 출결 관리 웹 애플리케이션

- `Project` : Vibe Attendance System - 학원의 출결을 효율적으로 관리하는 풀스택 웹 애플리케이션
- `Project duration` : 2024.11.24 ~ 2024.11.28 (5일)
- `Link` : [배포 사이트](http://academy-attendance.netlify.app)
- `Stack` : React, TypeScript, Vite, SASS, Node.js, Express, Prisma, PostgreSQL
- `Service/API` : Supabase (PostgreSQL), Kakao / Naver OAuth, Gmail SMTP
- `Troubleshooting` : 트러블 슈팅 문서 (추가 예정)

### 설명

- 5일 동안 **기획 → 설계 → 개발 → 배포**까지 한 번에 진행한 학원 출결 관리 웹 애플리케이션입니다.
- 학생·선생님·관리자 **3가지 역할(Role)** 에 따라 출결 조회, 출결 체크, 통계 대시보드 등 서로 다른 기능을 제공합니다.
- **React + TypeScript** 기반으로 프론트엔드를 구성하고, **Node.js + Express + Prisma + PostgreSQL(Supabase)** 를 사용해 백엔드를 구현했습니다.
- **카카오/네이버 소셜 로그인, 이메일 기반 비밀번호 찾기, JWT 인증**을 포함한 실사용 가능한 출결 관리 플로우를 목표로 했습니다.
- 실제 배포 환경(Render + Netlify + Supabase)을 구성하며, **기획과 배포를 동시에 진행**한 프로젝트입니다.

### 팀 소개

| 이름   | 역할                     | GitHub                                    |
| ------ | ------------------------ | ----------------------------------------- |
| 권희나 | 기획 · UI 설계 · FE · BE | [KwonHeena](https://github.com/KwonHeena) |
| 권영호 | 기획 · UI 설계 · FE · BE | [dy-08](https://github.com/dy-08)         |

### 테스트 계정

| 역할   | 이메일                                              | 비밀번호    |
| ------ | --------------------------------------------------- | ----------- |
| 관리자 | [admin@academy.com](mailto:admin@academy.com)       | password123 |
| 선생님 | [teacher1@academy.com](mailto:teacher1@academy.com) | password123 |
| 학생   | [student1@academy.com](mailto:student1@academy.com) | password123 |

### 프로젝트 실행 방법

```bash
# 0. 사전 준비
- Node.js v18 이상
- Git

# 1. 프로젝트 클론
git clone https://github.com/dy-08/vibe-attendance-system.git
cd vibe-attendance-system

# 2. 서버 설정
cd server

# 패키지 설치 (package-lock.json 기준 정확한 버전)
npm ci

# 환경변수 파일 생성

# Windows
copy env.example.txt .env

# Mac/Linux
cp env.example.txt .env

# .env 파일 수정 후
npm run db:generate
npm run db:push
npm run db:seed # 테스트 데이터 (선택)

# 3. 클라이언트 설정
cd ../client

# 패키지 설치
npm ci

# 4. 로컬 실행
터미널 1 (서버):
cd server
npm run dev
터미널 2 (클라이언트):
cd client
npm run dev

# 5. 접속
- 프론트엔드: http://localhost:3000
- 백엔드 API: http://localhost:4000
```

### 기획

플로우 / UI/UX / 데이터 구조는 아래 정리했습니다.

### 시스템 워크플로우 개요

- **사용자(학생/선생님/관리자)** 는 프론트엔드(React)에서 로그인/회원가입 및 대시보드, 출결 화면에 접근합니다.
- 프론트엔드는 **JWT 기반 인증 미들웨어**를 거쳐 **Express REST API**와 통신합니다.
- 백엔드는 **Supabase PostgreSQL** 과 연동하여 사용자, 클래스, 출결, 좌석 데이터를 관리합니다.
- 이메일 관련 기능(비밀번호 찾기 등)은 **Gmail SMTP + Nodemailer** 로 처리합니다.
- 소셜 로그인의 경우 **카카오 / 네이버 OAuth**를 통해 인증 후 GUEST → 관리자의 승인으로 STUDENT/TEACHER 권한을 부여합니다.

### 사용자 흐름 개요

1. **회원가입**
   - 일반 회원가입(이메일/비밀번호) 또는 카카오/네이버 소셜 로그인
   - 최초 가입 시 `GUEST` 권한으로 등록
2. **권한 승인**
   - 관리자가 GUEST 사용자를 확인 후 `STUDENT` 또는 `TEACHER` 권한 부여
3. **역할별 사용**
   - 학생: 내 출결 달력/통계 조회, 프로필 관리
   - 선생님: 좌석 배치도 기반 출결 체크, 클래스별 출석률 관리
   - 관리자: 전체 사용자/클래스/출결 통계 대시보드, 경고 대상 모니터링

### 데이터베이스 구조 개요

주요 엔티티는 다음과 같습니다.

- `User` : 사용자(학생/선생님/관리자/GUEST)
  - 선생님의 경우: 입사일(joinedDate), 연차(annualLeave), 월차(monthlyLeave) 정보 포함
- `Class` : 수업(반) 정보
  - 개강일자(startDate), 단위기간(periodDays), 상태(status: PREPARING/ACTIVE/CANCELLED/COMPLETED) 포함
- `ClassMember` : 수업에 속한 학생 정보(JOIN 테이블)
- `Seat` : 클래스별 좌석 배치 및 학생 배정 (클래스별로 독립적)
- `Attendance` : 일자별 출결 기록
- `ClassCancellationRequest` : 선생님의 휴강 신청 및 관리자 승인/거절 정보
- `Notification` : 출석률 경고, 안내 메시지 등 발송 로그

> 실제 스키마 정의는 `server/prisma/schema.prisma`를 참고합니다.

### 기술 스택

#### Frontend

| 기술         | 버전 | 설명            |
| ------------ | ---- | --------------- |
| React        | 18.2 | UI 라이브러리   |
| Vite         | 5.0  | 빌드 도구       |
| TypeScript   | 5.2  | 정적 타입       |
| SASS         | 1.69 | 스타일링        |
| React Router | 6.20 | 라우팅          |
| Axios        | 1.6  | HTTP 클라이언트 |
| Recharts     | 2.10 | 차트            |

#### Backend

| 기술       | 버전 | 설명          |
| ---------- | ---- | ------------- |
| Node.js    | 20.x | 런타임        |
| Express    | 4.18 | 웹 프레임워크 |
| TypeScript | 5.2  | 정적 타입     |
| Prisma     | 5.6  | ORM           |
| PostgreSQL | -    | 데이터베이스  |
| JWT        | 9.0  | 인증          |
| Nodemailer | 7.0  | 이메일 발송   |

### 주요 기능

#### 학생(STUDENT)

- 월별 달력 UI로 **내 출결 현황 확인**
- **출석률 차트(Recharts)** 로 출석률 시각화
- 출석률 **80% 미만 시 경고 배지/메시지 표시**
- 프로필 정보 및 아바타 이미지 관리
- **휴강/보강 정보 표시**: 클래스별 휴강일 및 보강일 확인
- 출결 현황 달력에서 **휴강일/보강일 시각적 표시** (휴강일: 빨간색, 보강일: 초록색)

#### 선생님(TEACHER)

- 클래스별 **좌석 배치도** UI (출결 상태별 색상 구분)
- 실시간 출결 체크 (출석/지각/조퇴/결석 등)
- 학생별/클래스별 출석률 통계 조회
- 특정 날짜에 대해 **일괄 출결 처리** 기능
- **휴강 신청 및 관리**: 사정으로 인한 휴강 신청 (보강은 개강 마지막날 뒤로 자동 연장)
- **연차/월차 관리**: 입사일, 남은 연차 확인 및 휴강 신청 내역 조회
- 휴강 신청 승인/거절 알림 확인 (새로운 답변 시 알림 점 표시)

#### 관리자(SUPER_ADMIN 등)

- 전체 사용자 CRUD 및 권한 관리
- 전체 클래스 관리 (개설/수정/비활성화)
- 전체 출결 통계 대시보드
- 출석률 경고 대상 학생 모니터링 및 알림 발송
- **휴강 신청 관리**: 선생님의 휴강 신청 승인/거절 처리
- **시스템 설정**: 폰트 설정 (Pretendard, Noto Sans KR, Nanum Gothic, 시스템 기본)

#### 공통

- 다크/라이트 모드 지원
- 반응형 디자인(PC/모바일)
- 카카오/네이버 소셜 로그인
- 이메일 기반 비밀번호 초기화/재설정
- **커스텀 출석 기간 설정**: 클래스별 개강일자와 단위기간(periodDays) 설정 가능
- **지각 3번 = 결석 1번** 자동 계산 로직
- **클래스 상태 관리**: 개강준비단계, 개강, 폐강, 수료 또는 정상종료 상태 관리

#### 환경변수 설정

```bash
# 데이터베이스
DATABASE_URL="postgresql://..."

# 인증
JWT_SECRET="your-secret-key"

# 서버
PORT=4000
CLIENT_URL="http://localhost:3000"

# 소셜 로그인 (선택)
KAKAO_CLIENT_ID=""
NAVER_CLIENT_ID=""
NAVER_CLIENT_SECRET=""

# 이메일 (선택)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM=""
```

### 사용 라이브러리

#### Frontend

| 라이브러리       | 용도          |
| ---------------- | ------------- |
| react            | UI 컴포넌트   |
| react-router-dom | 페이지 라우팅 |
| axios            | API 통신      |
| recharts         | 출석률 차트   |
| react-hot-toast  | 알림 메시지   |
| date-fns         | 날짜 포맷팅   |
| clsx             | 조건부 클래스 |
| sass             | CSS 전처리기  |

#### Backend

| 라이브러리     | 용도                     |
| -------------- | ------------------------ |
| express        | 웹 서버                  |
| @prisma/client | 데이터베이스 ORM         |
| jsonwebtoken   | JWT 인증                 |
| bcryptjs       | 비밀번호 해시            |
| nodemailer     | 이메일 발송              |
| multer         | 파일 업로드(프로필 사진) |
| zod            | 입력값 검증              |
| cors           | CORS 처리                |

### API 엔드포인트

### 인증

| Method | Endpoint                 | 설명            |
| ------ | ------------------------ | --------------- |
| POST   | /api/auth/register       | 회원가입        |
| POST   | /api/auth/login          | 로그인          |
| GET    | /api/auth/me             | 내 정보 조회    |
| PUT    | /api/auth/password       | 비밀번호 변경   |
| POST   | /api/auth/reset-password | 비밀번호 재설정 |
| GET    | /api/auth/kakao          | 카카오 로그인   |
| GET    | /api/auth/naver          | 네이버 로그인   |

### 사용자

| Method | Endpoint       | 설명        |
| ------ | -------------- | ----------- |
| GET    | /api/users     | 사용자 목록 |
| GET    | /api/users/:id | 사용자 상세 |
| PUT    | /api/users/:id | 사용자 수정 |
| DELETE | /api/users/:id | 사용자 삭제 |

### 클래스

| Method | Endpoint                      | 설명              |
| ------ | ----------------------------- | ----------------- |
| GET    | /api/classes                  | 클래스 목록       |
| POST   | /api/classes                  | 클래스 생성       |
| GET    | /api/classes/:id              | 클래스 상세       |
| PUT    | /api/classes/:id              | 클래스 수정       |
| POST   | /api/classes/:id/seats        | 좌석 설정         |
| PUT    | /api/classes/:id/seats/:seatId | 좌석 배정/해제    |
| DELETE | /api/classes/:id/withdraw     | 학생 수강 철회    |
| POST   | /api/classes/:id/reset-period | 기간 초기화       |

### 출결

| Method | Endpoint             | 설명           |
| ------ | -------------------- | -------------- |
| GET    | /api/attendance      | 출결 조회      |
| GET    | /api/attendance/my   | 내 출결(학생)  |
| POST   | /api/attendance      | 출결 기록      |
| POST   | /api/attendance/bulk | 일괄 출결 처리 |

### 통계

| Method | Endpoint               | 설명                    |
| ------ | ---------------------- | ----------------------- |
| GET    | /api/stats/overview    | 전체 통계               |
| GET    | /api/stats/class/:id   | 클래스 통계 (휴강/보강 정보 포함) |
| GET    | /api/stats/student/:id | 학생 통계               |

### 휴강 신청

| Method | Endpoint                      | 설명              |
| ------ | ----------------------------- | ----------------- |
| POST   | /api/cancellation             | 휴강 신청 생성    |
| GET    | /api/cancellation/my          | 내 휴강 신청 조회 |
| GET    | /api/cancellation             | 전체 휴강 신청 조회 (관리자) |
| PUT    | /api/cancellation/:id/approve | 휴강 신청 승인    |
| PUT    | /api/cancellation/:id/reject  | 휴강 신청 거절    |
| DELETE | /api/cancellation/:id         | 휴강 신청 삭제    |

### 설정

| Method | Endpoint        | 설명         |
| ------ | --------------- | ------------ |
| GET    | /api/settings   | 설정 조회    |
| PUT    | /api/settings   | 설정 업데이트 |

### 프로젝트 구조

```

vibe-attendance-system/
├── client/ # React 프론트엔드
│ ├── src/
│ │ ├── components/ # 재사용 컴포넌트
│ │ ├── pages/ # 페이지 컴포넌트
│ │ ├── contexts/ # React Context
│ │ ├── services/ # API 호출 레이어
│ │ └── styles/ # SASS 스타일
│ └── package.json
├── server/ # Express 백엔드
│ ├── src/
│ │ ├── routes/ # API 라우트
│ │ ├── middlewares/ # 미들웨어
│ │ └── lib/ # 유틸리티/공용 모듈
│ ├── prisma/
│ │ └── schema.prisma # DB 스키마
│ └── package.json
└── README.md

```

### 라이선스

MIT License

Copyright (c) 2025 KWON TEAM
