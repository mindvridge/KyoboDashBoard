using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using KyoboDashboard;
using UnityEngine;
using UnityEngine.Networking;

namespace VRLogDashboard
{
    /// <summary>
    /// VR 로그 대시보드 Unity SDK
    /// VR 앱에서 로그 데이터를 수집하고 서버로 전송하는 클래스
    /// </summary>
    public class VRLogger : MonoBehaviour
    {
        #region Singleton
        private static VRLogger _instance;
        public static VRLogger Instance
        {
            get
            {
                if (_instance == null)
                {
                    var go = new GameObject("VRLogger");
                    _instance = go.AddComponent<VRLogger>();
                    DontDestroyOnLoad(go);
                }
                return _instance;
            }
        }
        #endregion

        #region Configuration
        [Header("Server Configuration")]
        [SerializeField] private string serverUrl = "https://kyobodashboard-production.up.railway.app";

        [Header("Device Configuration")]
        [SerializeField] private string deviceId;

        [Header("Settings")]
        [SerializeField] private bool autoLogin = true;
        [SerializeField] private float heartbeatInterval = 60f;
        [SerializeField] private bool enableDebugLogs = true;

        [Header("Debug Settings (VR Device)")]
        [Tooltip("VR 기기에서 디버그 로그를 파일로 저장합니다")]
        [SerializeField] private bool saveDebugLogsToFile = true;
        [Tooltip("HTTPS 인증서 검증을 무시합니다 (개발용, 프로덕션에서는 false)")]
        [SerializeField] private bool bypassCertificateValidation = false;

        [Header("Session Persistence")]
        [Tooltip("세션을 로컬에 저장하여 앱 재시작 시 복원합니다")]
        [SerializeField] private bool persistSession = true;
        [Tooltip("저장된 세션의 유효 시간 (시간 단위, 0이면 무제한)")]
        [SerializeField] private int sessionExpiryHours = 24;

        [Header("Local Storage Settings")]
        [SerializeField] private int maxRetryCount = 3;
        [SerializeField] private float networkCheckInterval = 10f;

        [Header("Network Settings")]
        [Tooltip("네트워크 요청 타임아웃 시간 (초)")]
        [SerializeField] private int requestTimeout = 30;
        [Tooltip("요청 간 지연 시간 (밀리초)")]
        [SerializeField] private int delayBetweenRequests = 50;
        [Tooltip("재시도 전 대기 시간 (초)")]
        [SerializeField] private int retryDelaySeconds = 2;

        [Header("Daily Log Archive")]
        [Tooltip("모든 로그를 날짜별로 로컬에 저장합니다")]
        [SerializeField] private bool enableDailyLogArchive = true;
        #endregion

        #region Private Fields
        private string authToken;
        private string currentSessionId;
        private Queue<LogRequest> pendingRequests = new Queue<LogRequest>();
        private bool isProcessingQueue = false;
        private Coroutine heartbeatCoroutine;
        private Coroutine networkCheckCoroutine;
        private bool isNetworkAvailable = true;
        private string localLogFilePath;
        private string logsDirectoryPath;
        private static readonly TimeSpan KoreanTimeOffset = TimeSpan.FromHours(9);

        // 동시성 제어를 위한 lock 객체
        private readonly object queueLock = new object();
        private readonly object processingLock = new object();

        // 재로그인 제어
        private bool isReloginInProgress = false;
        private readonly object reloginLock = new object();

        // 디버그 로그 파일
        private string debugLogFilePath;
        private StreamWriter debugLogWriter;

        // 세션 로컬 저장 키
        private const string PREF_AUTH_TOKEN = "VRLogger_AuthToken";
        private const string PREF_SESSION_ID = "VRLogger_SessionId";
        private const string PREF_SESSION_TIMESTAMP = "VRLogger_SessionTimestamp";
        private const string PREF_DEVICE_ID = "VRLogger_DeviceId";

        // 시청 시간 추적
        private Dictionary<string, float> watchStartTimes = new Dictionary<string, float>();

        #endregion

        #region Events
        public event Action<bool> OnLoginComplete;
        public event Action<string> OnSessionStarted;
        public event Action OnSessionEnded;
        public event Action<string> OnError;
        public event Action<int> OnPendingLogsChanged;
        #endregion

        #region Properties
        public int currentVideoID;
        public DashboardVideoLoader dashboardVideoLoader;
        public bool IsLoggedIn => !string.IsNullOrEmpty(authToken);
        public bool HasActiveSession => !string.IsNullOrEmpty(currentSessionId);
        public string CurrentSessionId => currentSessionId;
        public string ServerUrl
        {
            get => serverUrl;
            set => serverUrl = value;
        }
        #endregion

        #region Unity Lifecycle
        private void Awake()
        {
            if (_instance != null && _instance != this)
            {
                Destroy(gameObject);
                return;
            }
            _instance = this;
            DontDestroyOnLoad(gameObject);

            // Initialize debug log file (VR 기기 디버깅용)
            if (saveDebugLogsToFile)
            {
                InitializeDebugLogFile();
            }

            // HTTPS 인증서 검증 우회 설정 확인 (PostRequest에서 적용)
            if (bypassCertificateValidation)
            {
                LogDebug("⚠️ Certificate validation will be bypassed (development mode)");
            }

            // 플랫폼 정보 로깅
            LogDebug($"=== VRLogger Initialized ===");
            LogDebug($"Platform: {Application.platform}");
            LogDebug($"Unity Version: {Application.unityVersion}");
            LogDebug($"Device Model: {SystemInfo.deviceModel}");
            LogDebug($"Device Type: {SystemInfo.deviceType}");
            LogDebug($"OS: {SystemInfo.operatingSystem}");
            LogDebug($"Internet Reachability: {Application.internetReachability}");

            // Auto-generate device ID if not set
            if (string.IsNullOrEmpty(deviceId))
            {
                deviceId = SystemInfo.deviceUniqueIdentifier;
                LogDebug($"Auto-generated Device ID: {deviceId}");
            }
            else
            {
                LogDebug($"Using configured Device ID: {deviceId}");
            }

            // Validate device ID
            if (string.IsNullOrEmpty(deviceId) || deviceId == SystemInfo.unsupportedIdentifier)
            {
                LogError("⚠️ Device ID is invalid or unsupported! Using fallback.");
                deviceId = $"fallback_{Guid.NewGuid().ToString()}";
                LogDebug($"Fallback Device ID: {deviceId}");
            }

            // Initialize local log file path
            localLogFilePath = Path.Combine(Application.persistentDataPath, "pending_logs.json");
            LogDebug($"Local log file path: {localLogFilePath}");

            // Initialize daily logs directory
            logsDirectoryPath = Path.Combine(Application.persistentDataPath, "logs");
            if (!Directory.Exists(logsDirectoryPath))
            {
                Directory.CreateDirectory(logsDirectoryPath);
            }
            LogDebug($"Daily logs directory: {logsDirectoryPath}");
            LogDebug($"Persistent data path: {Application.persistentDataPath}");
            LogDebug($"=== Initialization Complete ===");
        }

        private void Start()
        {
            LogDebug("=== VRLogger Start ===");

            // Load any pending logs from local storage
            LogDebug("Loading pending logs from local storage...");
            LoadPendingLogsFromLocal();

            // Start network monitoring
            LogDebug("Starting network monitoring...");
            StartNetworkMonitoring();

            // 저장된 세션 복원 시도
            _ = InitializeSessionAsync();

            if (dashboardVideoLoader == null)
            {
                dashboardVideoLoader = this.GetComponent<DashboardVideoLoader>();
                LogDebug($"DashboardVideoLoader: {(dashboardVideoLoader != null ? "Found" : "Not Found")}");
            }

            LogDebug("=== VRLogger Start Complete ===");
        }

