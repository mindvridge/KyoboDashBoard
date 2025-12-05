# VRLogger Unity SDK 사용 가이드

> **버전:** 1.1.0
> **최종 업데이트:** 2025-12-05
> **서버:** https://kyobodashboard-production.up.railway.app

---

## 목차

1. [개요](#1-개요)
2. [설치](#2-설치)
3. [Inspector 설정](#3-inspector-설정)
4. [기본 사용법](#4-기본-사용법)
5. [API 레퍼런스](#5-api-레퍼런스)
6. [이벤트](#6-이벤트)
7. [로컬 저장 기능](#7-로컬-저장-기능)
8. [예제 코드](#8-예제-코드)
9. [자동 동작 흐름](#9-자동-동작-흐름)
10. [문제 해결](#10-문제-해결)

---

## 1. 개요

VRLogger는 VR 앱에서 사용자 행동 로그를 수집하고 대시보드 서버로 전송하는 Unity SDK입니다.

### 주요 기능

| 기능 | 설명 |
|------|------|
| 자동 기기 등록 | 앱 시작 시 자동으로 기기 등록 및 로그인 |
| 세션 관리 | 자동 세션 시작/종료 |
| 콘텐츠 로깅 | 선택, 시청, 일시정지 등 이벤트 기록 |
| 로컬 저장 | 네트워크 오류 시 로컬에 저장 |
| 자동 재전송 | 네트워크 복구 시 자동 재전송 |
| Heartbeat | 60초마다 서버에 활성 상태 전송 |

---

## 2. 설치

### 2.1 파일 복사

`VRLogger.cs` 파일을 Unity 프로젝트에 복사합니다:

```
Assets/
└── Scripts/
    └── VRLogDashboard/
        └── VRLogger.cs
```

### 2.2 의존성

- `KyoboDashboard` 네임스페이스의 `DashboardVideoLoader` 클래스 필요
- Unity 2019.4 이상 권장

### 2.3 씬 설정

씬에 빈 GameObject를 생성하고 `VRLogger` 컴포넌트를 추가합니다.
또는 코드에서 `VRLogger.Instance`를 호출하면 자동 생성됩니다.

---

## 3. Inspector 설정

```
┌─────────────────────────────────────────────────────────┐
│ VRLogger (Script)                                       │
├─────────────────────────────────────────────────────────┤
│ Server Configuration                                    │
│   Server Url     https://kyobodashboard-production...   │
├─────────────────────────────────────────────────────────┤
│ Device Configuration                                    │
│   Device Id      (비워두면 자동 생성)                     │
├─────────────────────────────────────────────────────────┤
│ Settings                                                │
│   Auto Login              ☑ (체크 권장)                  │
│   Heartbeat Interval      60 (초)                       │
│   Enable Debug Logs       ☑ (개발 중 체크)               │
├─────────────────────────────────────────────────────────┤
│ Local Storage Settings                                  │
│   Max Retry Count         3 (재시도 횟수)                │
│   Network Check Interval  10 (초)                       │
└─────────────────────────────────────────────────────────┘
```

### 설정 항목 설명

| 항목 | 기본값 | 설명 |
|------|--------|------|
| Server Url | Railway URL | 대시보드 서버 주소 |
| Device Id | 자동 생성 | 기기 고유 식별자 (비워두면 `SystemInfo.deviceUniqueIdentifier` 사용) |
| Auto Login | true | 앱 시작 시 자동 로그인 |
| Heartbeat Interval | 60 | Heartbeat 전송 간격 (초) |
| Enable Debug Logs | true | 콘솔 로그 출력 여부 |
| Max Retry Count | 3 | 전송 실패 시 최대 재시도 횟수 |
| Network Check Interval | 10 | 네트워크 상태 확인 간격 (초) |

---

## 4. 기본 사용법

### 4.1 자동 모드 (권장)

Inspector에서 `Auto Login`을 체크하면 모든 것이 자동으로 처리됩니다:

```csharp
// 콘텐츠 선택 시
VRLogger.Instance.LogContentSelect(contentId);

// 시청 종료 시
VRLogger.Instance.LogWatchEnd(contentId, contentName, duration);
```

### 4.2 수동 모드

```csharp
// 수동 로그인
await VRLogger.Instance.AutoLogin();

// 세션 시작
await VRLogger.Instance.StartSession();

// 콘텐츠 로깅
await VRLogger.Instance.LogWatchStart(contentId, contentName);
VRLogger.Instance.LogWatchEnd(contentId, contentName, duration);

// 세션 종료
await VRLogger.Instance.LogSessionEnd(lobbyTime);
```

---

## 5. API 레퍼런스

### 5.1 Properties

| Property | Type | 설명 |
|----------|------|------|
| `Instance` | VRLogger | 싱글톤 인스턴스 |
| `IsLoggedIn` | bool | 로그인 여부 |
| `HasActiveSession` | bool | 활성 세션 여부 |
| `CurrentSessionId` | string | 현재 세션 ID |
| `ServerUrl` | string | 서버 URL (get/set) |
| `currentVideoID` | int | 현재 비디오 ID |

### 5.2 인증 메서드

```csharp
// 자동 로그인 (기기 등록 + 세션 시작)
Task<bool> AutoLogin()
Task<bool> AutoLogin(string deviceId)
```

### 5.3 세션 메서드

```csharp
// 세션 시작
Task<bool> StartSession()

// 세션 종료
Task<bool> LogSessionEnd(float lobbyTimeSeconds = 0)
```

### 5.4 콘텐츠 로깅 메서드

```csharp
// 콘텐츠 선택 (간편 메서드 - Fire and Forget)
void LogContentSelect(int contentId)

// 콘텐츠 선택 (async 버전)
Task<bool> LogContentSelectAsync(string contentId, string contentName, Dictionary<string, object> metadata = null)
Task<bool> LogContentSelect(string contentId, string contentName, Dictionary<string, object> metadata = null)

// 시청 시작
Task<bool> LogWatchStart(string contentId, string contentName)

// 시청 종료 (간편 메서드 - Fire and Forget)
void LogWatchEnd(string contentId, string contentName, float durationSeconds)

// 시청 종료 (async 버전)
Task<bool> LogWatchEndAsync(string contentId, string contentName, float durationSeconds)

// 콘텐츠 전환
Task<bool> LogContentSwitch(string fromContentId, string toContentId, string toContentName)
```

### 5.5 로컬 저장 메서드

```csharp
// 대기 중인 로그 개수
int GetPendingLogCount()

// 대기 중인 로그 수동 전송
Task<bool> FlushPendingLogs()
```

### 5.6 비디오 헬퍼 메서드

```csharp
// 현재 비디오 정보 가져오기
DashboardVideoLoader.Video GetVideoFileNameByID()
```

---

## 6. 이벤트

```csharp
// 로그인 완료
public event Action<bool> OnLoginComplete;

// 세션 시작
public event Action<string> OnSessionStarted;

// 세션 종료
public event Action OnSessionEnded;

// 에러 발생
public event Action<string> OnError;

// 대기 중인 로그 개수 변경
public event Action<int> OnPendingLogsChanged;
```

### 이벤트 구독 예제

```csharp
void Start()
{
    VRLogger.Instance.OnLoginComplete += OnLogin;
    VRLogger.Instance.OnSessionStarted += OnSession;
    VRLogger.Instance.OnError += OnLogError;
    VRLogger.Instance.OnPendingLogsChanged += OnPendingChanged;
}

void OnLogin(bool success)
{
    Debug.Log(success ? "로그인 성공" : "로그인 실패");
}

void OnSession(string sessionId)
{
    Debug.Log($"세션 시작: {sessionId}");
}

void OnLogError(string error)
{
    Debug.LogError($"VRLogger 에러: {error}");
}

void OnPendingChanged(int count)
{
    // UI 업데이트
    pendingText.text = $"대기: {count}";
}
```

---

## 7. 로컬 저장 기능

### 7.1 자동 동작

| 상황 | 동작 |
|------|------|
| 전송 실패 | 3회 재시도 후 로컬에 저장 |
| 앱 종료 | 대기 중인 로그 로컬에 저장 |
| 앱 백그라운드 | 대기 중인 로그 로컬에 저장 |
| 앱 재시작 | 로컬 로그 자동 로드 |
| 로그인 성공 | 대기 중인 로그 자동 재전송 |
| 네트워크 복구 | 10초마다 확인 후 자동 재전송 |

### 7.2 저장 파일 위치

| 플랫폼 | 경로 |
|--------|------|
| Android/Quest | `/storage/emulated/0/Android/data/[패키지명]/files/pending_logs.json` |
| Windows | `C:\Users\[사용자]\AppData\LocalLow\[회사명]\[앱이름]\pending_logs.json` |
| Mac | `~/Library/Application Support/[회사명]/[앱이름]/pending_logs.json` |

### 7.3 수동 제어

```csharp
// 대기 중인 로그 개수 확인
int count = VRLogger.Instance.GetPendingLogCount();

// 수동으로 대기 중인 로그 전송
bool success = await VRLogger.Instance.FlushPendingLogs();
```

---

## 8. 예제 코드

### 8.1 기본 비디오 플레이어 연동

```csharp
using UnityEngine;
using VRLogDashboard;

public class VideoPlayerController : MonoBehaviour
{
    private string currentContentId;
    private string currentContentName;
    private float watchStartTime;

    public void OnVideoSelected(int id, string name)
    {
        currentContentId = id.ToString();
        currentContentName = name;

        // 간편 메서드 (Fire and Forget)
        VRLogger.Instance.LogContentSelect(id);
    }

    public async void OnVideoStart()
    {
        watchStartTime = Time.time;
        await VRLogger.Instance.LogWatchStart(currentContentId, currentContentName);
    }

    public void OnVideoEnd()
    {
        float duration = Time.time - watchStartTime;
        // 간편 메서드 (Fire and Forget)
        VRLogger.Instance.LogWatchEnd(currentContentId, currentContentName, duration);
    }

    // async 버전이 필요한 경우
    public async void OnVideoEndAsync()
    {
        float duration = Time.time - watchStartTime;
        bool success = await VRLogger.Instance.LogWatchEndAsync(currentContentId, currentContentName, duration);
        if (!success)
        {
            Debug.LogWarning("시청 종료 로그 전송 실패 - 로컬에 저장됨");
        }
    }
}
```

### 8.2 전송 상태 UI

```csharp
using UnityEngine;
using UnityEngine.UI;
using VRLogDashboard;

public class LogStatusUI : MonoBehaviour
{
    [SerializeField] private Text statusText;
    [SerializeField] private Button retryButton;
    [SerializeField] private GameObject pendingIndicator;

    void Start()
    {
        VRLogger.Instance.OnPendingLogsChanged += UpdateUI;
        VRLogger.Instance.OnLoginComplete += OnLogin;

        retryButton.onClick.AddListener(OnRetryClick);

        UpdateUI(VRLogger.Instance.GetPendingLogCount());
    }

    void OnLogin(bool success)
    {
        statusText.text = success ? "연결됨" : "연결 실패";
    }

    void UpdateUI(int count)
    {
        pendingIndicator.SetActive(count > 0);
        statusText.text = count > 0 ? $"대기: {count}개" : "전송 완료";
        retryButton.gameObject.SetActive(count > 0);
    }

    async void OnRetryClick()
    {
        retryButton.interactable = false;
        statusText.text = "전송 중...";

        bool success = await VRLogger.Instance.FlushPendingLogs();

        statusText.text = success ? "전송 완료" : "전송 실패";
        retryButton.interactable = true;
    }

    void OnDestroy()
    {
        VRLogger.Instance.OnPendingLogsChanged -= UpdateUI;
        VRLogger.Instance.OnLoginComplete -= OnLogin;
    }
}
```

---

## 9. 자동 동작 흐름

### 9.1 앱 시작

```
┌──────────────────────────────────────┐
│            앱 시작                    │
│               ↓                       │
│   로컬 저장된 로그 로드                │
│               ↓                       │
│   네트워크 모니터링 시작               │
│               ↓                       │
│   AutoLogin (기기 등록)               │
│               ↓                       │
│         세션 시작                     │
│               ↓                       │
│   대기 중인 로그 자동 재전송           │
│               ↓                       │
│   Heartbeat 시작 (60초 간격)          │
└──────────────────────────────────────┘
```

### 9.2 로그 전송 실패

```
┌──────────────────────────────────────┐
│        로그 전송 실패                 │
│               ↓                       │
│         3회 재시도                    │
│               ↓                       │
│   실패 → pending_logs.json 저장       │
│               ↓                       │
│   네트워크 복구 시 자동 재전송         │
└──────────────────────────────────────┘
```

### 9.3 앱 라이프사이클

```
┌──────────────────────────────────────┐
│   앱 백그라운드 / 종료                │
│               ↓                       │
│   대기 중인 로그 로컬에 저장           │
│               ↓                       │
│         세션 종료                     │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│        앱 포그라운드                  │
│               ↓                       │
│   대기 중인 로그 재전송 시도           │
│               ↓                       │
│   새 세션 시작 (필요 시)              │
└──────────────────────────────────────┘
```

---

## 10. 문제 해결

### 10.1 로그인 실패

```
[VRLogger] AutoLogin failed: ...
```

**해결책:**
- 서버 URL 확인
- 인터넷 연결 확인
- 서버 상태 확인

### 10.2 세션 시작 실패

```
[VRLogger] Cannot start session: Not logged in
```

**해결책:**
- `AutoLogin`이 완료된 후 호출
- `IsLoggedIn` 프로퍼티 확인

### 10.3 로그 전송 실패

```
[VRLogger] Request failed after 3 retries, saved locally
```

**해결책:**
- 네트워크 연결 확인
- 서버 상태 확인
- `FlushPendingLogs()`로 수동 재전송

### 10.4 디버그 로그 확인

Inspector에서 `Enable Debug Logs`를 체크하면 상세 로그 확인 가능:

```
[VRLogger] Local log file path: /storage/.../pending_logs.json
[VRLogger] Device registered: abc123, New: true
[VRLogger] Session started: session-uuid-here
[VRLogger] Log sent successfully: /api/logs/content-watch
```

---

## 부록: 서버 API 엔드포인트

| 엔드포인트 | 메서드 | 설명 |
|------------|--------|------|
| `/api/devices/register` | POST | 기기 등록 |
| `/api/devices/heartbeat` | POST | Heartbeat |
| `/api/sessions/start` | POST | 세션 시작 |
| `/api/sessions/end` | POST | 세션 종료 |
| `/api/logs/content-select` | POST | 콘텐츠 선택 |
| `/api/logs/content-watch` | POST | 시청 이벤트 |
| `/api/logs/content-switch` | POST | 콘텐츠 전환 |
