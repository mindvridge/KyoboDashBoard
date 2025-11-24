using System.Collections;
using UnityEngine;
using VRLogDashboard;

/// <summary>
/// VR Logger 사용 예제 스크립트
/// 실제 VR 앱에서 이 클래스를 참고하여 구현하세요.
/// </summary>
public class VRLoggerExample : MonoBehaviour
{
    [Header("Content Info")]
    [SerializeField] private string currentContentId;
    [SerializeField] private string currentContentName;

    private float watchStartTime;
    private float lobbyEnterTime;
    private bool isWatching = false;

    private void Start()
    {
        // VRLogger 이벤트 구독
        VRLogger.Instance.OnLoginComplete += OnLoginComplete;
        VRLogger.Instance.OnSessionStarted += OnSessionStarted;
        VRLogger.Instance.OnSessionEnded += OnSessionEnded;
        VRLogger.Instance.OnError += OnLoggerError;

        // 로비 입장 시간 기록
        lobbyEnterTime = Time.time;
    }

    private void OnDestroy()
    {
        // 이벤트 구독 해제
        if (VRLogger.Instance != null)
        {
            VRLogger.Instance.OnLoginComplete -= OnLoginComplete;
            VRLogger.Instance.OnSessionStarted -= OnSessionStarted;
            VRLogger.Instance.OnSessionEnded -= OnSessionEnded;
            VRLogger.Instance.OnError -= OnLoggerError;
        }
    }

    #region VRLogger Event Handlers

    private void OnLoginComplete(bool success)
    {
        if (success)
        {
            Debug.Log("VR Logger: 로그인 성공!");
            // 로비 입장 로그
            _ = VRLogger.Instance.LogLobbyEnter();
        }
        else
        {
            Debug.LogError("VR Logger: 로그인 실패!");
        }
    }

    private void OnSessionStarted(string sessionId)
    {
        Debug.Log($"VR Logger: 세션 시작됨 - {sessionId}");
    }

    private void OnSessionEnded()
    {
        Debug.Log("VR Logger: 세션 종료됨");
    }

    private void OnLoggerError(string error)
    {
        Debug.LogError($"VR Logger 에러: {error}");
    }

    #endregion

    #region Content Selection Example

    /// <summary>
    /// 사용자가 콘텐츠를 선택했을 때 호출
    /// </summary>
    public async void OnContentSelected(string contentId, string contentName)
    {
        // 이전 콘텐츠 시청 중이었다면 전환 로그
        if (!string.IsNullOrEmpty(currentContentId) && currentContentId != contentId)
        {
            await VRLogger.Instance.LogContentSwitch(currentContentId, contentId, contentName);
        }

        currentContentId = contentId;
        currentContentName = contentName;

        // 콘텐츠 선택 로그
        await VRLogger.Instance.LogContentSelect(contentId, contentName);

        // 로비 퇴장 로그
        await VRLogger.Instance.LogLobbyExit();

        Debug.Log($"콘텐츠 선택됨: {contentName}");
    }

    #endregion

    #region Video Playback Example

    /// <summary>
    /// 비디오 재생 시작 시 호출
    /// </summary>
    public async void OnVideoPlayStart()
    {
        if (string.IsNullOrEmpty(currentContentId))
        {
            Debug.LogWarning("콘텐츠가 선택되지 않았습니다.");
            return;
        }

        watchStartTime = Time.time;
        isWatching = true;

        await VRLogger.Instance.LogWatchStart(currentContentId, currentContentName);
        Debug.Log("비디오 재생 시작");
    }

    /// <summary>
    /// 비디오 재생 종료 시 호출
    /// </summary>
    public async void OnVideoPlayEnd()
    {
        if (!isWatching) return;

        float watchDuration = Time.time - watchStartTime;
        isWatching = false;

        await VRLogger.Instance.LogWatchEnd(currentContentId, currentContentName, watchDuration);
        Debug.Log($"비디오 재생 종료, 시청 시간: {watchDuration:F1}초");
    }

    /// <summary>
    /// 비디오 일시정지 시 호출
    /// </summary>
    public async void OnVideoPause()
    {
        if (!isWatching) return;

        await VRLogger.Instance.LogWatchPause(currentContentId, currentContentName);
        Debug.Log("비디오 일시정지");
    }

    /// <summary>
    /// 비디오 재생 재개 시 호출
    /// </summary>
    public async void OnVideoResume()
    {
        if (!isWatching) return;

        await VRLogger.Instance.LogWatchResume(currentContentId, currentContentName);
        Debug.Log("비디오 재생 재개");
    }

    #endregion

    #region Lobby Example

    /// <summary>
    /// 로비로 돌아갈 때 호출
    /// </summary>
    public async void OnReturnToLobby()
    {
        // 현재 시청 중이면 종료
        if (isWatching)
        {
            await OnVideoPlayEndAsync();
        }

        // 로비 입장 로그
        await VRLogger.Instance.LogLobbyEnter();
        lobbyEnterTime = Time.time;

        currentContentId = null;
        currentContentName = null;

        Debug.Log("로비로 돌아감");
    }

    private async System.Threading.Tasks.Task OnVideoPlayEndAsync()
    {
        if (!isWatching) return;

        float watchDuration = Time.time - watchStartTime;
        isWatching = false;

        await VRLogger.Instance.LogWatchEnd(currentContentId, currentContentName, watchDuration);
    }

    #endregion

    #region Session End Example

    /// <summary>
    /// 앱 종료 또는 로그아웃 시 호출
    /// </summary>
    public async void OnAppExit()
    {
        // 현재 시청 중이면 종료
        if (isWatching)
        {
            await OnVideoPlayEndAsync();
        }

        // 로비 체류 시간 계산
        float lobbyTime = Time.time - lobbyEnterTime;

        // 세션 종료
        await VRLogger.Instance.LogSessionEnd(lobbyTime);

        Debug.Log($"앱 종료, 로비 체류 시간: {lobbyTime:F1}초");
    }

    #endregion

    #region Quick Integration Example

    /// <summary>
    /// 간단한 시청 시간 로그 예제
    /// 비디오 플레이어와 직접 연동할 때 사용
    /// </summary>
    public async void LogSimpleWatchTime(string contentId, float durationInSeconds)
    {
        await VRLogger.Instance.LogWatchTime(contentId, durationInSeconds);
    }

    #endregion
}
