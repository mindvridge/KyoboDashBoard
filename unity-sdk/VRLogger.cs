using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
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
        [SerializeField] private string serverUrl = "http://localhost:3001";

        [Header("Device Configuration")]
        [SerializeField] private string deviceId;
        [SerializeField] private string macAddress;
        [SerializeField] private string spaceId;
        [SerializeField] private string deviceName;
        [SerializeField] private string model = "Meta Quest 3";

        [Header("Settings")]
        [SerializeField] private bool autoLogin = true;
        [SerializeField] private float heartbeatInterval = 60f;
        [SerializeField] private bool enableDebugLogs = true;
        #endregion

        #region Private Fields
        private string authToken;
        private string currentSessionId;
        private bool isInitialized = false;
        private Queue<LogRequest> pendingRequests = new Queue<LogRequest>();
        private bool isProcessingQueue = false;
        private Coroutine heartbeatCoroutine;
        #endregion

        #region Events
        public event Action<bool> OnLoginComplete;
        public event Action<string> OnSessionStarted;
        public event Action OnSessionEnded;
        public event Action<string> OnError;
        #endregion

        #region Properties
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

            // Get MAC address (platform specific)
            if (string.IsNullOrEmpty(macAddress))
            {
                macAddress = GetMacAddress();
            }
        }

        private void Start()
        {
            if (autoLogin)
            {
                _ = AutoLogin();
            }
        }

        private void OnApplicationQuit()
        {
            if (HasActiveSession)
            {
                // Synchronous session end on quit
                StartCoroutine(EndSessionCoroutine(0));
            }
        }

        private void OnApplicationPause(bool pauseStatus)
        {
            if (pauseStatus && HasActiveSession)
            {
                // App going to background - end session
                _ = LogSessionEnd();
            }
            else if (!pauseStatus && IsLoggedIn && !HasActiveSession)
            {
                // App resuming - start new session
                _ = StartSession();
            }
        }
        #endregion

        #region Public API Methods

        /// <summary>
        /// 기기를 서버에 자동 등록하고 로그인합니다.
        /// </summary>
        public async Task<bool> AutoLogin()
        {
            return await AutoLogin(deviceId, macAddress);
        }

        /// <summary>
        /// 지정된 기기 정보로 자동 등록 및 로그인합니다.
        /// </summary>
        public async Task<bool> AutoLogin(string deviceId, string macAddress)
        {
            try
            {
                var request = new DeviceRegistrationRequest
                {
                    device_id = deviceId,
                    mac_address = macAddress,
                    space_id = spaceId,
                    device_name = deviceName,
                    model = model
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
        /// 콘텐츠 선택 이벤트를 로그합니다.
        /// </summary>
        public async Task<bool> LogContentSelect(string contentId, string contentName, Dictionary<string, object> metadata = null)
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
        /// 콘텐츠 시청 시작을 로그합니다.
        /// </summary>
        public async Task<bool> LogWatchStart(string contentId, string contentName)
        {
            return await LogWatchEvent(contentId, contentName, "WATCH_START", 0);
        }

        /// <summary>
        /// 콘텐츠 시청 종료를 로그합니다.
        /// </summary>
        public async Task<bool> LogWatchEnd(string contentId, string contentName, float durationSeconds)
        {
            return await LogWatchEvent(contentId, contentName, "WATCH_END", durationSeconds);
        }

        /// <summary>
        /// 콘텐츠 일시정지를 로그합니다.
        /// </summary>
        public async Task<bool> LogWatchPause(string contentId, string contentName)
        {
            return await LogWatchEvent(contentId, contentName, "WATCH_PAUSE", 0);
        }

        /// <summary>
        /// 콘텐츠 재생 재개를 로그합니다.
        /// </summary>
        public async Task<bool> LogWatchResume(string contentId, string contentName)
        {
            return await LogWatchEvent(contentId, contentName, "WATCH_RESUME", 0);
        }

        /// <summary>
        /// 시청 시간을 로그합니다 (간편 메서드).
        /// </summary>
        public async Task<bool> LogWatchTime(string contentId, float durationSeconds)
        {
            return await LogWatchEvent(contentId, "", "WATCH_END", durationSeconds);
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
        /// 로비 입장 이벤트를 로그합니다.
        /// </summary>
        public async Task<bool> LogLobbyEnter()
        {
            return await LogLobbyEvent("LOBBY_ENTER");
        }

        /// <summary>
        /// 로비 퇴장 이벤트를 로그합니다.
        /// </summary>
        public async Task<bool> LogLobbyExit()
        {
            return await LogLobbyEvent("LOBBY_EXIT");
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

        private async Task<bool> LogLobbyEvent(string actionType)
        {
            if (!HasActiveSession)
            {
                LogError("Cannot log: No active session");
                return false;
            }

            var request = new LobbyEventRequest
            {
                session_id = currentSessionId,
                action_type = actionType
            };

            return await QueueRequest("/api/logs/lobby", JsonUtility.ToJson(request));
        }

        private async Task<bool> QueueRequest(string endpoint, string jsonBody)
        {
            pendingRequests.Enqueue(new LogRequest { endpoint = endpoint, body = jsonBody });

            if (!isProcessingQueue)
            {
                await ProcessQueue();
            }

            return true;
        }

        private async Task ProcessQueue()
        {
            isProcessingQueue = true;

            while (pendingRequests.Count > 0)
            {
                var request = pendingRequests.Dequeue();

                try
                {
                    await PostRequest<BaseResponse>(request.endpoint, request.body, true);
                }
                catch (Exception ex)
                {
                    LogError($"Failed to process request: {ex.Message}");
                    // Re-queue on failure (with max retries in production)
                }

                // Small delay between requests
                await Task.Delay(50);
            }

            isProcessingQueue = false;
        }

        private async Task<T> PostRequest<T>(string endpoint, string jsonBody, bool authenticated) where T : class
        {
            var url = serverUrl + endpoint;
            var tcs = new TaskCompletionSource<T>();

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

        private string GetMacAddress()
        {
            // Platform-specific MAC address retrieval
            #if UNITY_ANDROID && !UNITY_EDITOR
            try
            {
                using (var unityPlayer = new AndroidJavaClass("com.unity3d.player.UnityPlayer"))
                using (var activity = unityPlayer.GetStatic<AndroidJavaObject>("currentActivity"))
                using (var wifiManager = activity.Call<AndroidJavaObject>("getSystemService", "wifi"))
                using (var wifiInfo = wifiManager.Call<AndroidJavaObject>("getConnectionInfo"))
                {
                    return wifiInfo.Call<string>("getMacAddress");
                }
            }
            catch
            {
                return GeneratePseudoMac();
            }
            #else
            return GeneratePseudoMac();
            #endif
        }

        private string GeneratePseudoMac()
        {
            // Generate a consistent pseudo-MAC based on device ID
            var hash = deviceId.GetHashCode();
            return $"{(hash & 0xFF):X2}:{((hash >> 8) & 0xFF):X2}:{((hash >> 16) & 0xFF):X2}:" +
                   $"{((hash >> 24) & 0xFF):X2}:{(hash & 0xFF):X2}:{((hash >> 8) & 0xFF):X2}";
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
            public string mac_address;
            public string space_id;
            public string device_name;
            public string model;
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
            public string mac_address;
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
        private class LobbyEventRequest
        {
            public string session_id;
            public string action_type;
        }

        [Serializable]
        private class ContentSwitchRequest
        {
            public string session_id;
            public string from_content_id;
            public string to_content_id;
            public string to_content_name;
        }

        private class LogRequest
        {
            public string endpoint;
            public string body;
        }

        #endregion
    }
}
