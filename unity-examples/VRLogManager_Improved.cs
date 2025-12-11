using UnityEngine;
using UnityEngine.Networking;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;

/// <summary>
/// 개선된 VR 로그 수집 매니저 - 네트워크 안정성 강화
///
/// 주요 개선사항:
/// 1. 오프라인 모드 지원 (인터넷 없이도 작동)
/// 2. 재연결 시 자동 복구
/// 3. 타임아웃 설정
/// 4. 재시도 제한
/// 5. 배치 전송
/// 6. 메모리 관리 개선
/// </summary>
public class VRLogManagerImproved : MonoBehaviour
{
    public static VRLogManagerImproved Instance { get; private set; }

    [Header("서버 설정")]
    [SerializeField] private string serverUrl = "https://your-api.railway.app";

    [Header("네트워크 설정")]
    [SerializeField] private int requestTimeout = 10; // 10초
    [SerializeField] private int maxRetries = 3;
    [SerializeField] private float retryDelay = 2f;
    [SerializeField] private int maxOfflineQueueSize = 5000;
    [SerializeField] private int batchSize = 50; // 한 번에 전송할 로그 수

    [Header("하트비트 설정")]
    [SerializeField] private float heartbeatInterval = 30f;
    [SerializeField] private int maxHeartbeatFailures = 5;

    [Header("디버그")]
    [SerializeField] private bool enableDebugLogs = true;

    // 상태
    private string deviceToken;
    private string sessionId;
    private bool isOnline = true;
    private bool isRegistered = false;
    private int heartbeatFailureCount = 0;

    // 오프라인 큐
    private Queue<LogEntry> offlineQueue = new Queue<LogEntry>();
    private const string OfflineQueueKey = "VRLog_OfflineQueue";
    private const string DeviceTokenKey = "VRLog_DeviceToken";

    // 통계
    private int totalLogsSent = 0;
    private int totalLogsFailed = 0;