        /// <summary>
        /// 세션을 초기화합니다. (저장된 세션 복원 또는 새로 로그인)
        /// </summary>
        private async Task InitializeSessionAsync()
        {
            try
            {
                // 1. 저장된 세션 로드 시도
                bool sessionLoaded = LoadSessionFromLocal();

                if (sessionLoaded)
                {
                    LogDebug("Saved session loaded, validating...");

                    // 2. 저장된 세션 유효성 검증
                    bool isValid = await ValidateSavedSession();

                    if (isValid)
                    {
                        // 3. 세션이 유효하면 그대로 사용
                        LogDebug("✅ Using saved session");
                        OnLoginComplete?.Invoke(true);
                        OnSessionStarted?.Invoke(currentSessionId);

                        // 하트비트 시작
                        StartHeartbeat();

                        // 대기 중인 로그 재전송
                        _ = RetryPendingLogs();

                        return;
                    }
                    else
                    {
                        // 4. 세션이 유효하지 않으면 삭제
                        LogDebug("Saved session is invalid, clearing...");
                        ClearSavedSession();
                        authToken = null;
                        currentSessionId = null;
                    }
                }

                // 5. 저장된 세션이 없거나 유효하지 않으면 새로 로그인
                if (autoLogin)
                {
                    LogDebug("Starting new login process...");
                    await AutoLogin();
                }
                else
                {
                    LogDebug("AutoLogin disabled");
                }
            }
            catch (Exception ex)
            {
                LogError($"Session initialization failed: {ex.Message}");

                // 실패 시 새로 로그인 시도
                if (autoLogin)
                {
                    LogDebug("Retrying with new login...");
                    await AutoLogin();
                }
            }
        }

        private void OnApplicationQuit()
        {
            // Save any pending logs and session to local storage before quit
            SavePendingLogsToLocal();
            SaveSessionToLocal();

            // 앱 종료 시에는 세션을 종료하지 않고 유지 (다음 실행 시 재사용)
            LogDebug("App quitting, session saved for next startup");
        }

        private void OnApplicationPause(bool pauseStatus)
        {
            if (pauseStatus)
            {
                // App going to background - save pending logs and session
                SavePendingLogsToLocal();
                SaveSessionToLocal();

                // 세션 종료하지 않고 유지 (백그라운드에서 복귀 시 재사용)
                LogDebug("App paused, session saved to local");
            }
            else
            {
                // App resuming - validate and restore session
                LogDebug("App resumed from pause");
                _ = ResumeSessionAsync();
            }
        }

        private void OnApplicationFocus(bool hasFocus)
        {
            // VR 헤드셋 수면 모드 대응 (OnApplicationPause가 호출되지 않는 경우)
            if (hasFocus)
            {
                LogDebug("App gained focus (VR headset wake up)");
                _ = ResumeSessionAsync();
            }
            else
            {
                // 포커스 잃음 - 세션 저장
                SavePendingLogsToLocal();
                SaveSessionToLocal();
                LogDebug("App lost focus, session saved");
            }
        }

        /// <summary>
        /// 앱 복귀 시 세션을 복원합니다.
        /// </summary>
        private async Task ResumeSessionAsync()
        {
            try
            {
                string oldSessionId = currentSessionId;

                if (IsLoggedIn && HasActiveSession)
                {
                    // 세션이 있으면 유효성 검증
                    LogDebug("Validating existing session...");
                    bool isValid = await ValidateSavedSession();

                    if (isValid)
                    {
                        LogDebug("Session is still valid ✅");
                        _ = RetryPendingLogs();
                        return;
                    }
                    else
                    {
                        LogDebug("Session is invalid, restarting...");
                        currentSessionId = null;
                    }
                }

                // 세션이 없거나 유효하지 않으면 재시작
                if (IsLoggedIn)
                {
                    bool sessionStarted = await StartSession();

                    if (sessionStarted && !string.IsNullOrEmpty(oldSessionId))
                    {
                        // 대기 중인 로그의 session_id 업데이트
                        LogDebug($"Updating pending logs session_id: {oldSessionId} -> {currentSessionId}");
                        UpdatePendingLogsSessionId(oldSessionId, currentSessionId);
                    }

                    _ = RetryPendingLogs();
                }
                else if (autoLogin)
                {
                    await AutoLogin();
                }
            }
            catch (Exception ex)
            {
                LogError($"Session resume failed: {ex.Message}");
            }
        }

        /// <summary>
        /// 대기 중인 모든 로그의 session_id를 새 세션 ID로 업데이트합니다.
        /// </summary>
        private void UpdatePendingLogsSessionId(string oldSessionId, string newSessionId)
        {
            if (string.IsNullOrEmpty(oldSessionId) || string.IsNullOrEmpty(newSessionId))
                return;

            try
            {
                // 메모리 큐의 요청 업데이트
                lock (queueLock)
                {
                    if (pendingRequests.Count > 0)
                    {
                        var updatedQueue = new Queue<LogRequest>();
                        while (pendingRequests.Count > 0)
                        {
                            var request = pendingRequests.Dequeue();
                            var updated = UpdateRequestSessionId(request, oldSessionId, newSessionId);
                            updatedQueue.Enqueue(updated);
                        }

                        while (updatedQueue.Count > 0)
                        {
                            pendingRequests.Enqueue(updatedQueue.Dequeue());
                        }

                        LogDebug($"Updated {pendingRequests.Count} pending requests in memory");
                    }
                }

                // 로컬 저장소의 요청도 업데이트
                var localLogs = LoadLocalLogFile();
                if (localLogs.requests.Count > 0)
                {
                    for (int i = 0; i < localLogs.requests.Count; i++)
                    {
                        localLogs.requests[i] = UpdateRequestSessionId(
                            localLogs.requests[i], oldSessionId, newSessionId);
                    }
                    SaveLocalLogFile(localLogs);
                    LogDebug($"Updated {localLogs.requests.Count} pending requests in local storage");
                }
            }
            catch (Exception ex)
            {
                LogError($"Failed to update pending logs session_id: {ex.Message}");
            }
        }

