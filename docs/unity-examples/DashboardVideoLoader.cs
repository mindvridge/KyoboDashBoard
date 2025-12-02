using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

namespace KyoboDashboard
{
    /// <summary>
    /// 대시보드에서 다운로드한 JSON 파일을 파싱하는 클래스
    /// JSON 배열 형식을 직접 지원합니다.
    /// </summary>
    public class DashboardVideoLoader : MonoBehaviour
    {
        #region Data Models

        [Serializable]
        public class Video
        {
            public int index;
            public string filename;
            public string title;
            public string description;
            public string file_url;
            public string thumbnail_url;
            public int duration;
            public long file_size;

            /// <summary>
            /// description에서 Rich Text 태그를 제거한 순수 텍스트 반환
            /// </summary>
            public string GetPlainDescription()
            {
                if (string.IsNullOrEmpty(description)) return "";

                string text = description;
                // Unity Rich Text 태그 제거
                text = System.Text.RegularExpressions.Regex.Replace(text, @"<[^>]+>", "");
                // 연속 줄바꿈 정리
                text = System.Text.RegularExpressions.Regex.Replace(text, @"\n+", "\n");
                return text.Trim();
            }
        }

        /// <summary>
        /// JSON 배열을 파싱하기 위한 래퍼 클래스
        /// JsonUtility는 배열을 직접 파싱할 수 없으므로 래퍼 필요
        /// </summary>
        [Serializable]
        private class VideoArrayWrapper
        {
            public Video[] items;
        }

        #endregion

        #region Events

        public event Action<List<Video>> OnVideosLoaded;
        public event Action<string> OnLoadError;

        #endregion

        #region Singleton (Optional)

        private static DashboardVideoLoader _instance;
        public static DashboardVideoLoader Instance
        {
            get
            {
                if (_instance == null)
                {
                    var go = new GameObject("DashboardVideoLoader");
                    _instance = go.AddComponent<DashboardVideoLoader>();
                    DontDestroyOnLoad(go);
                }
                return _instance;
            }
        }

        #endregion

        #region Public Methods

        /// <summary>
        /// StreamingAssets에서 JSON 파일 로드
        /// 파일 위치: Assets/StreamingAssets/videos.json
        /// </summary>
        public void LoadFromStreamingAssets(string fileName = "videos.json", Action<List<Video>> onSuccess = null, Action<string> onError = null)
        {
            StartCoroutine(LoadFromStreamingAssetsCoroutine(fileName, onSuccess, onError));
        }

        /// <summary>
        /// Resources에서 JSON 파일 로드 (동기)
        /// 파일 위치: Assets/Resources/videos.json (확장자 제외)
        /// </summary>
        public List<Video> LoadFromResources(string resourcePath = "videos")
        {
            TextAsset jsonAsset = Resources.Load<TextAsset>(resourcePath);

            if (jsonAsset == null)
            {
                string error = $"Resources에서 파일을 찾을 수 없습니다: {resourcePath}";
                Debug.LogError($"[DashboardVideoLoader] {error}");
                OnLoadError?.Invoke(error);
                return null;
            }

            return ParseJsonArray(jsonAsset.text);
        }

        /// <summary>
        /// PersistentDataPath에서 JSON 파일 로드
        /// </summary>
        public List<Video> LoadFromPersistentData(string fileName = "videos.json")
        {
            string filePath = Path.Combine(Application.persistentDataPath, fileName);
            return LoadFromFile(filePath);
        }

        /// <summary>
        /// 절대 경로에서 JSON 파일 로드
        /// </summary>
        public List<Video> LoadFromFile(string absolutePath)
        {
            if (!File.Exists(absolutePath))
            {
                string error = $"파일이 존재하지 않습니다: {absolutePath}";
                Debug.LogError($"[DashboardVideoLoader] {error}");
                OnLoadError?.Invoke(error);
                return null;
            }

            string json = File.ReadAllText(absolutePath);
            return ParseJsonArray(json);
        }