    #region Unity Lifecycle

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
        DontDestroyOnLoad(gameObject);
    }

    private async void Start()
    {
        // 저장된 토큰 로드
        LoadDeviceToken();

        // 저장된 오프라인 큐 로드
        LoadOfflineQueue();

        // 디바이스 등록 (실패해도 계속 진행)
        await InitializeAsync();

        // 하트비트 시작
        StartCoroutine(HeartbeatCoroutine());

        // 오프라인 큐 처리
        StartCoroutine(ProcessOfflineQueueCoroutine());
    }

    private void OnApplicationPause(bool pause)
    {
        if (pause)
        {
            // 앱 일시정지 시 큐 저장
            SaveOfflineQueue();
        }
    }

    private async void OnApplicationQuit()
    {
        // 세션 종료 (실패해도 무시)
        await EndSessionAsync();

        // 큐 저장
        SaveOfflineQueue();
    }

    #endregion

    #region 초기화

    /// <summary>
    /// 비동기 초기화 - 실패해도 오프라인 모드로 작동
    /// </summary>
    private async Task InitializeAsync()
    {
        try
        {
            // 1. 디바이스 등록 (토큰이 없거나 만료된 경우)
            if (!isRegistered)
            {
                bool registered = await RegisterDeviceWithRetryAsync();
                if (!registered)
                {
                    LogWarning("디바이스 등록 실패 - 오프라인 모드로 작동");
                    isOnline = false;
                    return;
                }
            }

            // 2. 세션 시작
            bool sessionStarted = await StartSessionWithRetryAsync();
            if (!sessionStarted)
            {
                LogWarning("세션 시작 실패 - 오프라인 모드로 작동");
                isOnline = false;
                return;
            }

            isOnline = true;
            LogDebug("VRLogManager 초기화 완료");
        }
        catch (Exception ex)
        {
            LogError($"초기화 중 예외 발생: {ex.Message}");
            isOnline = false;
        }
    }

    #endregion

    #region 디바이스 등록

    /// <summary>
    /// 재시도를 포함한 디바이스 등록
    /// </summary>
    private async Task<bool> RegisterDeviceWithRetryAsync()
    {
        for (int attempt = 0; attempt < maxRetries; attempt++)
        {
            try
            {
                var result = await RegisterDeviceAsync();
                if (result)
                {
                    isRegistered = true;
                    SaveDeviceToken();
                    return true;
                }
            }
            catch (Exception ex)
            {
                LogWarning($"디바이스 등록 실패 (시도 {attempt + 1}/{maxRetries}): {ex.Message}");
            }

            if (attempt < maxRetries - 1)
            {
                await Task.Delay((int)(retryDelay * 1000 * Math.Pow(2, attempt)));
            }
        }
        return false;
    }

    private async Task<bool> RegisterDeviceAsync()
    {
        string deviceId = GetDeviceId();
        string macAddress = GetMacAddress();

        var requestData = new
        {
            device_id = deviceId,
            mac_address = macAddress,
            device_name = SystemInfo.deviceModel,
            model = "PICO 4 Ultra"
        };

        var response = await SendRequestAsync<RegisterResponse>(
            "/api/devices/register",
            "POST",
            requestData,
            useAuth: false
        );

        if (response != null && response.success)
        {
            deviceToken = response.token;
            LogDebug($"디바이스 등록 성공: {deviceId}");
            return true;
        }

        return false;
    }

    #endregion

    #region 세션 관리

    /// <summary>
    /// 재시도를 포함한 세션 시작
    /// </summary>
    private async Task<bool> StartSessionWithRetryAsync()
    {
        for (int attempt = 0; attempt < maxRetries; attempt++)
        {
            try
            {
                sessionId = await StartSessionAsync();
                if (!string.IsNullOrEmpty(sessionId))
                {
                    LogDebug($"세션 시작 성공: {sessionId}");
                    return true;
                }
            }
            catch (Exception ex)
            {
                LogWarning($"세션 시작 실패 (시도 {attempt + 1}/{maxRetries}): {ex.Message}");
            }

            if (attempt < maxRetries - 1)
            {
                await Task.Delay((int)(retryDelay * 1000));
            }
        }
        return false;
    }

    private async Task<string> StartSessionAsync()
    {
        if (!isRegistered) return null;

        var response = await SendRequestAsync<SessionResponse>(
            "/api/sessions/start",
            "POST",
            new { device_id = GetDeviceId() }
        );

        return response?.session_id;
    }

    private async Task EndSessionAsync()
    {
        if (string.IsNullOrEmpty(sessionId)) return;

        try
        {
            await SendRequestAsync<object>(
                "/api/sessions/end",
                "POST",
                new { session_id = sessionId }
            );
            LogDebug("세션 종료 완료");
        }
        catch (Exception ex)
        {
            LogWarning($"세션 종료 실패: {ex.Message}");
        }
    }

    #endregion

    #region 로그 전송

    /// <summary>
    /// 콘텐츠 로그 기록 (Public API)
    /// </summary>
    public void LogContent(string contentId, string contentName, string actionType, int? duration = null)
    {
        var logEntry = new LogEntry
        {
            session_id = sessionId,
            content_id = contentId,
            content_name = contentName,
            action_type = actionType,
            duration = duration,
            timestamp = DateTime.UtcNow.ToString("o")
        };

        // 온라인 상태면 즉시 전송, 오프라인이면 큐에 추가
        if (isOnline && !string.IsNullOrEmpty(sessionId))
        {
            _ = SendLogAsync(logEntry);
        }
        else
        {
            EnqueueLog(logEntry);
        }
    }

    /// <summary>
    /// 로그 전송 (재시도 포함)
    /// </summary>
    private async Task SendLogAsync(LogEntry logEntry)
    {
        try
        {
            var response = await SendRequestAsync<object>(
                "/api/logs/content",
                "POST",
                logEntry
            );

            if (response != null)
            {
                totalLogsSent++;
                LogDebug($"로그 전송 성공: {logEntry.action_type}");
            }
            else
            {
                // 전송 실패 → 큐에 추가
                EnqueueLog(logEntry);
                totalLogsFailed++;
            }
        }
        catch (Exception ex)
        {
            LogWarning($"로그 전송 실패: {ex.Message}");
            EnqueueLog(logEntry);
            totalLogsFailed++;
        }
    }

    #endregion

    #region 오프라인 큐 관리

    /// <summary>
    /// 오프라인 큐에 로그 추가
    /// </summary>
    private void EnqueueLog(LogEntry logEntry)
    {
        // 큐 크기 제한
        if (offlineQueue.Count >= maxOfflineQueueSize)
        {
            // 가장 오래된 로그 제거 (FIFO)
            offlineQueue.Dequeue();
            LogWarning($"오프라인 큐 용량 초과 - 오래된 로그 제거 (크기: {maxOfflineQueueSize})");
        }

        offlineQueue.Enqueue(logEntry);
        LogDebug($"오프라인 큐에 추가 (큐 크기: {offlineQueue.Count})");
    }

    /// <summary>
    /// 오프라인 큐 처리 코루틴 (주기적 실행)
    /// </summary>
    private IEnumerator ProcessOfflineQueueCoroutine()
    {
        while (true)
        {
            yield return new WaitForSeconds(60f); // 1분마다 체크

            if (isOnline && offlineQueue.Count > 0)
            {
                LogDebug($"오프라인 큐 처리 시작 (큐 크기: {offlineQueue.Count})");
                _ = ProcessOfflineQueueAsync();
            }
        }
    }

    /// <summary>
    /// 오프라인 큐 일괄 처리 (배치)
    /// </summary>
    private async Task ProcessOfflineQueueAsync()
    {
        if (offlineQueue.Count == 0) return;

        int processedCount = 0;
        int failedCount = 0;
        List<LogEntry> failedLogs = new List<LogEntry>();

        // 배치 단위로 처리
        int logsToProcess = Math.Min(batchSize, offlineQueue.Count);

        for (int i = 0; i < logsToProcess; i++)
        {
            if (offlineQueue.Count == 0) break;

            var logEntry = offlineQueue.Dequeue();

            try
            {
                var response = await SendRequestAsync<object>(
                    "/api/logs/content",
                    "POST",
                    logEntry
                );

                if (response != null)
                {
                    processedCount++;
                }
                else
                {
                    failedLogs.Add(logEntry);
                    failedCount++;
                }
            }
            catch (Exception ex)
            {
                LogWarning($"큐 처리 중 오류: {ex.Message}");
                failedLogs.Add(logEntry);
                failedCount++;
            }

            // 서버 부하 방지를 위한 딜레이
            await Task.Delay(100);
        }

        // 실패한 로그 다시 큐에 추가
        foreach (var log in failedLogs)
        {
            offlineQueue.Enqueue(log);
        }

        LogDebug($"오프라인 큐 처리 완료 - 성공: {processedCount}, 실패: {failedCount}, 남은 큐: {offlineQueue.Count}");
    }

    /// <summary>
    /// 오프라인 큐 저장 (PlayerPrefs)
    /// </summary>
    private void SaveOfflineQueue()
    {
        try
        {
            // 최대 1000개까지만 저장 (용량 제한)
            int saveCount = Math.Min(1000, offlineQueue.Count);
            var logsToSave = new List<LogEntry>();

            var tempQueue = new Queue<LogEntry>(offlineQueue);
            for (int i = 0; i < saveCount && tempQueue.Count > 0; i++)
            {
                logsToSave.Add(tempQueue.Dequeue());
            }

            string json = JsonUtility.ToJson(new LogEntryList { logs = logsToSave });
            PlayerPrefs.SetString(OfflineQueueKey, json);
            PlayerPrefs.Save();

            LogDebug($"오프라인 큐 저장 완료 ({logsToSave.Count}개)");
        }
        catch (Exception ex)
        {
            LogError($"오프라인 큐 저장 실패: {ex.Message}");
        }
    }

    /// <summary>
    /// 오프라인 큐 로드 (PlayerPrefs)
    /// </summary>
    private void LoadOfflineQueue()
    {
        try
        {
            if (PlayerPrefs.HasKey(OfflineQueueKey))
            {
                string json = PlayerPrefs.GetString(OfflineQueueKey);
                var data = JsonUtility.FromJson<LogEntryList>(json);

                if (data != null && data.logs != null)
                {
                    foreach (var log in data.logs)
                    {
                        offlineQueue.Enqueue(log);
                    }
                    LogDebug($"오프라인 큐 로드 완료 ({data.logs.Count}개)");
                }

                // 로드 후 삭제
                PlayerPrefs.DeleteKey(OfflineQueueKey);
                PlayerPrefs.Save();
            }
        }
        catch (Exception ex)
        {
            LogError($"오프라인 큐 로드 실패: {ex.Message}");
        }
    }

    #endregion

    #region 하트비트

    /// <summary>
    /// 하트비트 코루틴 - 연속 실패 시 재연결 시도
    /// </summary>
    private IEnumerator HeartbeatCoroutine()
    {
        yield return new WaitForSeconds(heartbeatInterval);

        while (true)
        {
            if (!string.IsNullOrEmpty(sessionId))
            {
                _ = SendHeartbeatAsync();
            }

            yield return new WaitForSeconds(heartbeatInterval);
        }
    }

    private async Task SendHeartbeatAsync()
    {
        try
        {
            var response = await SendRequestAsync<object>(
                "/api/sessions/heartbeat",
                "POST",
                new { session_id = sessionId }
            );

            if (response != null)
            {
                heartbeatFailureCount = 0;

                // 오프라인에서 온라인으로 전환
                if (!isOnline)
                {
                    LogDebug("네트워크 재연결 감지");
                    isOnline = true;
                    _ = ProcessOfflineQueueAsync();
                }
            }
            else
            {
                HandleHeartbeatFailure();
            }
        }
        catch (Exception ex)
        {
            LogWarning($"하트비트 실패: {ex.Message}");
            HandleHeartbeatFailure();
        }
    }

    private void HandleHeartbeatFailure()
    {
        heartbeatFailureCount++;

        if (heartbeatFailureCount >= maxHeartbeatFailures)
        {
            LogWarning($"하트비트 연속 {heartbeatFailureCount}회 실패 - 오프라인 모드 전환");
            isOnline = false;

            // 재연결 시도
            _ = ReconnectAsync();
        }
    }

    /// <summary>
    /// 재연결 시도
    /// </summary>
    private async Task ReconnectAsync()
    {
        LogDebug("재연결 시도 중...");

        // 기존 세션 종료 시도 (무시)
        await EndSessionAsync();

        // 새 세션 시작 시도
        bool success = await StartSessionWithRetryAsync();

        if (success)
        {
            LogDebug("재연결 성공");
            isOnline = true;
            heartbeatFailureCount = 0;
            _ = ProcessOfflineQueueAsync();
        }
        else
        {
            LogWarning("재연결 실패 - 오프라인 모드 유지");
        }
    }

    #endregion

    #region HTTP 요청

    /// <summary>
    /// 개선된 HTTP 요청 - 타임아웃 및 재시도 포함
    /// </summary>
    private async Task<T> SendRequestAsync<T>(string endpoint, string method, object data = null, bool useAuth = true)
    {
        string url = serverUrl + endpoint;
        string jsonData = data != null ? JsonUtility.ToJson(data) : null;

        using (UnityWebRequest request = new UnityWebRequest(url, method))
        {
            // 타임아웃 설정
            request.timeout = requestTimeout;

            // 바디 설정
            if (!string.IsNullOrEmpty(jsonData))
            {
                byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonData);
                request.uploadHandler = new UploadHandlerRaw(bodyRaw);
            }

            request.downloadHandler = new DownloadHandlerBuffer();

            // 헤더 설정
            request.SetRequestHeader("Content-Type", "application/json");
            if (useAuth && !string.IsNullOrEmpty(deviceToken))
            {
                request.SetRequestHeader("Authorization", $"Bearer {deviceToken}");
            }

            // 요청 전송
            var operation = request.SendWebRequest();

            // 비동기 대기
            while (!operation.isDone)
            {
                await Task.Yield();
            }

            // 응답 처리
            if (request.result == UnityWebRequest.Result.Success)
            {
                string responseText = request.downloadHandler.text;
                return JsonUtility.FromJson<T>(responseText);
            }
            else if (request.responseCode == 401)
            {
                // 토큰 만료 → 재등록
                LogWarning("인증 만료 - 재등록 시도");
                isRegistered = false;
                await RegisterDeviceWithRetryAsync();
                return default(T);
            }
            else
            {
                LogWarning($"요청 실패: {request.error} (코드: {request.responseCode})");
                return default(T);
            }
        }
    }

    #endregion

    #region 디바이스 정보

    private string GetDeviceId()
    {
#if UNITY_ANDROID && !UNITY_EDITOR
        try
        {
            using (AndroidJavaClass unityPlayer = new AndroidJavaClass("com.unity3d.player.UnityPlayer"))
            using (AndroidJavaObject activity = unityPlayer.GetStatic<AndroidJavaObject>("currentActivity"))
            using (AndroidJavaObject contentResolver = activity.Call<AndroidJavaObject>("getContentResolver"))
            using (AndroidJavaClass secure = new AndroidJavaClass("android.provider.Settings$Secure"))
            {
                return secure.CallStatic<string>("getString", contentResolver, "android_id");
            }
        }
        catch
        {
            return SystemInfo.deviceUniqueIdentifier;
        }
#else
        return SystemInfo.deviceUniqueIdentifier;
#endif
    }

    private string GetMacAddress()
    {
        return SystemInfo.deviceUniqueIdentifier.Substring(0, 17);
    }

    #endregion

    #region 토큰 저장/로드

    private void SaveDeviceToken()
    {
        PlayerPrefs.SetString(DeviceTokenKey, deviceToken);
        PlayerPrefs.Save();
    }

    private void LoadDeviceToken()
    {
        if (PlayerPrefs.HasKey(DeviceTokenKey))
        {
            deviceToken = PlayerPrefs.GetString(DeviceTokenKey);
            isRegistered = !string.IsNullOrEmpty(deviceToken);
            LogDebug("저장된 토큰 로드 완료");
        }
    }

    #endregion

    #region 로깅

    private void LogDebug(string message)
    {
        if (enableDebugLogs)
        {
            Debug.Log($"[VRLog] {message}");
        }
    }

    private void LogWarning(string message)
    {
        Debug.LogWarning($"[VRLog] {message}");
    }

    private void LogError(string message)
    {
        Debug.LogError($"[VRLog] {message}");
    }

    #endregion

    #region 데이터 클래스

    [Serializable]
    private class LogEntry
    {
        public string session_id;
        public string content_id;
        public string content_name;
        public string action_type;
        public int? duration;
        public string timestamp;
    }

    [Serializable]
    private class LogEntryList
    {
        public List<LogEntry> logs;
    }

    [Serializable]
    private class RegisterResponse
    {
        public bool success;
        public string token;
    }

    [Serializable]
    private class SessionResponse
    {
        public bool success;
        public string session_id;
    }

    #endregion

    #region Public API

    /// <summary>
    /// 현재 연결 상태 확인
    /// </summary>
    public bool IsOnline() => isOnline;

    /// <summary>
    /// 오프라인 큐 크기 확인
    /// </summary>
    public int GetOfflineQueueSize() => offlineQueue.Count;

    /// <summary>
    /// 통계 정보 가져오기
    /// </summary>
    public (int sent, int failed, int queued) GetStats()
    {
        return (totalLogsSent, totalLogsFailed, offlineQueue.Count);
    }

    /// <summary>
    /// 수동으로 재연결 시도
    /// </summary>
    public async Task ManualReconnect()
    {
        await ReconnectAsync();
    }

    #endregion
}