        private void OnDestroy()
        {
            // 리소스 정리 및 메모리 누수 방지
            try
            {
                // 대기 중인 로그 저장
                SavePendingLogsToLocal();

                // 코루틴 정리
                if (heartbeatCoroutine != null)
                {
                    StopCoroutine(heartbeatCoroutine);
                    heartbeatCoroutine = null;
                }

                if (networkCheckCoroutine != null)
                {
                    StopCoroutine(networkCheckCoroutine);
                    networkCheckCoroutine = null;
                }

                // 이벤트 구독 해제 (메모리 누수 방지)
                OnLoginComplete = null;
                OnSessionStarted = null;
                OnSessionEnded = null;
                OnError = null;
                OnPendingLogsChanged = null;

                Log("VRLogger destroyed and resources cleaned up");

                // 디버그 로그 파일 닫기
                if (debugLogWriter != null)
                {
                    LogToFile("=== VRLogger Debug Log Ended ===");
                    debugLogWriter.Close();
                    debugLogWriter.Dispose();
                    debugLogWriter = null;
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[VRLogger] Error during cleanup: {ex.Message}");
            }
        }
        #endregion

        #region Public API Methods

        /// <summary>
        /// 기기를 서버에 자동 등록하고 로그인합니다.
        /// </summary>
        public async Task<bool> AutoLogin()
        {
            return await AutoLogin(deviceId);
        }

        /// <summary>
        /// 지정된 기기 정보로 자동 등록 및 로그인합니다.
        /// </summary>
        public async Task<bool> AutoLogin(string deviceId)
        {
            try
            {
                LogDebug($"=== Starting AutoLogin ===");
                LogDebug($"Device ID: {deviceId}");
                LogDebug($"Server URL: {serverUrl}");
                LogDebug($"Network Reachability: {Application.internetReachability}");

                var request = new DeviceRegistrationRequest
                {
                    device_id = deviceId,
                };

                var requestJson = JsonUtility.ToJson(request);
                LogDebug($"Request JSON: {requestJson}");

                var response = await PostRequest<DeviceRegistrationResponse>(
                    "/api/devices/register",
                    requestJson,
                    false
                );

                if (response != null && response.success)
                {
                    authToken = response.token;
                    LogDebug($"Auth token received: {(string.IsNullOrEmpty(authToken) ? "null" : authToken.Substring(0, Math.Min(10, authToken.Length)))}...");

                    Log($"Device registered: {response.device.device_id}, New: {response.is_new_device}");

                    OnLoginComplete?.Invoke(true);

                    // Start session automatically
                    LogDebug("Starting session...");
                    await StartSession();

                    // 세션 로컬 저장
                    SaveSessionToLocal();

                    // Start heartbeat
                    LogDebug("Starting heartbeat...");
                    StartHeartbeat();

                    // Try to send any pending logs after successful login
                    LogDebug("Retrying pending logs...");
                    _ = RetryPendingLogs();

                    LogDebug("=== AutoLogin Successful ===");
                    return true;
                }

                LogError("AutoLogin failed: Response was null or not successful");
                LogDebug($"Response: {(response == null ? "null" : $"success={response.success}")}");
                OnLoginComplete?.Invoke(false);
                return false;
            }
            catch (Exception ex)
            {
                LogError($"AutoLogin exception: {ex.GetType().Name}: {ex.Message}");
                LogDebug($"Stack trace: {ex.StackTrace}");
                OnLoginComplete?.Invoke(false);
                return false;
            }
        }

        /// <summary>
        /// 새 세션을 시작합니다.
        /// </summary>
        public async Task<bool> StartSession()
        {
            if (!IsLoggedIn)
            {
                LogError("Cannot start session: Not logged in");
                return false;
            }

            try
            {
                LogDebug("=== Starting Session ===");

                var response = await PostRequest<SessionStartResponse>(
                    "/api/sessions/start",
                    "{}",
                    true
                );

                if (response != null && response.success)
                {
                    currentSessionId = response.session_id;
                    Log($"Session started: {currentSessionId}");
                    LogDebug($"Session start time: {response.start_time}");

                    // 세션 로컬 저장
                    SaveSessionToLocal();

                    OnSessionStarted?.Invoke(currentSessionId);
                    return true;
                }

                LogError("StartSession failed: Response was null or not successful");
                return false;
            }
            catch (Exception ex)
            {
                LogError($"StartSession exception: {ex.GetType().Name}: {ex.Message}");
                LogDebug($"Stack trace: {ex.StackTrace}");
                return false;
            }
        }

        /// <summary>
        /// 콘텐츠 선택 이벤트를 로그합니다. (간편 메서드)
        /// </summary>
        public void LogContentSelect(int contentId)
        {
            currentVideoID = contentId;
            var videoInfo = GetVideoFileNameByID();

            if (videoInfo != null)
            {
                _ = LogContentSelectAsync(contentId.ToString(), videoInfo.title);
            }
            else
            {
                _ = LogContentSelectAsync(contentId.ToString(), contentId.ToString());
            }
        }

        /// <summary>
        /// 콘텐츠 선택 이벤트를 로그합니다. (async 버전)
        /// </summary>
        public async Task<bool> LogContentSelectAsync(string contentId, string contentName, Dictionary<string, object> metadata = null)
        {
            if (!HasActiveSession)
            {
                LogError("Cannot log: No active session");
                return false;
            }

            var request = new ContentSelectRequest
            {
                session_id = currentSessionId,
                content_id = contentId,
                content_name = contentName
            };

            return await QueueRequest("/api/logs/content-select", JsonUtility.ToJson(request));
        }

        /// <summary>
        /// 콘텐츠 선택 이벤트를 로그합니다. (하위 호환성)
        /// </summary>
        public async Task<bool> LogContentSelect(string contentId, string contentName, Dictionary<string, object> metadata = null)
        {
            return await LogContentSelectAsync(contentId, contentName, metadata);
        }

        /// <summary>
        /// 콘텐츠 시청 시작을 로그합니다.
        /// </summary>
        public async Task<bool> LogWatchStart(string contentId, string contentName)
        {
            // 시청 시작 시간 기록
            watchStartTimes[contentId] = Time.realtimeSinceStartup;
            return await LogWatchEvent(contentId, contentName, "WATCH_START", 0);
        }

        /// <summary>
        /// 콘텐츠 시청 종료를 로그합니다. (Fire and Forget)
        /// 클라이언트에서 시청 시간을 계산하여 전송, 서버에서 재계산 후 참고용으로 사용
        /// </summary>
        public void LogWatchEnd(string contentId, string contentName)
        {
            _ = LogWatchEndAsync(contentId, contentName);
        }

        /// <summary>
        /// 콘텐츠 시청 종료를 로그합니다. (async 버전)
        /// 클라이언트에서 시청 시간을 계산하여 전송, 서버에서 재계산 후 참고용으로 사용
        /// </summary>
        public async Task<bool> LogWatchEndAsync(string contentId, string contentName)
        {
            float duration = 0;
            if (watchStartTimes.TryGetValue(contentId, out float startTime))
            {
                duration = Time.realtimeSinceStartup - startTime;
                watchStartTimes.Remove(contentId);
            }
            return await LogWatchEvent(contentId, contentName, "WATCH_END", duration);
        }

        /// <summary>
        /// 세션을 종료합니다.
        /// </summary>
        public async Task<bool> LogSessionEnd(float lobbyTimeSeconds = 0)
        {
            if (!HasActiveSession)
            {
                LogError("Cannot end session: No active session");
                return false;
            }

            try
            {
                var request = new SessionEndRequest
                {
                    session_id = currentSessionId,
                    lobby_time = Mathf.RoundToInt(lobbyTimeSeconds)
                };

                var response = await PostRequest<SessionEndResponse>(
                    "/api/sessions/end",
                    JsonUtility.ToJson(request),
                    true
                );

                if (response != null && response.success)
                {
                    Log($"Session ended: {currentSessionId}, Duration: {response.duration}s");
                    currentSessionId = null;
                    OnSessionEnded?.Invoke();
                    return true;
                }

                return false;
            }
            catch (Exception ex)
            {
                LogError($"LogSessionEnd failed: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// 로컬에 저장된 대기 중인 로그 개수를 반환합니다.
        /// </summary>
        public int GetPendingLogCount()
        {
            var localLogs = LoadLocalLogFile();

            // 동시성 제어: 큐 카운트를 안전하게 읽기
            int queueCount = 0;
            lock (queueLock)
            {
                queueCount = pendingRequests.Count;
            }

            return queueCount + localLogs.requests.Count;
        }

        /// <summary>
        /// 수동으로 대기 중인 로그를 재전송합니다.
        /// </summary>
        public async Task<bool> FlushPendingLogs()
        {
            if (!IsLoggedIn)
            {
                LogError("Cannot flush logs: Not logged in");
                return false;
            }

            await RetryPendingLogs();

            // 동시성 제어: 큐 상태를 안전하게 확인
            bool isEmpty = false;
            lock (queueLock)
            {
                isEmpty = pendingRequests.Count == 0;
            }

            return isEmpty;
        }

        /// <summary>
        /// 특정 날짜의 로그를 조회합니다. (한국 날짜 기준)
        /// </summary>
        /// <param name="date">조회할 날짜 (null이면 오늘)</param>
        public List<DailyLogEntry> GetDailyLogs(DateTime? date = null)
        {
            var targetDate = date ?? (DateTime.UtcNow + KoreanTimeOffset);
            var dailyLogFile = GetDailyLogFilePath(targetDate);

            if (File.Exists(dailyLogFile))
            {
                var json = File.ReadAllText(dailyLogFile);
                var logList = JsonUtility.FromJson<DailyLogList>(json);
                return logList?.entries ?? new List<DailyLogEntry>();
            }

            return new List<DailyLogEntry>();
        }

        /// <summary>
        /// 저장된 모든 로그 날짜 목록을 반환합니다.
        /// </summary>
        public List<string> GetAvailableLogDates()
        {
            var dates = new List<string>();

            if (Directory.Exists(logsDirectoryPath))
            {
                var files = Directory.GetFiles(logsDirectoryPath, "*.json");
                foreach (var file in files)
                {
                    var fileName = Path.GetFileNameWithoutExtension(file);
                    dates.Add(fileName);
                }
                dates.Sort();
                dates.Reverse(); // 최신 날짜가 먼저
            }

            return dates;
        }

        /// <summary>
        /// 로그 저장 디렉토리 경로를 반환합니다.
        /// </summary>
        public string GetLogsDirectoryPath()
        {
            return logsDirectoryPath;
        }

        /// <summary>
        /// 오늘의 로그 파일 경로를 반환합니다. (한국 날짜 기준)
        /// </summary>
        public string GetTodayLogFilePath()
        {
            var koreanTime = DateTime.UtcNow + KoreanTimeOffset;
            return GetDailyLogFilePath(koreanTime);
        }

        /// <summary>
        /// 디버그 로그 파일 경로를 반환합니다. (VR 기기 디버깅용)
        /// </summary>
        public string GetDebugLogFilePath()
        {
            return debugLogFilePath;
        }

        /// <summary>
        /// 현재 세션을 수동으로 로컬에 저장합니다.
        /// </summary>
        public void SaveSession()
        {
            SaveSessionToLocal();
        }

        /// <summary>
        /// 저장된 세션을 수동으로 삭제합니다.
        /// </summary>
        public void ClearSession()
        {
            ClearSavedSession();
        }

        /// <summary>
        /// 저장된 세션이 있는지 확인합니다.
        /// </summary>
        public bool HasSavedSession()
        {
            return PlayerPrefs.HasKey(PREF_AUTH_TOKEN) && PlayerPrefs.HasKey(PREF_SESSION_ID);
        }

        /// <summary>
        /// 저장된 세션의 나이(시간)를 반환합니다.
        /// </summary>
        public TimeSpan? GetSavedSessionAge()
        {
            if (!PlayerPrefs.HasKey(PREF_SESSION_TIMESTAMP))
                return null;

            string timestampStr = PlayerPrefs.GetString(PREF_SESSION_TIMESTAMP);
            if (DateTime.TryParse(timestampStr, out DateTime savedTime))
            {
                return DateTime.UtcNow - savedTime;
            }

            return null;
        }

        #endregion

        #region Private Methods

        /// <summary>
        /// 요청의 session_id를 새 세션 ID로 업데이트합니다.
        /// </summary>
        private LogRequest UpdateRequestSessionId(LogRequest request, string oldSessionId, string newSessionId)
        {
            if (string.IsNullOrEmpty(oldSessionId) || string.IsNullOrEmpty(newSessionId))
            {
                LogDebug($"Cannot update session ID: old={oldSessionId}, new={newSessionId}");
                return request;
            }

            try
            {
                // JSON body에서 session_id 교체
                string updatedBody = request.body.Replace(
                    $"\"session_id\":\"{oldSessionId}\"",
                    $"\"session_id\":\"{newSessionId}\""
                );

                LogDebug($"Updated request session_id: {oldSessionId} -> {newSessionId}");

                return new LogRequest
                {
                    endpoint = request.endpoint,
                    body = updatedBody,
                    retryCount = request.retryCount,
                    timestamp = request.timestamp
                };
            }
            catch (Exception ex)
            {
                LogError($"Failed to update session ID in request: {ex.Message}");
                return request;
            }
        }

        private async Task<bool> LogWatchEvent(string contentId, string contentName, string actionType, float duration)
        {
            if (!HasActiveSession)
            {
                LogError("Cannot log: No active session");
                return false;
            }

            var request = new ContentWatchRequest
            {
                session_id = currentSessionId,
                content_id = contentId,
                content_name = contentName,
                action_type = actionType,
                duration = Mathf.RoundToInt(duration)
            };

            return await QueueRequest("/api/logs/content-watch", JsonUtility.ToJson(request));
        }

        private async Task<bool> QueueRequest(string endpoint, string jsonBody)
        {
            var koreanTime = DateTime.UtcNow + KoreanTimeOffset;
            var logRequest = new LogRequest
            {
                endpoint = endpoint,
                body = jsonBody,
                retryCount = 0,
                timestamp = koreanTime.ToString("yyyy-MM-dd HH:mm:ss")
            };

            // Save to daily log archive (한국 시간 기준)
            if (enableDailyLogArchive)
            {
                SaveToDailyLog(logRequest, koreanTime);
            }

            bool shouldProcessQueue = false;
            int queueSize = 0;

            // 동시성 제어: 큐에 안전하게 추가
            lock (queueLock)
            {
                pendingRequests.Enqueue(logRequest);
                queueSize = pendingRequests.Count;

                // isProcessingQueue 체크도 lock 내부에서 수행
                lock (processingLock)
                {
                    shouldProcessQueue = !isProcessingQueue;
                }
            }

            OnPendingLogsChanged?.Invoke(GetPendingLogCount());

            // lock 외부에서 ProcessQueue 호출 (데드락 방지)
            if (shouldProcessQueue)
            {
                await ProcessQueue();
            }

            return true;
        }

        private async Task ProcessQueue()
        {
            // 동시성 제어: 이미 처리 중인지 확인
            lock (processingLock)
            {
                if (isProcessingQueue)
                {
                    Log("Queue processing already in progress, skipping");
                    return;
                }
                isProcessingQueue = true;
            }

            try
            {
                var failedRequests = new List<LogRequest>();

                while (true)
                {
                    LogRequest request = null;

                    // 동시성 제어: 큐에서 안전하게 가져오기
                    lock (queueLock)
                    {
                        if (pendingRequests.Count == 0)
                            break;

                        request = pendingRequests.Dequeue();
                    }

                    try
                    {
                        var response = await PostRequest<BaseResponse>(request.endpoint, request.body, true);
                        if (response != null && response.success)
                        {
                            Log($"Log sent successfully: {request.endpoint}");
                        }
                        else
                        {
                            throw new Exception("Server returned failure response");
                        }
                    }
                    catch (SessionNotFoundException sessionEx)
                    {
                        // 세션 없음 (404) 또는 유효성 검증 실패 - 세션 재시작 시도
                        LogError($"Session not found: {sessionEx.Message}");
                        LogDebug("Attempting to restart session...");

                        // 현재 세션 ID 초기화
                        string oldSessionId = currentSessionId;
                        currentSessionId = null;

                        // 저장된 세션 정보 삭제 (기기 삭제 등으로 무효화된 경우 대비)
                        ClearSavedSession();

                        // 로그인 상태 확인
                        if (!IsLoggedIn)
                        {
                            LogError("Not logged in, cannot restart session. Attempting relogin...");

                            // 재로그인 시도
                            bool reloginSuccess = await TryReloginAsync();

                            if (reloginSuccess)
                            {
                                Log("Relogin successful, session will be restarted automatically");
                                // 대기 중인 모든 요청의 session_id 업데이트
                                UpdatePendingLogsSessionId(oldSessionId, currentSessionId);
                                // 새 세션 ID로 요청 업데이트
                                var updatedRequest = UpdateRequestSessionId(request, oldSessionId, currentSessionId);
                                failedRequests.Add(updatedRequest);
                            }
                            else
                            {
                                LogError("Relogin failed, saving log to local storage");
                                SaveFailedLogToLocal(request);
                                Log("Stopping queue processing due to login failure");
                                break;
                            }
                        }
                        else
                        {
                            // 로그인은 되어 있으므로 세션만 재시작
                            bool sessionStarted = await StartSession();

                            if (sessionStarted)
                            {
                                Log("Session restarted successfully, retrying failed request");
                                // 대기 중인 모든 요청의 session_id 업데이트
                                UpdatePendingLogsSessionId(oldSessionId, currentSessionId);
                                // 새 세션 ID로 요청 업데이트
                                var updatedRequest = UpdateRequestSessionId(request, oldSessionId, currentSessionId);
                                failedRequests.Add(updatedRequest);
                            }
                            else
                            {
                                LogError("Failed to restart session, saving log to local storage");
                                SaveFailedLogToLocal(request);
                                Log("Stopping queue processing due to session restart failure");
                                break;
                            }
                        }
                    }
                    catch (AuthenticationException authEx)
                    {
                        // 인증 실패 (401/403) - 재로그인 시도
                        LogError($"Authentication failed: {authEx.Message}");

                        // 재로그인 시도
                        bool reloginSuccess = await TryReloginAsync();

                        if (reloginSuccess)
                        {
                            // 재로그인 성공 - 현재 요청을 다시 큐에 추가 (재시도 카운트는 증가시키지 않음)
                            Log("Relogin successful, retrying failed request");
                            failedRequests.Add(request);
                        }
                        else
                        {
                            // 재로그인 실패 - 로컬에 저장
                            LogError("Relogin failed, saving log to local storage");
                            SaveFailedLogToLocal(request);

                            // 더 이상 처리하지 않고 중단 (재로그인이 실패하면 다른 요청도 실패할 것임)
                            Log("Stopping queue processing due to authentication failure");
                            break;
                        }
                    }
                    catch (RateLimitException)
                    {
                        // Rate Limit 초과 (429) - Exponential backoff로 대기 후 재시도
                        request.retryCount++;
                        int backoffSeconds = (int)Math.Pow(2, request.retryCount); // 2, 4, 8, 16...
                        backoffSeconds = Math.Min(backoffSeconds, 60); // 최대 60초

                        Log($"Rate limited, waiting {backoffSeconds}s before retry ({request.retryCount}/{maxRetryCount})");

                        if (request.retryCount < maxRetryCount)
                        {
                            // Exponential backoff 대기
                            await Task.Delay(backoffSeconds * 1000);
                            failedRequests.Add(request);
                        }
                        else
                        {
                            // Max retries exceeded - save to local storage
                            SaveFailedLogToLocal(request);
                            LogError($"Rate limit exceeded after {maxRetryCount} retries, saved locally");

                            // 모든 요청을 잠시 멈추고 대기 (서버 부하 감소)
                            Log("Pausing queue processing for 30 seconds due to rate limiting");
                            await Task.Delay(30000);
                        }
                    }
                    catch (Exception ex)
                    {
                        LogError($"Failed to process request: {ex.Message}");

                        request.retryCount++;
                        if (request.retryCount < maxRetryCount)
                        {
                            failedRequests.Add(request);
                            Log($"Request queued for retry ({request.retryCount}/{maxRetryCount})");
                        }
                        else
                        {
                            // Max retries exceeded - save to local storage
                            SaveFailedLogToLocal(request);
                            LogError($"Request failed after {maxRetryCount} retries, saved locally");
                        }
                    }

                    // 요청 간 지연 (서버 부하 방지)
                    await Task.Delay(delayBetweenRequests);
                }

                // 동시성 제어: 실패한 요청을 안전하게 다시 큐에 추가
                if (failedRequests.Count > 0)
                {
                    lock (queueLock)
                    {
                        foreach (var failed in failedRequests)
                        {
                            pendingRequests.Enqueue(failed);
                        }
                    }
                }

                OnPendingLogsChanged?.Invoke(GetPendingLogCount());

                // 여전히 대기 중인 요청이 있으면 재시도
                bool hasPendingRequests = false;
                lock (queueLock)
                {
                    hasPendingRequests = pendingRequests.Count > 0;
                }

                if (hasPendingRequests && isNetworkAvailable)
                {
                    await Task.Delay(retryDelaySeconds * 1000); // 재시도 전 대기

                    // 재귀 호출 전에 플래그 해제
                    lock (processingLock)
                    {
                        isProcessingQueue = false;
                    }

                    await ProcessQueue();
                    return; // 재귀 호출 후 종료
                }
            }
            finally
            {
                // 예외 발생 시에도 플래그 해제 보장
                lock (processingLock)
                {
                    isProcessingQueue = false;
                }
            }
        }

        private async Task<T> PostRequest<T>(string endpoint, string jsonBody, bool authenticated) where T : class
        {
            var url = serverUrl + endpoint;

            using (var request = new UnityWebRequest(url, "POST"))
            {
                byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonBody);
                request.uploadHandler = new UploadHandlerRaw(bodyRaw);
                request.downloadHandler = new DownloadHandlerBuffer();
                request.SetRequestHeader("Content-Type", "application/json");
                request.timeout = requestTimeout; // 타임아웃 설정

                // HTTPS 인증서 검증 우회 (개발용)
                if (bypassCertificateValidation)
                {
                    request.certificateHandler = new AcceptAllCertificatesHandler();
                }

                if (authenticated && !string.IsNullOrEmpty(authToken))
                {
                    request.SetRequestHeader("Authorization", $"Bearer {authToken}");
                }

                var operation = request.SendWebRequest();

                // Unity 메인 스레드 안전성을 위한 타임아웃 처리
                float elapsedTime = 0f;
                while (!operation.isDone)
                {
                    // Task.Delay를 사용하여 메인 스레드 안전성 확보
                    await Task.Delay(10);
                    elapsedTime += 0.01f;

                    // 추가 타임아웃 체크
                    if (elapsedTime >= requestTimeout)
                    {
                        request.Abort();
                        LogError($"Request timeout after {requestTimeout} seconds to {url}");
                        throw new Exception($"Request timeout after {requestTimeout} seconds");
                    }
                }

                if (request.result == UnityWebRequest.Result.Success)
                {
                    // 응답 데이터 검증
                    if (string.IsNullOrEmpty(request.downloadHandler.text))
                    {
                        LogError("Empty response from server");
                        throw new Exception("Empty response from server");
                    }

                    try
                    {
                        var response = JsonUtility.FromJson<T>(request.downloadHandler.text);

                        // null 체크
                        if (response == null)
                        {
                            LogError($"Failed to parse response JSON: {request.downloadHandler.text}");
                            throw new Exception("Failed to parse response JSON");
                        }

                        return response;
                    }
                    catch (Exception ex)
                    {
                        LogError($"JSON parsing error: {ex.Message}");
                        throw;
                    }
                }
                else
                {
                    // HTTP 상태 코드 체크
                    long statusCode = request.responseCode;
                    string responseBody = request.downloadHandler?.text ?? "";

                    // 401 Unauthorized 또는 403 Forbidden - 세션 만료 또는 인증 실패
                    if (statusCode == 401 || statusCode == 403)
                    {
                        var authError = $"Authentication failed (HTTP {statusCode})";
                        LogError(authError);
                        throw new AuthenticationException(statusCode, authError);
                    }

                    // 400 Bad Request - 세션이 비활성 상태
                    if (statusCode == 400 && responseBody.Contains("Session is not active"))
                    {
                        var sessionError = $"Session is not active (HTTP 400)";
                        LogError(sessionError);
                        throw new SessionNotFoundException(sessionError);
                    }

                    // 400 Bad Request - 유효성 검증 실패 (세션이 삭제되었을 수 있음)
                    if (statusCode == 400 && responseBody.Contains("VALIDATION_ERROR"))
                    {
                        var sessionError = $"Validation error, session may be invalid (HTTP 400)";
                        LogError(sessionError);
                        throw new SessionNotFoundException(sessionError);
                    }

                    // 404 Not Found - 세션이 존재하지 않음
                    if (statusCode == 404 && responseBody.Contains("Session not found"))
                    {
                        var sessionError = $"Session not found (HTTP 404)";
                        LogError(sessionError);
                        throw new SessionNotFoundException(sessionError);
                    }

                    // 429 Too Many Requests - Rate Limit 초과
                    if (statusCode == 429)
                    {
                        var rateLimitError = $"Rate limit exceeded (HTTP 429)";
                        LogError(rateLimitError);
                        throw new RateLimitException(rateLimitError);
                    }

                    // 기타 에러
                    var errorMessage = $"Request failed (HTTP {statusCode}): {request.error}";
                    if (!string.IsNullOrEmpty(responseBody))
                    {
                        errorMessage += $" - {responseBody}";
                    }
                    LogError(errorMessage);
                    throw new Exception(request.error);
                }
            }
        }

        private void StartHeartbeat()
        {
            if (heartbeatCoroutine != null)
            {
                StopCoroutine(heartbeatCoroutine);
            }
            heartbeatCoroutine = StartCoroutine(HeartbeatCoroutine());
        }

        private IEnumerator HeartbeatCoroutine()
        {
            while (IsLoggedIn)
            {
                yield return new WaitForSeconds(heartbeatInterval);

                if (IsLoggedIn)
                {
                    // 비동기 작업을 제대로 처리하여 예외를 캐치
                    var task = SendHeartbeatAsync();

                    // Task 완료 대기
                    while (!task.IsCompleted)
                    {
                        yield return null;
                    }

                    // 예외 처리
                    if (task.Exception != null)
                    {
                        var innerException = task.Exception.InnerException;

                        // 인증 실패인지 확인
                        if (innerException is AuthenticationException)
                        {
                            LogError("Heartbeat authentication failed, attempting relogin...");

                            // 재로그인 시도
                            var reloginTask = TryReloginAsync();
                            while (!reloginTask.IsCompleted)
                            {
                                yield return null;
                            }

                            if (!reloginTask.Result)
                            {
                                LogError("Heartbeat relogin failed, stopping heartbeat");
                                yield break; // 하트비트 중단
                            }
                        }
                        else
                        {
                            LogError($"Heartbeat failed: {innerException?.Message ?? task.Exception.Message}");
                        }
                    }
                    else if (task.IsFaulted)
                    {
                        LogError("Heartbeat task faulted");
                    }
                }
            }
        }

        /// <summary>
        /// 하트비트를 서버에 전송합니다. (예외 처리 포함)
        /// </summary>
        private async Task SendHeartbeatAsync()
        {
            try
            {
                var response = await PostRequest<BaseResponse>("/api/devices/heartbeat", "{}", true);

                if (response != null && response.success)
                {
                    Log("Heartbeat sent successfully");
                }
                else
                {
                    LogError("Heartbeat response indicated failure");
                }
            }
            catch (Exception ex)
            {
                // 예외를 상위로 전파하여 HeartbeatCoroutine에서 처리
                LogError($"Heartbeat exception: {ex.Message}");
                throw;
            }
        }

        /// <summary>
        /// 세션 만료 시 자동으로 재로그인을 시도합니다.
        /// </summary>
        /// <returns>재로그인 성공 여부</returns>
        private async Task<bool> TryReloginAsync()
        {
            // 동시성 제어: 이미 재로그인 중이면 대기
            lock (reloginLock)
            {
                if (isReloginInProgress)
                {
                    Log("Relogin already in progress, waiting...");
                    return false; // 다른 스레드가 재로그인 중
                }
                isReloginInProgress = true;
            }

            try
            {
                Log("Session expired or authentication failed. Attempting automatic relogin...");

                // 기존 토큰 및 세션 초기화
                authToken = null;
                currentSessionId = null;

                // 하트비트 중지
                if (heartbeatCoroutine != null)
                {
                    StopCoroutine(heartbeatCoroutine);
                    heartbeatCoroutine = null;
                }

                // 자동 로그인 시도
                bool loginSuccess = await AutoLogin(deviceId);

                if (loginSuccess)
                {
                    Log("Automatic relogin successful!");
                    return true;
                }
                else
                {
                    LogError("Automatic relogin failed");
                    return false;
                }
            }
            catch (Exception ex)
            {
                LogError($"Relogin exception: {ex.Message}");
                return false;
            }
            finally
            {
                lock (reloginLock)
                {
                    isReloginInProgress = false;
                }
            }
        }

        private void Log(string message)
        {
            if (enableDebugLogs)
            {
                Debug.Log($"[VRLogger] {message}");
            }
            LogToFile($"[INFO] {message}");
        }

        private void LogError(string message)
        {
            Debug.LogError($"[VRLogger] {message}");
            OnError?.Invoke(message);
            LogToFile($"[ERROR] {message}");
        }

        /// <summary>
        /// 항상 기록되는 디버그 로그 (VR 기기 디버깅용)
        /// </summary>
        private void LogDebug(string message)
        {
            Debug.Log($"[VRLogger] {message}");
            LogToFile($"[DEBUG] {message}");
        }

        #endregion

        #region Session Persistence

        /// <summary>
        /// 세션 정보를 로컬에 저장합니다.
        /// </summary>
        private void SaveSessionToLocal()
        {
            if (!persistSession) return;

            try
            {
                LogDebug("=== Saving Session to Local ===");

                // 인증 토큰 저장
                if (!string.IsNullOrEmpty(authToken))
                {
                    PlayerPrefs.SetString(PREF_AUTH_TOKEN, authToken);
                    LogDebug($"Saved auth token: {authToken.Substring(0, Math.Min(10, authToken.Length))}...");
                }

                // 세션 ID 저장
                if (!string.IsNullOrEmpty(currentSessionId))
                {
                    PlayerPrefs.SetString(PREF_SESSION_ID, currentSessionId);
                    LogDebug($"Saved session ID: {currentSessionId}");
                }

                // 디바이스 ID 저장
                if (!string.IsNullOrEmpty(deviceId))
                {
                    PlayerPrefs.SetString(PREF_DEVICE_ID, deviceId);
                }

                // 세션 저장 시간 기록 (UTC 기준)
                PlayerPrefs.SetString(PREF_SESSION_TIMESTAMP, DateTime.UtcNow.ToString("o"));

                PlayerPrefs.Save();
                LogDebug("Session saved successfully");
            }
            catch (Exception ex)
            {
                LogError($"Failed to save session to local: {ex.Message}");
            }
        }

        /// <summary>
        /// 로컬에서 세션 정보를 로드합니다.
        /// </summary>
        /// <returns>세션 로드 성공 여부</returns>
        private bool LoadSessionFromLocal()
        {
            if (!persistSession)
            {
                LogDebug("Session persistence is disabled");
                return false;
            }

            try
            {
                LogDebug("=== Loading Session from Local ===");

                // 저장된 세션이 있는지 확인
                if (!PlayerPrefs.HasKey(PREF_AUTH_TOKEN) || !PlayerPrefs.HasKey(PREF_SESSION_ID))
                {
                    LogDebug("No saved session found");
                    return false;
                }

                // 세션 만료 시간 체크
                if (PlayerPrefs.HasKey(PREF_SESSION_TIMESTAMP) && sessionExpiryHours > 0)
                {
                    string timestampStr = PlayerPrefs.GetString(PREF_SESSION_TIMESTAMP);
                    if (DateTime.TryParse(timestampStr, out DateTime savedTime))
                    {
                        var elapsed = DateTime.UtcNow - savedTime;
                        LogDebug($"Session age: {elapsed.TotalHours:F2} hours");

                        if (elapsed.TotalHours > sessionExpiryHours)
                        {
                            LogDebug($"Session expired (older than {sessionExpiryHours} hours)");
                            ClearSavedSession();
                            return false;
                        }
                    }
                }

                // 세션 정보 복원
                authToken = PlayerPrefs.GetString(PREF_AUTH_TOKEN);
                currentSessionId = PlayerPrefs.GetString(PREF_SESSION_ID);

                // 디바이스 ID도 복원 (있으면)
                if (PlayerPrefs.HasKey(PREF_DEVICE_ID))
                {
                    string savedDeviceId = PlayerPrefs.GetString(PREF_DEVICE_ID);
                    if (!string.IsNullOrEmpty(savedDeviceId))
                    {
                        deviceId = savedDeviceId;
                    }
                }

                LogDebug($"Loaded auth token: {(string.IsNullOrEmpty(authToken) ? "null" : authToken.Substring(0, Math.Min(10, authToken.Length)))}...");
                LogDebug($"Loaded session ID: {currentSessionId}");
                LogDebug($"Loaded device ID: {deviceId}");
                LogDebug("Session loaded successfully");

                return true;
            }
            catch (Exception ex)
            {
                LogError($"Failed to load session from local: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// 저장된 세션 정보를 삭제합니다.
        /// </summary>
        private void ClearSavedSession()
        {
            try
            {
                LogDebug("Clearing saved session");
                PlayerPrefs.DeleteKey(PREF_AUTH_TOKEN);
                PlayerPrefs.DeleteKey(PREF_SESSION_ID);
                PlayerPrefs.DeleteKey(PREF_SESSION_TIMESTAMP);
                // DeviceID는 유지 (재사용 가능)
                PlayerPrefs.Save();
            }
            catch (Exception ex)
            {
                LogError($"Failed to clear saved session: {ex.Message}");
            }
        }

        /// <summary>
        /// 저장된 세션이 유효한지 서버에 확인합니다.
        /// </summary>
        private async Task<bool> ValidateSavedSession()
        {
            if (!IsLoggedIn || !HasActiveSession)
            {
                LogDebug("Cannot validate session: Not logged in or no active session");
                return false;
            }

            try
            {
                LogDebug("=== Validating Saved Session ===");
                LogDebug($"Session ID: {currentSessionId}");

                // 하트비트를 통해 세션 유효성 확인
                var response = await PostRequest<BaseResponse>("/api/devices/heartbeat", "{}", true);

                if (response != null && response.success)
                {
                    LogDebug("Saved session is valid ✅");
                    return true;
                }
                else
                {
                    LogDebug("Saved session is invalid ❌");
                    return false;
                }
            }
            catch (SessionNotFoundException)
            {
                LogDebug("Saved session not found on server ❌");
                return false;
            }
            catch (AuthenticationException)
            {
                LogDebug("Saved session authentication failed ❌");
                return false;
            }
            catch (Exception ex)
            {
                LogError($"Session validation error: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// 로그를 파일에 저장 (VR 기기에서 확인용)
        /// </summary>
        private void LogToFile(string message)
        {
            if (!saveDebugLogsToFile || debugLogWriter == null) return;

            try
            {
                var timestamp = DateTime.UtcNow.Add(KoreanTimeOffset).ToString("yyyy-MM-dd HH:mm:ss.fff");
                debugLogWriter?.WriteLine($"[{timestamp}] {message}");
                debugLogWriter?.Flush(); // 즉시 파일에 쓰기
            }
            catch (Exception ex)
            {
                Debug.LogError($"[VRLogger] Failed to write to debug log file: {ex.Message}");
            }
        }

        /// <summary>
        /// 디버그 로그 파일 초기화
        /// </summary>
        private void InitializeDebugLogFile()
        {
            try
            {
                debugLogFilePath = Path.Combine(Application.persistentDataPath, "vrlogger_debug.log");

                // 파일이 너무 크면 백업하고 새로 시작
                if (File.Exists(debugLogFilePath))
                {
                    var fileInfo = new FileInfo(debugLogFilePath);
                    if (fileInfo.Length > 5 * 1024 * 1024) // 5MB 이상
                    {
                        var backupPath = Path.Combine(Application.persistentDataPath, "vrlogger_debug_old.log");
                        if (File.Exists(backupPath))
                        {
                            File.Delete(backupPath);
                        }
                        File.Move(debugLogFilePath, backupPath);
                    }
                }

                debugLogWriter = new StreamWriter(debugLogFilePath, append: true);
                debugLogWriter.AutoFlush = true;

                Debug.Log($"[VRLogger] Debug log file initialized: {debugLogFilePath}");
                LogToFile("=== VRLogger Debug Log Started ===");
            }
            catch (Exception ex)
            {
                Debug.LogError($"[VRLogger] Failed to initialize debug log file: {ex.Message}");
            }
        }

        #endregion

        #region Local Storage Methods

        private void SaveFailedLogToLocal(LogRequest request)
        {
            try
            {
                var pendingLogs = LoadLocalLogFile();
                pendingLogs.requests.Add(request);
                SaveLocalLogFile(pendingLogs);
                Log($"Saved failed log to local storage. Total pending: {pendingLogs.requests.Count}");
                OnPendingLogsChanged?.Invoke(GetPendingLogCount());
            }
            catch (Exception ex)
            {
                LogError($"Failed to save log locally: {ex.Message}");
            }
        }

        private void SavePendingLogsToLocal()
        {
            try
            {
                // 동시성 제어: 큐를 안전하게 복사
                var requestsToSave = new List<LogRequest>();
                lock (queueLock)
                {
                    if (pendingRequests.Count == 0) return;

                    // 큐의 모든 항목을 리스트로 복사
                    while (pendingRequests.Count > 0)
                    {
                        requestsToSave.Add(pendingRequests.Dequeue());
                    }
                }

                // lock 외부에서 파일 I/O 수행 (I/O는 시간이 오래 걸릴 수 있음)
                var pendingLogs = LoadLocalLogFile();
                pendingLogs.requests.AddRange(requestsToSave);
                SaveLocalLogFile(pendingLogs);
                Log($"Saved {requestsToSave.Count} pending logs to local storage");
            }
            catch (Exception ex)
            {
                LogError($"Failed to save pending logs: {ex.Message}");
            }
        }

        private void LoadPendingLogsFromLocal()
        {
            try
            {
                // lock 외부에서 파일 I/O 수행
                var pendingLogs = LoadLocalLogFile();

                if (pendingLogs.requests.Count > 0)
                {
                    Log($"Loaded {pendingLogs.requests.Count} pending logs from local storage");

                    // 동시성 제어: 큐에 안전하게 추가
                    lock (queueLock)
                    {
                        foreach (var request in pendingLogs.requests)
                        {
                            request.retryCount = 0; // Reset retry count
                            pendingRequests.Enqueue(request);
                        }
                    }

                    // Clear local file after loading
                    ClearLocalLogFile();
                    OnPendingLogsChanged?.Invoke(GetPendingLogCount());
                }
            }
            catch (Exception ex)
            {
                LogError($"Failed to load pending logs: {ex.Message}");
            }
        }

        private LogRequestList LoadLocalLogFile()
        {
            if (File.Exists(localLogFilePath))
            {
                var json = File.ReadAllText(localLogFilePath);
                return JsonUtility.FromJson<LogRequestList>(json) ?? new LogRequestList();
            }
            return new LogRequestList();
        }

        private void SaveLocalLogFile(LogRequestList logs)
        {
            var json = JsonUtility.ToJson(logs, true);
            File.WriteAllText(localLogFilePath, json);
        }

        private void ClearLocalLogFile()
        {
            if (File.Exists(localLogFilePath))
            {
                File.Delete(localLogFilePath);
            }
        }

        #endregion

        #region Network Monitoring

        private void StartNetworkMonitoring()
        {
            if (networkCheckCoroutine != null)
            {
                StopCoroutine(networkCheckCoroutine);
            }
            networkCheckCoroutine = StartCoroutine(NetworkMonitorCoroutine());
        }

        private IEnumerator NetworkMonitorCoroutine()
        {
            while (true)
            {
                yield return new WaitForSeconds(networkCheckInterval);

                var previousState = isNetworkAvailable;
                isNetworkAvailable = Application.internetReachability != NetworkReachability.NotReachable;

                // Network recovered
                if (!previousState && isNetworkAvailable)
                {
                    Log("Network recovered, attempting to resend pending logs");
                    _ = RetryPendingLogs();
                }
            }
        }

        private async Task RetryPendingLogs()
        {
            if (!IsLoggedIn || !isNetworkAvailable) return;

            // Load any locally saved logs
            LoadPendingLogsFromLocal();

            // 동시성 제어: 큐 상태를 안전하게 확인
            bool hasPendingRequests = false;
            bool isProcessing = false;
            int pendingCount = 0;

            lock (queueLock)
            {
                pendingCount = pendingRequests.Count;
                hasPendingRequests = pendingCount > 0;
            }

            lock (processingLock)
            {
                isProcessing = isProcessingQueue;
            }

            // Process queue if there are pending requests
            if (hasPendingRequests && !isProcessing)
            {
                Log($"Retrying {pendingCount} pending logs");
                await ProcessQueue();
            }
        }

        #endregion

        #region Daily Log Archive

        private string GetDailyLogFilePath(DateTime koreanDateTime)
        {
            var dateString = koreanDateTime.ToString("yyyy-MM-dd");
            return Path.Combine(logsDirectoryPath, $"{dateString}.json");
        }

        private void SaveToDailyLog(LogRequest request, DateTime koreanTime)
        {
            try
            {
                var dailyLogFile = GetDailyLogFilePath(koreanTime);
                var dailyLogs = LoadDailyLogFile(dailyLogFile);

                var entry = new DailyLogEntry
                {
                    timestamp = request.timestamp,
                    endpoint = request.endpoint,
                    body = request.body,
                    session_id = currentSessionId ?? "",
                    device_id = deviceId
                };

                dailyLogs.entries.Add(entry);
                SaveDailyLogFile(dailyLogFile, dailyLogs);

                Log($"Saved log to daily archive: {koreanTime:yyyy-MM-dd}");
            }
            catch (Exception ex)
            {
                LogError($"Failed to save daily log: {ex.Message}");
            }
        }

        private DailyLogList LoadDailyLogFile(string filePath)
        {
            if (File.Exists(filePath))
            {
                var json = File.ReadAllText(filePath);
                return JsonUtility.FromJson<DailyLogList>(json) ?? new DailyLogList();
            }
            return new DailyLogList();
        }

        private void SaveDailyLogFile(string filePath, DailyLogList logs)
        {
            var json = JsonUtility.ToJson(logs, true);
            File.WriteAllText(filePath, json);
        }

        #endregion

        #region Data Classes

        /// <summary>
        /// 인증 실패 예외 클래스 (401, 403)
        /// </summary>
        private class AuthenticationException : Exception
        {
            public long StatusCode { get; }

            public AuthenticationException(long statusCode, string message) : base(message)
            {
                StatusCode = statusCode;
            }
        }

        /// <summary>
        /// 세션 없음 예외 클래스 (404 - Session not found)
        /// </summary>
        private class SessionNotFoundException : Exception
        {
            public SessionNotFoundException(string message) : base(message)
            {
            }
        }

        /// <summary>
        /// Rate Limit 초과 예외 클래스 (429 - Too Many Requests)
        /// </summary>
        private class RateLimitException : Exception
        {
            public RateLimitException(string message) : base(message)
            {
            }
        }

        /// <summary>
        /// HTTPS 인증서 검증 우회 핸들러 (개발용)
        /// </summary>
        private class AcceptAllCertificatesHandler : UnityEngine.Networking.CertificateHandler
        {
            protected override bool ValidateCertificate(byte[] certificateData)
            {
                // 모든 인증서를 허용 (개발/테스트용)
                return true;
            }
        }

        [Serializable]
        private class BaseResponse
        {
            public bool success;
        }

        [Serializable]
        private class DeviceRegistrationRequest
        {
            public string device_id;
        }

        [Serializable]
        private class DeviceRegistrationResponse
        {
            public bool success;
            public DeviceInfo device;
            public string token;
            public bool is_new_device;
        }

        [Serializable]
        private class DeviceInfo
        {
            public string id;
            public string device_id;
            public string model;
            public bool is_active;
        }

        [Serializable]
        private class SessionStartResponse
        {
            public bool success;
            public string session_id;
            public string start_time;
        }

        [Serializable]
        private class SessionEndRequest
        {
            public string session_id;
            public int lobby_time;
        }

        [Serializable]
        private class SessionEndResponse
        {
            public bool success;
            public string session_id;
            public int duration;
            public int content_count;
        }

        [Serializable]
        private class ContentSelectRequest
        {
            public string session_id;
            public string content_id;
            public string content_name;
        }

        [Serializable]
        private class ContentWatchRequest
        {
            public string session_id;
            public string content_id;
            public string content_name;
            public string action_type;
            public int duration;
        }

        [Serializable]
        private class LogRequest
        {
            public string endpoint;
            public string body;
            public int retryCount;
            public string timestamp;
        }

        [Serializable]
        private class LogRequestList
        {
            public List<LogRequest> requests = new List<LogRequest>();
        }

        [Serializable]
        public class DailyLogEntry
        {
            public string timestamp;
            public string endpoint;
            public string body;
            public string session_id;
            public string device_id;
        }

        [Serializable]
        public class DailyLogList
        {
            public List<DailyLogEntry> entries = new List<DailyLogEntry>();
        }

        #endregion

        #region Video Helper Methods

        public DashboardVideoLoader.Video GetVideoFileNameByID()
        {
            return dashboardVideoLoader.GetfileName(currentVideoID);
        }

        #endregion
    }
}