        /// <summary>
        /// JSON 문자열에서 직접 파싱
        /// 배열 형식 JSON을 지원합니다.
        /// </summary>
        public List<Video> ParseJsonArray(string json)
        {
            if (string.IsNullOrEmpty(json))
            {
                OnLoadError?.Invoke("JSON 문자열이 비어있습니다.");
                return new List<Video>();
            }

            try
            {
                json = json.Trim();
                List<Video> videos = new List<Video>();

                // JSON이 배열로 시작하는 경우 (대시보드 다운로드 형식)
                if (json.StartsWith("["))
                {
                    // JsonUtility는 배열을 직접 파싱 못함 -> 래퍼로 감싸기
                    string wrappedJson = "{\"items\":" + json + "}";
                    VideoArrayWrapper wrapper = JsonUtility.FromJson<VideoArrayWrapper>(wrappedJson);

                    if (wrapper != null && wrapper.items != null)
                    {
                        videos = new List<Video>(wrapper.items);
                    }
                }
                // JSON이 객체로 시작하는 경우 (API 응답 형식)
                else if (json.StartsWith("{"))
                {
                    // data 필드가 있는 경우 시도
                    if (json.Contains("\"data\""))
                    {
                        // API 응답 형식: { "success": true, "data": [...], "count": n }
                        ApiResponseWrapper apiWrapper = JsonUtility.FromJson<ApiResponseWrapper>(json);
                        if (apiWrapper != null && apiWrapper.data != null)
                        {
                            videos = new List<Video>(apiWrapper.data);
                        }
                    }
                }

                Debug.Log($"[DashboardVideoLoader] {videos.Count}개 비디오 로드됨");

                // 결과 로깅
                foreach (var video in videos)
                {
                    Debug.Log($"  [{video.index}] {video.title} - {video.filename}");
                }

                OnVideosLoaded?.Invoke(videos);
                return videos;
            }
            catch (Exception e)
            {
                string error = $"JSON 파싱 오류: {e.Message}";
                Debug.LogError($"[DashboardVideoLoader] {error}");
                OnLoadError?.Invoke(error);
                return new List<Video>();
            }
        }

        #endregion

        #region Private Methods

        private IEnumerator LoadFromStreamingAssetsCoroutine(string fileName, Action<List<Video>> onSuccess, Action<string> onError)
        {
            string filePath = Path.Combine(Application.streamingAssetsPath, fileName);
            string json = null;

            // Android/WebGL에서는 UnityWebRequest 필요
            if (filePath.Contains("://") || filePath.Contains(":///"))
            {
                using (UnityEngine.Networking.UnityWebRequest request =
                    UnityEngine.Networking.UnityWebRequest.Get(filePath))
                {
                    yield return request.SendWebRequest();

                    if (request.result == UnityEngine.Networking.UnityWebRequest.Result.Success)
                    {
                        json = request.downloadHandler.text;
                    }
                    else
                    {
                        string error = $"StreamingAssets 로드 실패: {request.error}";
                        Debug.LogError($"[DashboardVideoLoader] {error}");
                        onError?.Invoke(error);
                        OnLoadError?.Invoke(error);
                        yield break;
                    }
                }
            }
            else
            {
                // PC, iOS에서는 직접 파일 읽기
                if (File.Exists(filePath))
                {
                    json = File.ReadAllText(filePath);
                }
                else
                {
                    string error = $"파일이 존재하지 않습니다: {filePath}";
                    Debug.LogError($"[DashboardVideoLoader] {error}");
                    onError?.Invoke(error);
                    OnLoadError?.Invoke(error);
                    yield break;
                }
            }

            List<Video> videos = ParseJsonArray(json);
            onSuccess?.Invoke(videos);
        }

        #endregion

        #region Helper Classes

        [Serializable]
        private class ApiResponseWrapper
        {
            public bool success;
            public Video[] data;
            public int count;
        }

        #endregion
    }

    #region Usage Example

    /// <summary>
    /// DashboardVideoLoader 사용 예제
    /// 대시보드에서 다운로드한 JSON 파일을 로드합니다.
    /// </summary>
    public class DashboardVideoExample : MonoBehaviour
    {
        [Header("Settings")]
        [SerializeField] private string jsonFileName = "videos.json";

        private void Start()
        {
            // 이벤트 구독
            DashboardVideoLoader.Instance.OnVideosLoaded += HandleVideosLoaded;
            DashboardVideoLoader.Instance.OnLoadError += HandleError;
        }

