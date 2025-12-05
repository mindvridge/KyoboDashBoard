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

        [Header("Local Storage Settings")]
        [SerializeField] private int maxRetryCount = 3;
        [SerializeField] private float networkCheckInterval = 10f;
        #endregion

        #region Private Fields
        private string authToken;
        private string currentSessionId;
        private bool isInitialized = false;
        private Queue<LogRequest> pendingRequests = new Queue<LogRequest>();
        private bool isProcessingQueue = false;
        private Coroutine heartbeatCoroutine;
        private Coroutine networkCheckCoroutine;
        private bool isNetworkAvailable = true;
        private string localLogFilePath;
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

            // Auto-generate device ID if not set
            if (string.IsNullOrEmpty(deviceId))
            {
                deviceId = SystemInfo.deviceUniqueIdentifier;
            }

            // Initialize local log file path
            localLogFilePath = Path.Combine(Application.persistentDataPath, "pending_logs.json");
            Log($"Local log file path: {localLogFilePath}");
        }

        private void Start()
        {
            // Load any pending logs from local storage
            LoadPendingLogsFromLocal();

            // Start network monitoring
            StartNetworkMonitoring();

            if (autoLogin)
            {
                _ = AutoLogin();
            }

            if (dashboardVideoLoader == null)
                dashboardVideoLoader = this.GetComponent<DashboardVideoLoader>();
        }

        private void OnApplicationQuit()
        {
            // Save any pending logs to local storage before quit
            SavePendingLogsToLocal();

            if (HasActiveSession)
            {
                // Synchronous session end on quit
                StartCoroutine(EndSessionCoroutine(0));
            }
        }

        private void OnApplicationPause(bool pauseStatus)
        {
            if (pauseStatus)
            {
                // App going to background - save pending logs
                SavePendingLogsToLocal();

                if (HasActiveSession)
                {
                    _ = LogSessionEnd();
                }
            }
            else
            {
                // App resuming - try to resend pending logs
                if (IsLoggedIn)
                {
                    _ = RetryPendingLogs();

                    if (!HasActiveSession)
                    {
                        _ = StartSession();
                    }
                }
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
                var request = new DeviceRegistrationRequest
                {
                    device_id = deviceId,
                };

                var response = await PostRequest<DeviceRegistrationResponse>(
                    "/api/devices/register",
                    JsonUtility.ToJson(request),
                    false
                );

                if (response != null && response.success)
                {
                    authToken = response.token;
                    isInitialized = true;

                    Log($"Device registered: {response.device.device_id}, New: {response.is_new_device}");

                    OnLoginComplete?.Invoke(true);

                    // Start session automatically
                    await StartSession();

                    // Start heartbeat
                    StartHeartbeat();

                    // Try to send any pending logs after successful login
                    _ = RetryPendingLogs();

                    return true;
                }

                OnLoginComplete?.Invoke(false);
                return false;
            }
            catch (Exception ex)
            {
                LogError($"AutoLogin failed: {ex.Message}");
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
                var response = await PostRequest<SessionStartResponse>(
                    "/api/sessions/start",
                    "{}",
                    true
                );

                if (response != null && response.success)
                {
                    currentSessionId = response.session_id;
                    Log($"Session started: {currentSessionId}");
                    OnSessionStarted?.Invoke(currentSessionId);
                    return true;
                }

                return false;
            }
            catch (Exception ex)
            {
                LogError($"StartSession failed: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// 콘텐츠 선택 이벤트를 로그합니다. (간편 메서드)
        /// </summary>
        public void LogContentSelect(int contentId)
        {
            currentVideoID = contentId;
            // Fire and forget, but handle errors
            _ = LogContentSelectAsync(contentId.ToString(), "");
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
            return await LogWatchEvent(contentId, contentName, "WATCH_START", 0);
        }

        /// <summary>
        /// 콘텐츠 시청 종료를 로그합니다. (간편 메서드 - Fire and Forget)
        /// </summary>
        public void LogWatchEnd(string contentId, string contentName, float durationSeconds)
        {
            // Fire and forget, but handle errors internally
            _ = LogWatchEndAsync(contentId, contentName, durationSeconds);
        }

        /// <summary>
        /// 콘텐츠 시청 종료를 로그합니다. (async 버전)
        /// </summary>
        public async Task<bool> LogWatchEndAsync(string contentId, string contentName, float durationSeconds)
        {
            return await LogWatchEvent(contentId, contentName, "WATCH_END", durationSeconds);
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
        /// 콘텐츠 전환 이벤트를 로그합니다.
        /// </summary>
        public async Task<bool> LogContentSwitch(string fromContentId, string toContentId, string toContentName)
        {
            if (!HasActiveSession)
            {
                LogError("Cannot log: No active session");
                return false;
            }

            var request = new ContentSwitchRequest
            {
                session_id = currentSessionId,
                from_content_id = fromContentId,
                to_content_id = toContentId,
                to_content_name = toContentName
            };

            return await QueueRequest("/api/logs/content-switch", JsonUtility.ToJson(request));
        }

        /// <summary>
        /// 로컬에 저장된 대기 중인 로그 개수를 반환합니다.
        /// </summary>
        public int GetPendingLogCount()
        {
            var localLogs = LoadLocalLogFile();
            return pendingRequests.Count + localLogs.requests.Count;
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
            return pendingRequests.Count == 0;
        }

        #endregion

        #region Private Methods

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
            var logRequest = new LogRequest
            {
                endpoint = endpoint,
                body = jsonBody,
                retryCount = 0,
                timestamp = DateTime.UtcNow.ToString("o")
            };

            pendingRequests.Enqueue(logRequest);
            OnPendingLogsChanged?.Invoke(GetPendingLogCount());

            if (!isProcessingQueue)
            {
                await ProcessQueue();
            }

            return true;
        }

        private async Task ProcessQueue()
        {
            isProcessingQueue = true;
            var failedRequests = new List<LogRequest>();

            while (pendingRequests.Count > 0)
            {
                var request = pendingRequests.Dequeue();

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

                // Small delay between requests
                await Task.Delay(50);
            }

            // Re-queue failed requests for retry
            foreach (var failed in failedRequests)
            {
                pendingRequests.Enqueue(failed);
            }

            isProcessingQueue = false;
            OnPendingLogsChanged?.Invoke(GetPendingLogCount());

            // If there are still pending requests, retry after delay
            if (pendingRequests.Count > 0 && isNetworkAvailable)
            {
                await Task.Delay(2000); // Wait 2 seconds before retry
                await ProcessQueue();
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

                if (authenticated && !string.IsNullOrEmpty(authToken))
                {
                    request.SetRequestHeader("Authorization", $"Bearer {authToken}");
                }

                var operation = request.SendWebRequest();

                while (!operation.isDone)
                {
                    await Task.Yield();
                }

                if (request.result == UnityWebRequest.Result.Success)
                {
                    var response = JsonUtility.FromJson<T>(request.downloadHandler.text);
                    return response;
                }
                else
                {
                    LogError($"Request failed: {request.error} - {request.downloadHandler.text}");
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
                    _ = PostRequest<BaseResponse>("/api/devices/heartbeat", "{}", true);
                }
            }
        }

        private IEnumerator EndSessionCoroutine(float lobbyTime)
        {
            if (!HasActiveSession) yield break;

            var request = new SessionEndRequest
            {
                session_id = currentSessionId,
                lobby_time = Mathf.RoundToInt(lobbyTime)
            };

            using (var webRequest = new UnityWebRequest(serverUrl + "/api/sessions/end", "POST"))
            {
                byte[] bodyRaw = Encoding.UTF8.GetBytes(JsonUtility.ToJson(request));
                webRequest.uploadHandler = new UploadHandlerRaw(bodyRaw);
                webRequest.downloadHandler = new DownloadHandlerBuffer();
                webRequest.SetRequestHeader("Content-Type", "application/json");
                webRequest.SetRequestHeader("Authorization", $"Bearer {authToken}");

                yield return webRequest.SendWebRequest();
                currentSessionId = null;
            }
        }

        private void Log(string message)
        {
            if (enableDebugLogs)
            {
                Debug.Log($"[VRLogger] {message}");
            }
        }

        private void LogError(string message)
        {
            Debug.LogError($"[VRLogger] {message}");
            OnError?.Invoke(message);
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
                if (pendingRequests.Count == 0) return;

                var pendingLogs = LoadLocalLogFile();
                while (pendingRequests.Count > 0)
                {
                    pendingLogs.requests.Add(pendingRequests.Dequeue());
                }
                SaveLocalLogFile(pendingLogs);
                Log($"Saved {pendingLogs.requests.Count} pending logs to local storage");
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
                var pendingLogs = LoadLocalLogFile();
                if (pendingLogs.requests.Count > 0)
                {
                    Log($"Loaded {pendingLogs.requests.Count} pending logs from local storage");
                    foreach (var request in pendingLogs.requests)
                    {
                        request.retryCount = 0; // Reset retry count
                        pendingRequests.Enqueue(request);
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

            // Process queue if there are pending requests
            if (pendingRequests.Count > 0 && !isProcessingQueue)
            {
                Log($"Retrying {pendingRequests.Count} pending logs");
                await ProcessQueue();
            }
        }

        #endregion

        #region Data Classes

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
        private class ContentSwitchRequest
        {
            public string session_id;
            public string from_content_id;
            public string to_content_id;
            public string to_content_name;
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

        #endregion

        #region Video Helper Methods

        public DashboardVideoLoader.Video GetVideoFileNameByID()
        {
            return dashboardVideoLoader.GetfileName(currentVideoID);
        }

        #endregion
    }
}
