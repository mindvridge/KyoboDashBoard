# VR 로그 수집 및 대시보드 시스템

Unity VR 앱에서 사용자 행동 로그를 수집하고 분석하는 웹 시스템입니다.

## 시스템 개요

- **백엔드**: Node.js + Express + TypeScript
- **프론트엔드**: Next.js + TypeScript + Tailwind CSS
- **데이터베이스**: PostgreSQL + Redis
- **실시간 통신**: Socket.io
- **Unity SDK**: C# 클래스

## 주요 기능

### 로그 수집
- 세션 시작/종료
- 콘텐츠 선택 및 시청 기록
- 로비 체류 시간
- 콘텐츠 전환 이벤트

### 대시보드
- 실시간 현황 모니터링
- 일별/주별/월별 통계
- 인기 콘텐츠 분석
- CSV 데이터 내보내기

## 빠른 시작

### Docker를 사용한 실행

```bash
# 환경 변수 설정
cp .env.example .env

# Docker Compose로 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f
```

### 개발 환경 설정

```bash
# 백엔드 설정
cd backend
npm install
cp .env.example .env
npm run migrate
npm run dev

# 프론트엔드 설정 (새 터미널)
cd frontend
npm install
npm run dev
```

## 접속 URL

- **대시보드**: http://localhost:3000
- **API**: http://localhost:3001/api
- **API 헬스체크**: http://localhost:3001/api/health

## API 엔드포인트

### 기기 관리
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | /api/devices/register | 기기 자동 등록/로그인 |
| GET | /api/devices | 전체 기기 목록 |
| GET | /api/devices/active | 활성 기기 목록 |

### 세션 관리
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | /api/sessions/start | 세션 시작 |
| POST | /api/sessions/end | 세션 종료 |
| GET | /api/sessions/active | 활성 세션 목록 |

### 로그 기록
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | /api/logs/content-select | 콘텐츠 선택 로그 |
| POST | /api/logs/content-watch | 시청 이벤트 로그 |
| GET | /api/logs | 로그 조회 |

### 통계
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /api/stats/dashboard | 대시보드 통계 |
| GET | /api/stats/popular | 인기 콘텐츠 |
| GET | /api/stats/export/sessions | 세션 데이터 내보내기 |

## Unity 연동

### 설치

1. `unity-sdk/VRLogger.cs` 파일을 Unity 프로젝트의 `Assets/Scripts/` 폴더에 복사
2. 빈 GameObject에 `VRLogger` 컴포넌트 추가
3. Inspector에서 서버 URL 설정

### 기본 사용법

```csharp
using VRLogDashboard;

// 자동 로그인 (Start에서 자동 호출됨)
await VRLogger.Instance.AutoLogin();

// 콘텐츠 선택 로그
await VRLogger.Instance.LogContentSelect("video-001", "한강 VR 투어");

// 시청 시작
await VRLogger.Instance.LogWatchStart("video-001", "한강 VR 투어");

// 시청 종료 (시청 시간 포함)
await VRLogger.Instance.LogWatchEnd("video-001", "한강 VR 투어", 180f);

// 세션 종료
await VRLogger.Instance.LogSessionEnd(lobbyTimeSeconds);
```

### 이벤트 구독

```csharp
VRLogger.Instance.OnLoginComplete += (success) => {
    Debug.Log($"로그인: {success}");
};

VRLogger.Instance.OnSessionStarted += (sessionId) => {
    Debug.Log($"세션 시작: {sessionId}");
};

VRLogger.Instance.OnError += (error) => {
    Debug.LogError($"에러: {error}");
};
```

## 데이터베이스 스키마

### spaces (공간)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | Primary Key |
| name | VARCHAR(255) | 공간 이름 |
| location | VARCHAR(500) | 위치 |

### devices (기기)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | Primary Key |
| device_id | VARCHAR(255) | 기기 식별자 |
| mac_address | VARCHAR(50) | MAC 주소 |
| space_id | UUID | 공간 FK |

### sessions (세션)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | Primary Key |
| device_id | UUID | 기기 FK |
| start_time | TIMESTAMP | 시작 시간 |
| end_time | TIMESTAMP | 종료 시간 |
| duration | INTEGER | 세션 시간(초) |

### content_logs (콘텐츠 로그)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | Primary Key |
| session_id | UUID | 세션 FK |
| content_id | VARCHAR(255) | 콘텐츠 ID |
| content_name | VARCHAR(500) | 콘텐츠 이름 |
| action_type | VARCHAR(50) | 이벤트 유형 |
| timestamp | TIMESTAMP | 이벤트 시간 |
| duration | INTEGER | 시청 시간(초) |

## 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| DB_HOST | PostgreSQL 호스트 | localhost |
| DB_PORT | PostgreSQL 포트 | 5432 |
| DB_NAME | 데이터베이스 이름 | vr_logs |
| DB_USER | 데이터베이스 사용자 | postgres |
| DB_PASSWORD | 데이터베이스 비밀번호 | - |
| REDIS_URL | Redis 연결 URL | redis://localhost:6379 |
| JWT_SECRET | JWT 서명 키 | - |
| CORS_ORIGIN | 허용 Origin | http://localhost:3000 |

## 프로젝트 구조

```
vr-log-dashboard/
├── backend/                 # 백엔드 API
│   ├── src/
│   │   ├── config/         # 설정 파일
│   │   ├── controllers/    # 컨트롤러
│   │   ├── middleware/     # 미들웨어
│   │   ├── models/         # 데이터 모델
│   │   ├── routes/         # 라우트
│   │   ├── services/       # 비즈니스 로직
│   │   └── types/          # 타입 정의
│   └── Dockerfile
├── frontend/               # 프론트엔드 대시보드
│   ├── app/               # Next.js App Router
│   ├── components/        # React 컴포넌트
│   ├── hooks/             # Custom Hooks
│   └── Dockerfile
├── unity-sdk/              # Unity SDK
│   ├── VRLogger.cs        # 메인 로거 클래스
│   └── VRLoggerExample.cs # 사용 예제
├── database/               # 데이터베이스
│   └── migrations/        # SQL 마이그레이션
├── nginx/                  # Nginx 설정
└── docker-compose.yml
```

## 라이선스

Private - All Rights Reserved