        private void OnDestroy()
        {
            // 이벤트 구독 해제
            if (_instance != null)
            {
                DashboardVideoLoader.Instance.OnVideosLoaded -= HandleVideosLoaded;
                DashboardVideoLoader.Instance.OnLoadError -= HandleError;
            }
        }

        private static DashboardVideoLoader _instance;

        /// <summary>
        /// StreamingAssets에서 로드 (권장)
        /// 파일을 Assets/StreamingAssets/videos.json에 복사하세요
        /// </summary>
        public void LoadFromStreamingAssets()
        {
            Debug.Log("=== StreamingAssets에서 비디오 목록 로드 ===");
            DashboardVideoLoader.Instance.LoadFromStreamingAssets(jsonFileName);
        }

        /// <summary>
        /// Resources에서 로드
        /// 파일을 Assets/Resources/videos.json에 복사하세요
        /// </summary>
        public void LoadFromResources()
        {
            Debug.Log("=== Resources에서 비디오 목록 로드 ===");
            // Resources.Load는 확장자 제외
            string resourcePath = jsonFileName.Replace(".json", "");
            List<DashboardVideoLoader.Video> videos =
                DashboardVideoLoader.Instance.LoadFromResources(resourcePath);

            if (videos != null)
            {
                ProcessVideos(videos);
            }
        }

        /// <summary>
        /// 콜백 방식으로 로드
        /// </summary>
        public void LoadWithCallback()
        {
            Debug.Log("=== 콜백 방식으로 비디오 목록 로드 ===");
            DashboardVideoLoader.Instance.LoadFromStreamingAssets(
                jsonFileName,
                onSuccess: (videos) =>
                {
                    Debug.Log($"콜백: {videos.Count}개 비디오 로드 성공!");
                    ProcessVideos(videos);
                },
                onError: (error) =>
                {
                    Debug.LogError($"콜백: 로드 실패 - {error}");
                }
            );
        }

        /// <summary>
        /// JSON 문자열 직접 파싱 테스트
        /// </summary>
        public void TestParseJsonString()
        {
            // 대시보드에서 다운로드한 형식과 동일한 JSON
            string dashboardJson = @"[
                {
                    ""index"": 1,
                    ""filename"": ""nature.mp4"",
                    ""title"": ""숲 속에 머무는 나"",
                    ""description"": ""<size=12><b>숲 속에 머무는 나</b></size>\n<size=10>\""지친 하루, 아무것도 하지 않아도 괜찮은 순간\""</size>"",
                    ""file_url"": """",
                    ""thumbnail_url"": """",
                    ""duration"": 0,
                    ""file_size"": 0
                },
                {
                    ""index"": 2,
                    ""filename"": ""animation.mp4"",
                    ""title"": ""원의 여행"",
                    ""description"": ""<size=12><b>원의 여행</b></size>\n<size=10>\""잠시 벗어나 볼까? 원이 되어 자유롭게 떠나는 여행\""</size>"",
                    ""file_url"": """",
                    ""thumbnail_url"": """",
                    ""duration"": 0,
                    ""file_size"": 0
                }
            ]";

            Debug.Log("=== JSON 문자열 직접 파싱 테스트 ===");
            List<DashboardVideoLoader.Video> videos =
                DashboardVideoLoader.Instance.ParseJsonArray(dashboardJson);

            ProcessVideos(videos);
        }

        private void HandleVideosLoaded(List<DashboardVideoLoader.Video> videos)
        {
            Debug.Log($"이벤트: {videos.Count}개 비디오 로드 완료!");
            ProcessVideos(videos);
        }

        private void HandleError(string error)
        {
            Debug.LogError($"이벤트: 로드 오류 - {error}");
        }

        private void ProcessVideos(List<DashboardVideoLoader.Video> videos)
        {
            Debug.Log($"=== 총 {videos.Count}개 비디오 ===");

            foreach (var video in videos)
            {
                Debug.Log($"---");
                Debug.Log($"인덱스: {video.index}");
                Debug.Log($"제목: {video.title}");
                Debug.Log($"파일명: {video.filename}");
                Debug.Log($"설명 (원본): {video.description}");
                Debug.Log($"설명 (태그제거): {video.GetPlainDescription()}");

                if (!string.IsNullOrEmpty(video.file_url))
                {
                    Debug.Log($"URL: {video.file_url}");
                }
            }
        }
    }

    #endregion
}
