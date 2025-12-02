using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Networking;

namespace KyoboDashboard
{
    #region Data Models

    /// <summary>
    /// 비디오 데이터 모델
    /// </summary>
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
        public bool is_preinstalled;
        public bool is_active;
        public int sort_order;
        public string created_at;
        public string updated_at;
    }

    /// <summary>
    /// API 응답 모델
    /// </summary>
    [Serializable]
    public class VideoListResponse
    {
        public bool success;
        public Video[] data;
        public int count;
    }

    /// <summary>
    /// API 에러 응답
    /// </summary>
    [Serializable]
    public class ApiError
    {
        public bool success;
        public ErrorDetail error;
    }

    [Serializable]
    public class ErrorDetail
    {
        public string code;
        public string message;
    }

    #endregion

    #region Video Service

    /// <summary>
    /// 비디오 API 서비스
    /// 서버에서 비디오 목록을 가져오는 기능 제공
    /// </summary>
    public class VideoService : MonoBehaviour
    {
        [Header("API Configuration")]
        [SerializeField] private string apiBaseUrl = "https://kyobodashboard-production.up.railway.app";
        [SerializeField] private float requestTimeout = 30f;

        [Header("Cache Settings")]
        [SerializeField] private bool enableCache = true;
        [SerializeField] private float cacheExpireSeconds = 300f; // 5분

        private List<Video> cachedVideos;
        private DateTime cacheTimestamp;

        public static VideoService Instance { get; private set; }

        // 이벤트
        public event Action<List<Video>> OnVideosLoaded;
        public event Action<string> OnError;

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                DontDestroyOnLoad(gameObject);
            }
            else
            {
                Destroy(gameObject);
            }
        }

        #region Public Methods

        /// <summary>
        /// 전체 비디오 목록 가져오기
        /// </summary>
        /// <param name="activeOnly">활성화된 비디오만 가져올지 여부</param>
        /// <param name="forceRefresh">캐시 무시하고 새로 가져올지 여부</param>
        public void GetVideos(bool activeOnly = true, bool forceRefresh = false)
        {
            StartCoroutine(GetVideosCoroutine(activeOnly, forceRefresh));
        }

        /// <summary>
        /// 비디오 목록 가져오기 (콜백 방식)
        /// </summary>
        public void GetVideos(Action<List<Video>> onSuccess, Action<string> onError = null, bool activeOnly = true)
        {
            StartCoroutine(GetVideosCoroutine(activeOnly, false, onSuccess, onError));
        }

        /// <summary>
        /// 캐시된 비디오 목록 반환 (동기)
        /// </summary>
        public List<Video> GetCachedVideos()
        {
            if (IsCacheValid())
            {
                return cachedVideos;
            }
            return null;
        }

        /// <summary>
        /// 캐시 초기화
        /// </summary>
        public void ClearCache()
        {
            cachedVideos = null;
            cacheTimestamp = DateTime.MinValue;
        }

        #endregion

        #region Private Methods

        private IEnumerator GetVideosCoroutine(
            bool activeOnly,
            bool forceRefresh,
            Action<List<Video>> onSuccess = null,
            Action<string> onError = null)
        {
            // 캐시 확인
            if (!forceRefresh && IsCacheValid())
            {
                Debug.Log("[VideoService] 캐시된 비디오 목록 사용");
                var videos = cachedVideos;
                onSuccess?.Invoke(videos);
                OnVideosLoaded?.Invoke(videos);
                yield break;
            }

            // API URL 구성
            string endpoint = activeOnly ? "/api/videos?active_only=true" : "/api/videos";
            string url = apiBaseUrl + endpoint;

            Debug.Log($"[VideoService] 비디오 목록 요청: {url}");

            using (UnityWebRequest request = UnityWebRequest.Get(url))
            {
                request.timeout = (int)requestTimeout;
                request.SetRequestHeader("Content-Type", "application/json");

                yield return request.SendWebRequest();

                if (request.result == UnityWebRequest.Result.Success)
                {
                    try
                    {
                        string json = request.downloadHandler.text;
                        Debug.Log($"[VideoService] 응답: {json}");

                        VideoListResponse response = JsonUtility.FromJson<VideoListResponse>(json);

                        if (response.success && response.data != null)
                        {
                            List<Video> videos = new List<Video>(response.data);

                            // 캐시 저장
                            if (enableCache)
                            {
                                cachedVideos = videos;
                                cacheTimestamp = DateTime.Now;
                            }

                            Debug.Log($"[VideoService] {videos.Count}개 비디오 로드 완료");

                            onSuccess?.Invoke(videos);
                            OnVideosLoaded?.Invoke(videos);
                        }
                        else
                        {
                            string errorMsg = "비디오 목록을 가져오는데 실패했습니다.";
                            Debug.LogError($"[VideoService] {errorMsg}");
                            onError?.Invoke(errorMsg);
                            OnError?.Invoke(errorMsg);
                        }
                    }
                    catch (Exception e)
                    {
                        string errorMsg = $"JSON 파싱 오류: {e.Message}";
                        Debug.LogError($"[VideoService] {errorMsg}");
                        onError?.Invoke(errorMsg);
                        OnError?.Invoke(errorMsg);
                    }
                }
                else
                {
                    string errorMsg = $"API 요청 실패: {request.error}";
                    Debug.LogError($"[VideoService] {errorMsg}");
                    onError?.Invoke(errorMsg);
                    OnError?.Invoke(errorMsg);
                }
            }
        }

        private bool IsCacheValid()
        {
            if (!enableCache || cachedVideos == null)
                return false;

            return (DateTime.Now - cacheTimestamp).TotalSeconds < cacheExpireSeconds;
        }

        #endregion
    }

    #endregion

    #region Example Usage

    /// <summary>
    /// VideoService 사용 예제
    /// </summary>
    public class VideoListExample : MonoBehaviour
    {
        [SerializeField] private VideoService videoService;

        private void Start()
        {
            // VideoService가 없으면 찾기
            if (videoService == null)
            {
                videoService = VideoService.Instance;
            }

            // 이벤트 구독
            if (videoService != null)
            {
                videoService.OnVideosLoaded += HandleVideosLoaded;
                videoService.OnError += HandleError;

                // 비디오 목록 요청
                LoadVideos();
            }
        }

        private void OnDestroy()
        {
            // 이벤트 구독 해제
            if (videoService != null)
            {
                videoService.OnVideosLoaded -= HandleVideosLoaded;
                videoService.OnError -= HandleError;
            }
        }

        /// <summary>
        /// 비디오 목록 로드 (이벤트 방식)
        /// </summary>
        public void LoadVideos()
        {
            videoService.GetVideos(activeOnly: true);
        }

        /// <summary>
        /// 비디오 목록 로드 (콜백 방식)
        /// </summary>
        public void LoadVideosWithCallback()
        {
            videoService.GetVideos(
                onSuccess: (videos) =>
                {
                    Debug.Log($"콜백: {videos.Count}개 비디오 로드됨");
                    foreach (var video in videos)
                    {
                        Debug.Log($"- {video.title} ({video.filename})");
                    }
                },
                onError: (error) =>
                {
                    Debug.LogError($"콜백 에러: {error}");
                },
                activeOnly: true
            );
        }

        /// <summary>
        /// 비디오 목록 로드 이벤트 핸들러
        /// </summary>
        private void HandleVideosLoaded(List<Video> videos)
        {
            Debug.Log($"=== 비디오 목록 ({videos.Count}개) ===");

            foreach (var video in videos)
            {
                Debug.Log($"[{video.index}] {video.title}");
                Debug.Log($"    파일: {video.filename}");
                Debug.Log($"    URL: {video.file_url}");
                Debug.Log($"    썸네일: {video.thumbnail_url}");
                Debug.Log($"    길이: {video.duration}초");
                Debug.Log($"    크기: {FormatFileSize(video.file_size)}");
                Debug.Log($"    사전설치: {video.is_preinstalled}");
                Debug.Log("---");
            }
        }

        /// <summary>
        /// 에러 핸들러
        /// </summary>
        private void HandleError(string error)
        {
            Debug.LogError($"비디오 로드 실패: {error}");
            // UI에 에러 메시지 표시 등
        }

        /// <summary>
        /// 파일 크기 포맷팅
        /// </summary>
        private string FormatFileSize(long bytes)
        {
            if (bytes < 1024) return $"{bytes} B";
            if (bytes < 1024 * 1024) return $"{bytes / 1024f:F1} KB";
            if (bytes < 1024 * 1024 * 1024) return $"{bytes / (1024f * 1024f):F1} MB";
            return $"{bytes / (1024f * 1024f * 1024f):F2} GB";
        }
    }

    #endregion
}
