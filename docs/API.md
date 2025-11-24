# VR 로그 대시보드 API 문서

## 인증

대부분의 API는 JWT 토큰 인증이 필요합니다.

### 헤더 형식
```
Authorization: Bearer <token>
```

### 토큰 획득
기기 등록 API를 통해 토큰을 획득합니다.

---

## 기기 API

### POST /api/devices/register
기기 자동 등록 및 로그인

**Request Body:**
```json
{
  "device_id": "VR-DEVICE-001",
  "mac_address": "AA:BB:CC:DD:EE:FF",
  "space_id": "uuid (optional)",
  "device_name": "Quest 3 #1 (optional)",
  "model": "Meta Quest 3 (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "device": {
      "id": "uuid",
      "device_id": "VR-DEVICE-001",
      "mac_address": "AA:BB:CC:DD:EE:FF",
      "space_id": "uuid",
      "is_active": true
    },
    "token": "jwt-token",
    "is_new_device": true
  }
}
```

---

## 세션 API

### POST /api/sessions/start
새 세션 시작 (인증 필요)

**Response:**
```json
{
  "success": true,
  "data": {
    "session_id": "uuid",
    "start_time": "2024-01-15T10:00:00Z"
  }
}
```

### POST /api/sessions/end
세션 종료 (인증 필요)

**Request Body:**
```json
{
  "session_id": "uuid",
  "lobby_time": 120
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "session_id": "uuid",
    "duration": 1200,
    "content_count": 3
  }
}
```

---

## 로그 API

### POST /api/logs/content-select
콘텐츠 선택 로그 (인증 필요)

**Request Body:**
```json
{
  "session_id": "uuid",
  "content_id": "video-001",
  "content_name": "한강 VR 투어",
  "metadata": {}
}
```

### POST /api/logs/content-watch
시청 이벤트 로그 (인증 필요)

**Request Body:**
```json
{
  "session_id": "uuid",
  "content_id": "video-001",
  "content_name": "한강 VR 투어",
  "action_type": "WATCH_START | WATCH_END | WATCH_PAUSE | WATCH_RESUME",
  "duration": 180
}
```

### GET /api/logs
로그 조회

**Query Parameters:**
- `start_date`: 시작일 (ISO 8601)
- `end_date`: 종료일 (ISO 8601)
- `space_id`: 공간 ID (optional)
- `device_id`: 기기 ID (optional)
- `content_id`: 콘텐츠 ID (optional)
- `action_type`: 이벤트 유형 (optional)
- `limit`: 결과 수 제한 (optional)
- `offset`: 페이지 오프셋 (optional)

---

## 통계 API

### GET /api/stats/dashboard
대시보드 실시간 통계

**Response:**
```json
{
  "success": true,
  "data": {
    "active_sessions": 5,
    "total_sessions_today": 42,
    "total_watch_time_today": 12600,
    "popular_contents": [
      {
        "content_id": "video-001",
        "content_name": "한강 VR 투어",
        "view_count": 25,
        "total_watch_time": 4500
      }
    ],
    "space_stats": [...],
    "hourly_sessions": [...]
  }
}
```

### GET /api/stats/export/sessions
세션 데이터 CSV 내보내기

**Query Parameters:**
- `start_date`: 시작일
- `end_date`: 종료일
- `format`: "csv" 또는 "json"

---

## 에러 응답

모든 에러는 다음 형식으로 반환됩니다:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "에러 메시지"
  }
}
```

### 에러 코드
| 코드 | HTTP Status | 설명 |
|------|-------------|------|
| UNAUTHORIZED | 401 | 인증 필요 |
| NOT_FOUND | 404 | 리소스 없음 |
| VALIDATION_ERROR | 400 | 입력값 오류 |
| RATE_LIMIT_EXCEEDED | 429 | 요청 한도 초과 |
| INTERNAL_ERROR | 500 | 서버 오류 |
