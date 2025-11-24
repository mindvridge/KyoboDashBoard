# Unity 통합 가이드

## 개요

VR Logger SDK는 Unity VR 앱에서 사용자 행동을 추적하고 서버로 전송하는 클래스입니다.

## 설치

### 1. 파일 복사

`unity-sdk/VRLogger.cs` 파일을 Unity 프로젝트에 복사합니다:

```
Assets/
└── Scripts/
    └── VRLogDashboard/
        ├── VRLogger.cs
        └── VRLoggerExample.cs
```

### 2. 설정

1. Hierarchy에서 빈 GameObject 생성
2. VRLogger 컴포넌트 추가
3. Inspector에서 설정:
   - **Server URL**: 백엔드 서버 주소 (예: https://api.example.com)
   - **Device ID**: 자동 생성됨 (커스텀 가능)
   - **Space ID**: 공간 ID (관리자에게 문의)
   - **Auto Login**: 자동 로그인 활성화

## 기본 사용법

### 자동 로그인

VRLogger는 기본적으로 앱 시작 시 자동 로그인합니다:

```csharp
// VRLogger.cs에서 autoLogin = true (기본값)
```

### 수동 로그인

자동 로그인을 끄고 수동으로 제어할 수 있습니다:

```csharp
// Inspector에서 Auto Login 체크 해제 후
await VRLogger.Instance.AutoLogin();
```

## 콘텐츠 로깅

### 콘텐츠 선택

사용자가 콘텐츠를 선택했을 때:

```csharp
public async void OnContentButtonClicked(string contentId, string contentName)
{
    await VRLogger.Instance.LogContentSelect(contentId, contentName);
}
```

### 시청 기록

비디오 플레이어와 연동:

```csharp
using UnityEngine.Video;

public class VideoTracker : MonoBehaviour
{
    [SerializeField] private VideoPlayer videoPlayer;
    private string currentContentId;
    private string currentContentName;
    private float watchStartTime;

    private void Start()
    {
        videoPlayer.started += OnVideoStarted;
        videoPlayer.loopPointReached += OnVideoEnded;
    }

    public void PlayVideo(string contentId, string contentName, VideoClip clip)
    {
        currentContentId = contentId;
        currentContentName = contentName;
        videoPlayer.clip = clip;
        videoPlayer.Play();
    }

    private async void OnVideoStarted(VideoPlayer vp)
    {
        watchStartTime = Time.time;
        await VRLogger.Instance.LogWatchStart(currentContentId, currentContentName);
    }

    private async void OnVideoEnded(VideoPlayer vp)
    {
        float duration = Time.time - watchStartTime;
        await VRLogger.Instance.LogWatchEnd(currentContentId, currentContentName, duration);
    }
}
```

### 간편 시청 시간 로깅

비디오 종료 시 시청 시간만 기록:

```csharp
// 180초(3분) 시청 완료
await VRLogger.Instance.LogWatchTime("video-001", 180f);
```

## 세션 관리

### 자동 세션 관리

VRLogger는 다음 상황에서 자동으로 세션을 관리합니다:

- **앱 시작**: 로그인 후 자동 세션 시작
- **앱 일시정지** (홈 버튼): 세션 자동 종료
- **앱 재개**: 새 세션 자동 시작
- **앱 종료**: 세션 자동 종료

### 수동 세션 종료

특정 시점에 세션을 종료해야 할 때:

```csharp
// 로비 체류 시간 포함
float lobbyTime = CalculateLobbyTime();
await VRLogger.Instance.LogSessionEnd(lobbyTime);
```

## 이벤트 처리

### 콜백 등록

```csharp
private void Start()
{
    VRLogger.Instance.OnLoginComplete += HandleLogin;
    VRLogger.Instance.OnSessionStarted += HandleSessionStart;
    VRLogger.Instance.OnSessionEnded += HandleSessionEnd;
    VRLogger.Instance.OnError += HandleError;
}

private void HandleLogin(bool success)
{
    if (success)
    {
        // 로그인 성공 - UI 업데이트 등
        ShowMainMenu();
    }
    else
    {
        // 로그인 실패 - 재시도 또는 오프라인 모드
        ShowOfflineWarning();
    }
}

private void HandleError(string error)
{
    Debug.LogError($"VRLogger 에러: {error}");
    // 에러 표시 또는 로깅
}
```

## 로비 시간 추적

로비 체류 시간을 추적하는 예제:

```csharp
public class LobbyTracker : MonoBehaviour
{
    private float lobbyEnterTime;

    public async void OnEnterLobby()
    {
        lobbyEnterTime = Time.time;
        await VRLogger.Instance.LogLobbyEnter();
    }

    public async void OnExitLobby()
    {
        await VRLogger.Instance.LogLobbyExit();
    }

    public float GetLobbyTime()
    {
        return Time.time - lobbyEnterTime;
    }
}
```

## 콘텐츠 전환 추적

사용자가 콘텐츠 간 전환할 때:

```csharp
public async void SwitchContent(string newContentId, string newContentName)
{
    string previousContentId = currentContentId;

    // 이전 콘텐츠 시청 종료
    if (!string.IsNullOrEmpty(previousContentId))
    {
        await VRLogger.Instance.LogContentSwitch(
            previousContentId,
            newContentId,
            newContentName
        );
    }

    currentContentId = newContentId;
    currentContentName = newContentName;
}
```

## 오프라인 지원

VRLogger는 네트워크 오류 시 요청을 큐에 저장합니다.
네트워크 복구 시 자동으로 재전송됩니다.

## 디버깅

Inspector에서 `Enable Debug Logs`를 활성화하면 콘솔에 로그가 출력됩니다:

```
[VRLogger] Device registered: VR-DEVICE-001, New: false
[VRLogger] Session started: abc123-...
[VRLogger] Request failed: Network error
```

## 베스트 프랙티스

1. **싱글톤 사용**: `VRLogger.Instance`를 통해 접근
2. **async/await 사용**: 비동기 호출로 메인 스레드 블로킹 방지
3. **에러 처리**: `OnError` 이벤트로 에러 모니터링
4. **정확한 시청 시간**: 일시정지 시간 제외하여 계산
5. **세션 종료**: 앱 종료 전 반드시 세션 종료 확인

## 문제 해결

### 로그인 실패
- 서버 URL 확인
- 네트워크 연결 확인
- 콘솔 에러 메시지 확인

### 로그 전송 실패
- JWT 토큰 만료 확인 (24시간)
- 세션 활성 상태 확인
- 서버 상태 확인

### 빌드 오류
- .NET 4.x 호환성 확인
- async/await 지원 확인
