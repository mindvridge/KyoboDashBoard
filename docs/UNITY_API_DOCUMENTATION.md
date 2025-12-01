# KyoboDashBoard Unity API 문서

> VR 로그 수집 대시보드 시스템을 위한 Unity 클라이언트 통합 가이드

---

## 목차

1. [개요](#1-개요)
2. [시작하기](#2-시작하기)
3. [VRLogger SDK 사용법](#3-vrlogger-sdk-사용법)
4. [API 엔드포인트 레퍼런스](#4-api-엔드포인트-레퍼런스)
5. [데이터 모델](#5-데이터-모델)
6. [인증 시스템](#6-인증-시스템)
7. [WebSocket 실시간 통신](#7-websocket-실시간-통신)
8. [에러 처리](#8-에러-처리)
9. [베스트 프랙티스](#9-베스트-프랙티스)
10. [비디오 콘텐츠 API](#10-비디오-콘텐츠-api)

---

## 1. 개요

### 1.1 시스템 소개

KyoboDashBoard는 VR 애플리케이션에서 사용자 행동 로그를 수집하고 분석하는 시스템입니다.

**주요 기능:**
- 디바이스 등록 및 관리
- 세션 추적 (시작/종료)
- 콘텐츠 시청 로그 수집
- 실시간 통계 및 대시보드

### 1.2 서버 정보

| 환경 | Base URL |
|------|----------|
| 개발 | `http://localhost:3001/api` |
| 프로덕션 | `https://kyobodashboard-production.up.railway.app/api` |

### 1.3 기술 스택

- **백엔드**: Node.js + Express + TypeScript
- **데이터베이스**: PostgreSQL + Redis
- **인증**: JWT (Bearer Token)
- **실시간**: Socket.io

---

## 2. 시작하기

### 2.1 Unity SDK 설치

1. `unity-sdk` 폴더의 파일을 Unity 프로젝트에 복사:
   - `VRLogger.cs` - 메인 SDK 클래스
   - `VRLoggerExample.cs` - 사용 예제

2. 빈 GameObject에 `VRLogger` 컴포넌트 추가

3. Inspector에서 설정 구성

### 2.2 Inspector 설정

```
Server Configuration
├── Server Url: "https://kyobodashboard-production.up.railway.app"

Device Configuration
├── Device Id: (자동 생성, 비워두면 SystemInfo.deviceUniqueIdentifier 사용)
├── Mac Address: (자동 생성)
├── Space Id: "공간 UUID" (선택사항)
├── Device Name: "PICO 4 Ultra - 1호기"
└── Model: "PICO 4 Ultra"

Settings
├── Auto Login: ✓ (체크 시 자동 로그인)
├── Heartbeat Interval: 60 (초)
└── Enable Debug Logs: ✓
```

### 2.3 빠른 시작 예제

```csharp
using VRLogDashboard;
using UnityEngine;

public class QuickStart : MonoBehaviour
{
    void Start()
    {
        // 이벤트 구독
        VRLogger.Instance.OnLoginComplete += (success) => {
            Debug.Log($"로그인 결과: {success}");
        };

        VRLogger.Instance.OnSessionStarted += (sessionId) => {
            Debug.Log($"세션 시작: {sessionId}");
        };

        // Auto Login이 활성화되어 있으면 자동으로 시작됨
    }

    // 콘텐츠 선택 시
    public async void OnSelectContent(string id, string name)
    {
        await VRLogger.Instance.LogContentSelect(id, name);
    }

    // 비디오 재생 시작
    public async void OnPlayStart(string id, string name)
    {
        await VRLogger.Instance.LogWatchStart(id, name);
    }

    // 비디오 재생 종료
    public async void OnPlayEnd(string id, string name, float duration)
    {
        await VRLogger.Instance.LogWatchEnd(id, name, duration);
    }

    // 앱 종료 시
    public async void OnQuit()
    {
        await VRLogger.Instance.LogSessionEnd();
    }
}
```

---

## 3. VRLogger SDK 사용법

### 3.1 싱글톤 접근

```csharp
// VRLogger는 싱글톤 패턴으로 구현
VRLogger.Instance.메서드명();
```

### 3.2 속성 (Properties)

| 속성 | 타입 | 설명 |
|------|------|------|
| `IsLoggedIn` | bool | 디바이스 인증 완료 여부 |
| `HasActiveSession` | bool | 활성 세션 존재 여부 |
| `CurrentSessionId` | string | 현재 세션 UUID |
| `ServerUrl` | string | 서버 URL (get/set) |

### 3.3 이벤트 (Events)

```csharp
// 로그인 완료 (성공/실패)
VRLogger.Instance.OnLoginComplete += (bool success) => { };

// 세션 시작
VRLogger.Instance.OnSessionStarted += (string sessionId) => { };

// 세션 종료
VRLogger.Instance.OnSessionEnded += () => { };

// 에러 발생
VRLogger.Instance.OnError += (string errorMessage) => { };
```

### 3.4 메서드 상세

#### 디바이스 관리

```csharp
/// <summary>
/// 자동 로그인 (디바이스 등록 + 세션 시작)
/// Inspector 설정값 사용
/// </summary>
Task<bool> AutoLogin()

/// <summary>
/// 지정된 정보로 자동 로그인
/// </summary>
/// <param name="deviceId">고유 디바이스 ID</param>
/// <param name="macAddress">MAC 주소</param>
Task<bool> AutoLogin(string deviceId, string macAddress)
```

#### 세션 관리

```csharp
/// <summary>
/// 새 세션 시작
/// 기존 활성 세션이 있으면 자동 종료 후 시작
/// </summary>
Task<bool> StartSession()

/// <summary>
/// 세션 종료
/// </summary>
/// <param name="lobbyTimeSeconds">로비 체류 시간 (초)</param>
Task<bool> LogSessionEnd(float lobbyTimeSeconds = 0)
```

#### 콘텐츠 로깅

```csharp
/// <summary>
/// 콘텐츠 선택 이벤트 로그
/// </summary>
/// <param name="contentId">콘텐츠 ID</param>
/// <param name="contentName">콘텐츠 이름</param>
/// <param name="metadata">추가 메타데이터 (선택)</param>
Task<bool> LogContentSelect(
    string contentId,
    string contentName,
    Dictionary<string, object> metadata = null
)

/// <summary>
/// 콘텐츠 시청 시작
/// </summary>
Task<bool> LogWatchStart(string contentId, string contentName)

/// <summary>
/// 콘텐츠 시청 종료
/// </summary>
/// <param name="durationSeconds">시청 시간 (초)</param>
Task<bool> LogWatchEnd(string contentId, string contentName, float durationSeconds)

/// <summary>
/// 콘텐츠 일시정지
/// </summary>
Task<bool> LogWatchPause(string contentId, string contentName)

/// <summary>
/// 콘텐츠 재생 재개
/// </summary>
Task<bool> LogWatchResume(string contentId, string contentName)

/// <summary>
/// 간편 시청 시간 로그 (content_name 없이)
/// </summary>
Task<bool> LogWatchTime(string contentId, float durationSeconds)

/// <summary>
/// 콘텐츠 전환 이벤트
/// </summary>
Task<bool> LogContentSwitch(
    string fromContentId,
    string toContentId,
    string toContentName
)
```

#### 로비 이벤트

```csharp
/// <summary>
/// 로비 입장
/// </summary>
Task<bool> LogLobbyEnter()

/// <summary>
/// 로비 퇴장
/// </summary>
Task<bool> LogLobbyExit()
```

---

## 4. API 엔드포인트 레퍼런스

### 4.1 디바이스 관리

#### POST `/api/devices/register` - 디바이스 등록/로그인

**인증**: 불필요

**요청 (Request)**
```json
{
    "device_id": "pico4_abc123def456",
    "mac_address": "02:1A:2B:3C:4D:5E",
    "space_id": "550e8400-e29b-41d4-a716-446655440000",
    "device_name": "PICO 4 Ultra - 1호기",
    "model": "PICO 4 Ultra"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| device_id | string | ✓ | 고유 디바이스 식별자 |
| mac_address | string | ✓ | MAC 주소 |
| space_id | string | - | 공간 UUID |
| device_name | string | - | 디바이스 표시 이름 |
| model | string | - | 디바이스 모델명 |

**응답 (Response)** - 201 Created / 200 OK
```json
{
    "success": true,
    "data": {
        "device": {
            "id": "550e8400-e29b-41d4-a716-446655440001",
            "device_id": "pico4_abc123def456",
            "mac_address": "02:1A:2B:3C:4D:5E",
            "space_id": "550e8400-e29b-41d4-a716-446655440000",
            "device_name": "PICO 4 Ultra - 1호기",
            "model": "PICO 4 Ultra",
            "is_active": true,
            "last_seen": "2024-12-01T10:30:00Z",
            "created_at": "2024-12-01T10:30:00Z"
        },
        "token": "eyJhbGciOiJIUzI1NiIs...",
        "is_new_device": true
    }
}
```

---

#### POST `/api/devices/heartbeat` - 하트비트

**인증**: 필요 (Bearer Token)

디바이스가 온라인 상태임을 서버에 알립니다. 60초 간격으로 호출 권장.

**요청**
```json
{}
```

**응답** - 200 OK
```json
{
    "success": true,
    "message": "Heartbeat received",
    "timestamp": "2024-12-01T10:35:00Z"
}
```

---

#### GET `/api/devices` - 디바이스 목록

**인증**: 불필요

**쿼리 파라미터**
| 파라미터 | 타입 | 설명 |
|----------|------|------|
| space_id | string | 공간 UUID 필터 |

**응답** - 200 OK
```json
{
    "success": true,
    "data": [
        {
            "id": "UUID",
            "device_id": "pico4_abc123",
            "device_name": "PICO 4 Ultra - 1호기",
            "model": "PICO 4 Ultra",
            "is_active": true,
            "last_seen": "2024-12-01T10:30:00Z"
        }
    ]
}
```

---

### 4.2 세션 관리

#### POST `/api/sessions/start` - 세션 시작

**인증**: 필요 (Bearer Token)

**요청**
```json
{}
```

**응답** - 201 Created
```json
{
    "success": true,
    "data": {
        "session_id": "550e8400-e29b-41d4-a716-446655440002",
        "start_time": "2024-12-01T10:40:00Z"
    }
}
```

---

#### POST `/api/sessions/end` - 세션 종료

**인증**: 필요 (Bearer Token)

**요청**
```json
{
    "session_id": "550e8400-e29b-41d4-a716-446655440002",
    "lobby_time": 180
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| session_id | string | ✓ | 세션 UUID |
| lobby_time | number | - | 로비 체류 시간 (초, 0~86400) |

**응답** - 200 OK
```json
{
    "success": true,
    "data": {
        "session_id": "550e8400-e29b-41d4-a716-446655440002",
        "duration": 3600,
        "content_count": 5
    }
}
```

---

#### GET `/api/sessions/active` - 활성 세션 목록

**인증**: 불필요

**응답** - 200 OK
```json
{
    "success": true,
    "data": [
        {
            "id": "UUID",
            "device_id": "UUID",
            "device_info": "pico4_abc123",
            "space_name": "Room A",
            "start_time": "2024-12-01T10:40:00Z",
            "is_active": true,
            "current_duration": 300
        }
    ],
    "count": 1
}
```

---

#### GET `/api/sessions/:id` - 세션 상세 (로그 포함)

**인증**: 불필요

**응답** - 200 OK
```json
{
    "success": true,
    "data": {
        "session": {
            "id": "UUID",
            "device_id": "UUID",
            "start_time": "2024-12-01T10:40:00Z",
            "end_time": "2024-12-01T11:40:00Z",
            "duration": 3600,
            "lobby_time": 180,
            "is_active": false
        },
        "logs": [
            {
                "id": "UUID",
                "content_id": "video-001",
                "content_name": "한강 VR 투어",
                "action_type": "SELECT",
                "timestamp": "2024-12-01T10:42:00Z",
                "duration": null
            }
        ]
    }
}
```

---

### 4.3 콘텐츠 로깅

#### POST `/api/logs/content-select` - 콘텐츠 선택

**인증**: 필요 (Bearer Token)

**요청**
```json
{
    "session_id": "550e8400-e29b-41d4-a716-446655440002",
    "content_id": "video-001",
    "content_name": "한강 VR 투어",
    "metadata": {
        "battery": 85,
        "fps": 72
    }
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| session_id | string | ✓ | 세션 UUID |
| content_id | string | ✓ | 콘텐츠 ID (max 255자) |
| content_name | string | ✓ | 콘텐츠 이름 (max 500자) |
| metadata | object | - | 추가 데이터 (max 10KB) |

**응답** - 201 Created
```json
{
    "success": true,
    "data": {
        "log_id": "550e8400-e29b-41d4-a716-446655440010"
    }
}
```

---

#### POST `/api/logs/content-watch` - 시청 이벤트

**인증**: 필요 (Bearer Token)

**요청**
```json
{
    "session_id": "550e8400-e29b-41d4-a716-446655440002",
    "content_id": "video-001",
    "content_name": "한강 VR 투어",
    "action_type": "WATCH_END",
    "duration": 1020,
    "metadata": {
        "quality": "high"
    }
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| session_id | string | ✓ | 세션 UUID |
| content_id | string | ✓ | 콘텐츠 ID |
| content_name | string | ✓ | 콘텐츠 이름 |
| action_type | string | ✓ | WATCH_START / WATCH_END / WATCH_PAUSE / WATCH_RESUME |
| duration | number | - | 시청 시간 (초), WATCH_END 시 필수 |
| metadata | object | - | 추가 데이터 |

---

#### POST `/api/logs/content-switch` - 콘텐츠 전환

**인증**: 필요 (Bearer Token)

**요청**
```json
{
    "session_id": "550e8400-e29b-41d4-a716-446655440002",
    "from_content_id": "video-001",
    "to_content_id": "video-002",
    "to_content_name": "서울 타임랩스"
}
```

---

#### POST `/api/logs/lobby` - 로비 이벤트

**인증**: 필요 (Bearer Token)

**요청**
```json
{
    "session_id": "550e8400-e29b-41d4-a716-446655440002",
    "action_type": "LOBBY_ENTER",
    "duration": 180
}
```

---

### 4.4 통계 조회

#### GET `/api/stats/dashboard` - 대시보드 요약

**인증**: 불필요

**응답** - 200 OK
```json
{
    "success": true,
    "data": {
        "total_devices": 25,
        "active_devices": 12,
        "today_sessions": 45,
        "active_sessions": 8,
        "avg_session_duration": 1800,
        "total_content_views": 156,
        "popular_contents": [
            {
                "content_id": "video-001",
                "content_name": "한강 VR 투어",
                "view_count": 45,
                "total_watch_time": 54000,
                "avg_watch_time": 1200
            }
        ]
    }
}
```

---

#### GET `/api/stats/popular` - 인기 콘텐츠

**인증**: 불필요

**쿼리 파라미터**
| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| limit | number | 10 | 결과 수 (max 100) |
| start_date | string | - | 시작일 (ISO 8601) |
| end_date | string | - | 종료일 (ISO 8601) |

---

#### GET `/api/logs/content/:contentId/stats` - 콘텐츠 통계

**인증**: 불필요

**응답** - 200 OK
```json
{
    "success": true,
    "data": {
        "total_views": 450,
        "watch_start_count": 420,
        "watch_complete_count": 380,
        "total_watch_time": 456000,
        "avg_watch_time": 1200
    }
}
```

---

### 4.5 공간 관리

#### GET `/api/spaces` - 공간 목록

**인증**: 불필요

**응답** - 200 OK
```json
{
    "success": true,
    "data": [
        {
            "id": "UUID",
            "name": "Room A",
            "location": "Building 1, Floor 2",
            "description": "Main VR room",
            "device_count": 5,
            "active_sessions": 2
        }
    ]
}
```

---

### 4.6 헬스 체크

#### GET `/api/health` - 서버 상태

**응답** - 200 OK
```json
{
    "success": true,
    "status": "healthy",
    "timestamp": "2024-12-01T10:35:00Z"
}
```

---

## 5. 데이터 모델

### 5.1 Device (디바이스)

```csharp
[Serializable]
public class Device
{
    public string id;           // UUID (서버 생성)
    public string device_id;    // 고유 디바이스 식별자
    public string mac_address;  // MAC 주소
    public string space_id;     // 공간 UUID
    public string device_name;  // 표시 이름
    public string model;        // 디바이스 모델
    public bool is_active;      // 활성 상태
    public string last_seen;    // 마지막 활동 시간 (ISO 8601)
    public string created_at;   // 생성 시간
    public string updated_at;   // 수정 시간
}
```

### 5.2 Session (세션)

```csharp
[Serializable]
public class Session
{
    public string id;           // UUID
    public string device_id;    // 디바이스 UUID
    public string start_time;   // 시작 시간 (ISO 8601)
    public string end_time;     // 종료 시간 (null if active)
    public int duration;        // 총 시간 (초)
    public int lobby_time;      // 로비 체류 시간 (초)
    public bool is_active;      // 활성 상태
}
```

### 5.3 ContentLog (콘텐츠 로그)

```csharp
[Serializable]
public class ContentLog
{
    public string id;           // UUID
    public string session_id;   // 세션 UUID
    public string content_id;   // 콘텐츠 ID
    public string content_name; // 콘텐츠 이름
    public string action_type;  // 액션 타입 (아래 참조)
    public string timestamp;    // 이벤트 시간 (ISO 8601)
    public int? duration;       // 시청 시간 (초, nullable)
}
```

### 5.4 Action Types (액션 타입)

| 타입 | 설명 | 사용 시점 |
|------|------|----------|
| `SELECT` | 콘텐츠 선택 | 사용자가 콘텐츠를 선택했을 때 |
| `WATCH_START` | 시청 시작 | 비디오 재생 시작 |
| `WATCH_END` | 시청 종료 | 비디오 재생 종료 |
| `WATCH_PAUSE` | 일시정지 | 비디오 일시정지 |
| `WATCH_RESUME` | 재생 재개 | 일시정지 후 재개 |
| `CONTENT_SWITCH` | 콘텐츠 전환 | 다른 콘텐츠로 이동 |
| `LOBBY_ENTER` | 로비 입장 | 메인 로비로 이동 |
| `LOBBY_EXIT` | 로비 퇴장 | 콘텐츠 선택하여 이동 |

---

## 6. 인증 시스템

### 6.1 인증 흐름

```
1. 디바이스 등록 (POST /api/devices/register)
           ↓
2. JWT 토큰 수신 (response.token)
           ↓
3. 토큰 저장 (VRLogger가 자동 관리)
           ↓
4. 인증 필요 API 호출 시 자동 포함
   Authorization: Bearer <token>
```

### 6.2 JWT 토큰 구조

```javascript
{
  "device_id": "pico4_abc123",
  "space_id": "550e8400-...",
  "iat": 1701424200,  // 발급 시간
  "exp": 1701510600   // 만료 시간 (24시간)
}
```

### 6.3 토큰 만료 처리

토큰은 기본 24시간 유효합니다. 만료 시:

```csharp
// 401 Unauthorized 응답 시 재로그인
VRLogger.Instance.OnError += (error) => {
    if (error.Contains("401") || error.Contains("Unauthorized"))
    {
        // 재로그인
        _ = VRLogger.Instance.AutoLogin();
    }
};
```

### 6.4 인증 필요 엔드포인트

| 엔드포인트 | 인증 필요 |
|------------|:---------:|
| POST /api/devices/register | - |
| POST /api/devices/heartbeat | ✓ |
| POST /api/sessions/start | ✓ |
| POST /api/sessions/end | ✓ |
| POST /api/logs/* | ✓ |
| GET /api/* (조회) | - |

---

## 7. WebSocket 실시간 통신

### 7.1 연결

```csharp
// Socket.IO 클라이언트 사용 시
var socket = IO.Socket("wss://kyobodashboard-production.up.railway.app");

// 이벤트 구독
socket.Emit("subscribe", "stats_updates");
```

### 7.2 실시간 이벤트

```csharp
// 이벤트 수신
socket.On("event", (data) => {
    var eventData = JsonUtility.FromJson<RealtimeEvent>(data.ToString());

    switch (eventData.type)
    {
        case "SESSION_START":
            // 세션 시작됨
            break;
        case "SESSION_END":
            // 세션 종료됨
            break;
        case "CONTENT_WATCH":
            // 콘텐츠 시청 이벤트
            break;
        case "DEVICE_ONLINE":
        case "DEVICE_OFFLINE":
            // 디바이스 상태 변경
            break;
        case "STATS_UPDATE":
            // 통계 업데이트
            break;
        case "ALERT":
            // 시스템 알림
            break;
    }
});
```

### 7.3 이벤트 데이터 구조

```csharp
[Serializable]
public class RealtimeEvent
{
    public string type;
    public string timestamp;
    public object data;
}

// SESSION_START 데이터
[Serializable]
public class SessionStartEvent
{
    public string session_id;
    public string device_id;
    public string device_info;
    public string start_time;
}

// CONTENT_WATCH 데이터
[Serializable]
public class ContentWatchEvent
{
    public string log_id;
    public string session_id;
    public string content_id;
    public string content_name;
    public string action_type;
    public int duration;
}
```

---

## 8. 에러 처리

### 8.1 HTTP 상태 코드

| 코드 | 의미 | 처리 방법 |
|------|------|----------|
| 200 | 성공 | 정상 처리 |
| 201 | 생성됨 | 리소스 생성 완료 |
| 400 | 잘못된 요청 | 입력값 검증 |
| 401 | 인증 실패 | 재로그인 |
| 404 | 찾을 수 없음 | 리소스 확인 |
| 409 | 충돌 | 이미 존재 |
| 429 | 요청 과다 | 대기 후 재시도 |
| 500 | 서버 에러 | 재시도 |

### 8.2 에러 응답 형식

```json
{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "입력값이 잘못되었습니다",
        "errors": {
            "duration": ["Duration must be between 0 and 86400"],
            "content_id": ["Content ID is required"]
        }
    }
}
```

### 8.3 에러 코드

| 코드 | 설명 |
|------|------|
| VALIDATION_ERROR | 입력값 검증 실패 |
| NOT_FOUND | 리소스 없음 |
| UNAUTHORIZED | 인증 필요/실패 |
| CONFLICT | 리소스 충돌 |
| RATE_LIMIT_EXCEEDED | 요청 한도 초과 |
| DATABASE_ERROR | DB 오류 |
| INTERNAL_ERROR | 서버 내부 오류 |

### 8.4 Unity에서 에러 처리

```csharp
VRLogger.Instance.OnError += (errorMessage) => {
    Debug.LogError($"VRLogger Error: {errorMessage}");

    // UI에 에러 표시
    ShowErrorToast(errorMessage);

    // 필요시 재시도 로직
    if (errorMessage.Contains("Network"))
    {
        StartCoroutine(RetryAfterDelay());
    }
};
```

### 8.5 Rate Limiting

| 엔드포인트 | 제한 | 윈도우 |
|------------|------|--------|
| 일반 API | 100회 | 15분 |
| 디바이스 등록 | 10회 | 1시간 |
| 로깅 | 120회 | 1분 |

---

## 9. 베스트 프랙티스

### 9.1 디바이스 등록

```csharp
// 1. 고유 식별자 사용
string deviceId = SystemInfo.deviceUniqueIdentifier;

// 2. 토큰 안전하게 저장 (VRLogger가 메모리에서 관리)
// PlayerPrefs에 저장 시 암호화 권장

// 3. 공간(Space) 할당
// 첫 등록 시 space_id 지정
```

### 9.2 세션 관리

```csharp
// 1. 앱 시작 시 자동 세션 시작 (AutoLogin이 처리)

// 2. 앱 종료 시 반드시 세션 종료
void OnApplicationQuit()
{
    // VRLogger가 자동으로 처리하지만 명시적 호출 권장
    _ = VRLogger.Instance.LogSessionEnd(lobbyTime);
}

// 3. 백그라운드 전환 시 세션 관리
void OnApplicationPause(bool pauseStatus)
{
    // VRLogger가 자동 처리 (종료/시작)
}
```

### 9.3 로깅 최적화

```csharp
// 1. 일관된 content_id 사용
const string CONTENT_HANGANG = "video-001";
const string CONTENT_SEOUL = "video-002";

// 2. 정확한 시청 시간 기록
float watchStartTime;

void OnPlayStart()
{
    watchStartTime = Time.time;
    _ = VRLogger.Instance.LogWatchStart(contentId, contentName);
}

void OnPlayEnd()
{
    float duration = Time.time - watchStartTime;
    _ = VRLogger.Instance.LogWatchEnd(contentId, contentName, duration);
}

// 3. 메타데이터 활용
var metadata = new Dictionary<string, object>
{
    { "battery", SystemInfo.batteryLevel * 100 },
    { "fps", 1f / Time.deltaTime },
    { "quality", QualitySettings.GetQualityLevel() }
};
await VRLogger.Instance.LogContentSelect(id, name, metadata);
```

### 9.4 하트비트

```csharp
// VRLogger가 자동으로 60초 간격 하트비트 전송
// Inspector에서 heartbeatInterval 조정 가능

// 커스텀 간격이 필요한 경우:
// Inspector > Heartbeat Interval = 30 (30초)
```

### 9.5 오프라인 처리

```csharp
// VRLogger는 자동으로 요청을 큐에 저장
// 네트워크 복구 시 자동 재전송

// 수동 재시도 구현 (선택사항)
IEnumerator RetryWithBackoff()
{
    int[] delays = { 2, 4, 8, 16 };

    for (int i = 0; i < delays.Length; i++)
    {
        yield return new WaitForSeconds(delays[i]);

        bool success = await TryOperation();
        if (success) yield break;
    }
}
```

### 9.6 전체 통합 예제

```csharp
using System.Collections.Generic;
using UnityEngine;
using VRLogDashboard;

public class VRAppManager : MonoBehaviour
{
    [Header("Content")]
    [SerializeField] private string currentContentId;
    [SerializeField] private string currentContentName;

    private float watchStartTime;
    private float lobbyEnterTime;
    private bool isWatching;

    void Start()
    {
        // 이벤트 구독
        VRLogger.Instance.OnLoginComplete += OnLoginComplete;
        VRLogger.Instance.OnSessionStarted += OnSessionStarted;
        VRLogger.Instance.OnSessionEnded += OnSessionEnded;
        VRLogger.Instance.OnError += OnError;

        // 로비 입장 시간 기록
        lobbyEnterTime = Time.time;
    }

    void OnDestroy()
    {
        // 이벤트 구독 해제
        if (VRLogger.Instance != null)
        {
            VRLogger.Instance.OnLoginComplete -= OnLoginComplete;
            VRLogger.Instance.OnSessionStarted -= OnSessionStarted;
            VRLogger.Instance.OnSessionEnded -= OnSessionEnded;
            VRLogger.Instance.OnError -= OnError;
        }
    }

    // 콘텐츠 선택
    public async void SelectContent(string id, string name)
    {
        // 이전 콘텐츠가 있으면 전환 로그
        if (!string.IsNullOrEmpty(currentContentId))
        {
            if (isWatching)
            {
                float duration = Time.time - watchStartTime;
                await VRLogger.Instance.LogWatchEnd(currentContentId, currentContentName, duration);
                isWatching = false;
            }
            await VRLogger.Instance.LogContentSwitch(currentContentId, id, name);
        }

        currentContentId = id;
        currentContentName = name;

        // 콘텐츠 선택 로그
        await VRLogger.Instance.LogContentSelect(id, name);

        // 로비 퇴장
        await VRLogger.Instance.LogLobbyExit();
    }

    // 비디오 재생 시작
    public async void StartPlayback()
    {
        watchStartTime = Time.time;
        isWatching = true;
        await VRLogger.Instance.LogWatchStart(currentContentId, currentContentName);
    }

    // 비디오 재생 종료
    public async void StopPlayback()
    {
        if (!isWatching) return;

        float duration = Time.time - watchStartTime;
        isWatching = false;
        await VRLogger.Instance.LogWatchEnd(currentContentId, currentContentName, duration);
    }

    // 로비로 복귀
    public async void ReturnToLobby()
    {
        if (isWatching)
        {
            await StopPlaybackAsync();
        }

        await VRLogger.Instance.LogLobbyEnter();
        lobbyEnterTime = Time.time;

        currentContentId = null;
        currentContentName = null;
    }

    // 앱 종료
    public async void ExitApp()
    {
        if (isWatching)
        {
            await StopPlaybackAsync();
        }

        float lobbyTime = Time.time - lobbyEnterTime;
        await VRLogger.Instance.LogSessionEnd(lobbyTime);
    }

    private async System.Threading.Tasks.Task StopPlaybackAsync()
    {
        if (!isWatching) return;

        float duration = Time.time - watchStartTime;
        isWatching = false;
        await VRLogger.Instance.LogWatchEnd(currentContentId, currentContentName, duration);
    }

    // 이벤트 핸들러
    void OnLoginComplete(bool success)
    {
        Debug.Log($"Login: {(success ? "Success" : "Failed")}");
        if (success)
        {
            _ = VRLogger.Instance.LogLobbyEnter();
        }
    }

    void OnSessionStarted(string sessionId)
    {
        Debug.Log($"Session Started: {sessionId}");
    }

    void OnSessionEnded()
    {
        Debug.Log("Session Ended");
    }

    void OnError(string error)
    {
        Debug.LogError($"VRLogger Error: {error}");
    }
}
```

---

## 10. 비디오 콘텐츠 API

Unity에서 서버에 등록된 비디오 콘텐츠 목록을 조회할 수 있습니다.

### 10.1 비디오 목록 조회

#### GET `/api/videos/list` - 활성 비디오 목록 (Unity용)

**인증**: 불필요

**응답** - 200 OK
```json
{
    "success": true,
    "data": [
        {
            "id": "550e8400-e29b-41d4-a716-446655440001",
            "index": 1,
            "filename": "hangang_vr_tour.mp4",
            "title": "한강 VR 투어",
            "description": "서울 한강공원의 아름다운 풍경을 VR로 체험해보세요.",
            "file_url": "https://example.com/videos/hangang_vr_tour.mp4",
            "thumbnail_url": "https://example.com/thumbnails/hangang.jpg",
            "duration": 180,
            "file_size": 1073741824,
            "is_preinstalled": true
        },
        {
            "id": "550e8400-e29b-41d4-a716-446655440002",
            "index": 2,
            "filename": "seoul_timelapse.mp4",
            "title": "서울 타임랩스",
            "description": "서울의 하루를 4K 타임랩스 영상으로 감상하세요.",
            "file_url": "https://example.com/videos/seoul_timelapse.mp4",
            "thumbnail_url": "https://example.com/thumbnails/seoul.jpg",
            "duration": 240,
            "file_size": 2147483648,
            "is_preinstalled": false
        }
    ],
    "count": 2
}
```

---

#### GET `/api/videos/index/:index` - 인덱스로 비디오 조회

**인증**: 불필요

**파라미터**
| 파라미터 | 타입 | 설명 |
|----------|------|------|
| index | number | 비디오 고유 인덱스 번호 |

**응답** - 200 OK
```json
{
    "success": true,
    "data": {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "index": 1,
        "filename": "hangang_vr_tour.mp4",
        "title": "한강 VR 투어",
        "description": "서울 한강공원의 아름다운 풍경을 VR로 체험해보세요.",
        "file_url": "https://example.com/videos/hangang_vr_tour.mp4",
        "thumbnail_url": "https://example.com/thumbnails/hangang.jpg",
        "duration": 180,
        "file_size": 1073741824,
        "is_preinstalled": true
    }
}
```

---

#### GET `/api/videos/export` - JSON 파일로 내보내기

**인증**: 불필요

**쿼리 파라미터**
| 파라미터 | 타입 | 설명 |
|----------|------|------|
| active_only | boolean | true 시 활성 비디오만 |

**응답**: JSON 파일 다운로드

```json
[
    {
        "index": 1,
        "filename": "hangang_vr_tour.mp4",
        "title": "한강 VR 투어",
        "description": "서울 한강공원의 아름다운 풍경을 VR로 체험해보세요.",
        "file_url": "https://example.com/videos/hangang_vr_tour.mp4",
        "thumbnail_url": "https://example.com/thumbnails/hangang.jpg",
        "duration": 180,
        "file_size": 1073741824,
        "is_preinstalled": true
    }
]
```

---

### 10.2 Video 데이터 모델

```csharp
[Serializable]
public class Video
{
    public string id;           // UUID
    public int index;           // 고유 인덱스 (자동 증가)
    public string filename;     // 비디오 파일이름
    public string title;        // 비디오 타이틀
    public string description;  // 비디오 설명
    public string file_url;     // 파일 다운로드 URL
    public string thumbnail_url;// 썸네일 URL
    public int duration;        // 비디오 길이 (초)
    public long file_size;      // 파일 크기 (바이트)
    public bool is_preinstalled;// 디바이스 사전 설치 여부
}

[Serializable]
public class VideoListResponse
{
    public bool success;
    public Video[] data;
    public int count;
}
```

---

### 10.3 Unity에서 비디오 목록 조회 예제

```csharp
using System;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.Networking;

public class VideoManager : MonoBehaviour
{
    [SerializeField] private string serverUrl = "https://kyobodashboard-production.up.railway.app";

    private Video[] videos;

    async void Start()
    {
        await LoadVideoList();
    }

    /// <summary>
    /// 서버에서 비디오 목록을 불러옵니다.
    /// </summary>
    public async Task<bool> LoadVideoList()
    {
        try
        {
            string url = $"{serverUrl}/api/videos/list";

            using (var request = UnityWebRequest.Get(url))
            {
                var operation = request.SendWebRequest();

                while (!operation.isDone)
                    await Task.Yield();

                if (request.result == UnityWebRequest.Result.Success)
                {
                    var response = JsonUtility.FromJson<VideoListResponse>(request.downloadHandler.text);

                    if (response.success)
                    {
                        videos = response.data;
                        Debug.Log($"[VideoManager] {videos.Length}개 비디오 로드 완료");
                        return true;
                    }
                }

                Debug.LogError($"[VideoManager] 비디오 로드 실패: {request.error}");
                return false;
            }
        }
        catch (Exception ex)
        {
            Debug.LogError($"[VideoManager] 예외 발생: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// 인덱스로 비디오 정보를 가져옵니다.
    /// </summary>
    public Video GetVideoByIndex(int index)
    {
        if (videos == null) return null;

        foreach (var video in videos)
        {
            if (video.index == index)
                return video;
        }
        return null;
    }

    /// <summary>
    /// 모든 비디오 목록을 반환합니다.
    /// </summary>
    public Video[] GetAllVideos()
    {
        return videos;
    }

    /// <summary>
    /// 비디오 개수를 반환합니다.
    /// </summary>
    public int GetVideoCount()
    {
        return videos?.Length ?? 0;
    }
}

// 데이터 클래스
[Serializable]
public class Video
{
    public string id;
    public int index;
    public string filename;
    public string title;
    public string description;
    public string file_url;
    public string thumbnail_url;
    public int duration;
    public long file_size;
    public bool is_preinstalled;  // 디바이스 사전 설치 여부
}

[Serializable]
public class VideoListResponse
{
    public bool success;
    public Video[] data;
    public int count;
}
```

---

### 10.4 비디오 목록 UI 연동 예제

```csharp
using UnityEngine;
using UnityEngine.UI;

public class VideoListUI : MonoBehaviour
{
    [SerializeField] private VideoManager videoManager;
    [SerializeField] private Transform contentParent;
    [SerializeField] private GameObject videoItemPrefab;

    async void Start()
    {
        bool success = await videoManager.LoadVideoList();

        if (success)
        {
            DisplayVideoList();
        }
    }

    void DisplayVideoList()
    {
        var videos = videoManager.GetAllVideos();

        foreach (var video in videos)
        {
            var item = Instantiate(videoItemPrefab, contentParent);

            // UI 요소 설정
            item.transform.Find("IndexText").GetComponent<Text>().text = video.index.ToString();
            item.transform.Find("TitleText").GetComponent<Text>().text = video.title;
            item.transform.Find("DescriptionText").GetComponent<Text>().text = video.description;
            item.transform.Find("DurationText").GetComponent<Text>().text = FormatDuration(video.duration);

            // 클릭 이벤트
            var button = item.GetComponent<Button>();
            var capturedVideo = video;
            button.onClick.AddListener(() => OnVideoSelected(capturedVideo));
        }
    }

    void OnVideoSelected(Video video)
    {
        Debug.Log($"선택된 비디오: {video.title} (Index: {video.index})");

        // VRLogger로 콘텐츠 선택 로그
        _ = VRLogDashboard.VRLogger.Instance.LogContentSelect(
            video.index.ToString(),  // content_id로 index 사용
            video.title
        );
    }

    string FormatDuration(int seconds)
    {
        int mins = seconds / 60;
        int secs = seconds % 60;
        return $"{mins}:{secs:D2}";
    }
}
```

---

### 10.5 비디오 콘텐츠와 로깅 연동

```csharp
using VRLogDashboard;
using UnityEngine;

public class VideoPlayer : MonoBehaviour
{
    private Video currentVideo;
    private float watchStartTime;

    public async void PlayVideo(Video video)
    {
        currentVideo = video;
        watchStartTime = Time.time;

        // 콘텐츠 선택 로그
        await VRLogger.Instance.LogContentSelect(
            video.index.ToString(),
            video.title
        );

        // 시청 시작 로그
        await VRLogger.Instance.LogWatchStart(
            video.index.ToString(),
            video.title
        );

        // 실제 비디오 재생 시작...
    }

    public async void StopVideo()
    {
        if (currentVideo == null) return;

        float watchDuration = Time.time - watchStartTime;

        // 시청 종료 로그
        await VRLogger.Instance.LogWatchEnd(
            currentVideo.index.ToString(),
            currentVideo.title,
            watchDuration
        );

        currentVideo = null;
    }

    public async void SwitchVideo(Video newVideo)
    {
        if (currentVideo != null)
        {
            // 콘텐츠 전환 로그
            await VRLogger.Instance.LogContentSwitch(
                currentVideo.index.ToString(),
                newVideo.index.ToString(),
                newVideo.title
            );
        }

        await StopVideoAsync();
        PlayVideo(newVideo);
    }

    private async System.Threading.Tasks.Task StopVideoAsync()
    {
        if (currentVideo == null) return;

        float watchDuration = Time.time - watchStartTime;
        await VRLogger.Instance.LogWatchEnd(
            currentVideo.index.ToString(),
            currentVideo.title,
            watchDuration
        );
        currentVideo = null;
    }
}
```

---

## 부록

### A. API 문서 (Swagger)

- 개발: http://localhost:3001/api-docs
- 프로덕션: https://kyobodashboard-production.up.railway.app/api-docs

### B. 디버깅 팁

1. **Inspector에서 Enable Debug Logs 활성화**
2. **Console에서 [VRLogger] 태그 필터링**
3. **네트워크 모니터링 도구 사용 (Charles, Fiddler)**

### C. 문제 해결

| 문제 | 원인 | 해결 |
|------|------|------|
| 로그인 실패 | 서버 연결 불가 | 서버 URL 확인 |
| 세션 시작 안됨 | 로그인 안됨 | AutoLogin 확인 |
| 로그 전송 실패 | 세션 없음 | HasActiveSession 확인 |
| 401 에러 | 토큰 만료 | 재로그인 |

---

**문서 버전**: 1.2.0
**최종 수정**: 2025-12-01
**작성자**: KyoboDashBoard Team

### 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.2.0 | 2025-12-01 | 비디오 is_preinstalled (사전 설치 여부) 필드 추가 |
| 1.1.0 | 2024-12-01 | 비디오 콘텐츠 API 섹션 추가 |
| 1.0.0 | 2024-12-01 | 최초 문서 작성 |
