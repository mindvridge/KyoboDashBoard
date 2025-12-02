using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

namespace KyoboDashboard
{
    /// <summary>
    /// 로컬 JSON 파일에서 비디오 목록을 로드하는 클래스
    /// StreamingAssets, Resources, 또는 임의 경로에서 JSON 파일을 읽을 수 있습니다.
    /// </summary>
    public class LocalVideoLoader : MonoBehaviour
    {
        #region JSON File Locations

        /*
         * Unity에서 JSON 파일을 저장할 수 있는 주요 위치:
         *
         * 1. StreamingAssets (권장)
         *    - 경로: Assets/StreamingAssets/
         *    - 빌드 시 원본 그대로 포함됨
         *    - 런타임에 읽기 가능 (쓰기는 플랫폼에 따라 다름)
         *    - 접근: Application.streamingAssetsPath
         *
         * 2. Resources
         *    - 경로: Assets/Resources/
         *    - 빌드 시 압축되어 포함됨
         *    - Resources.Load()로 로드
         *    - 런타임에 수정 불가
         *
         * 3. PersistentDataPath
         *    - 경로: 플랫폼별 영구 저장소
         *    - 런타임에 읽기/쓰기 가능
         *    - 앱 삭제 전까지 유지됨
         *    - 접근: Application.persistentDataPath
         */

        #endregion

        #region Data Models (VideoService.cs와 동일)

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
        /// API 응답과 동일한 형식의 JSON 구조
        /// </summary>
        [Serializable]
        public class VideoListJson
        {
            public bool success;
            public Video[] data;
            public int count;
        }

        /// <summary>
        /// 단순 배열 형식의 JSON 구조
        /// </summary>
        [Serializable]
        public class VideoArrayWrapper
        {
            public Video[] videos;
        }

        #endregion

        #region Method 1: StreamingAssets에서 로드

        /// <summary>
        /// StreamingAssets 폴더에서 JSON 파일 로드
        /// 파일 경로: Assets/StreamingAssets/videos.json
        /// </summary>
        public void LoadFromStreamingAssets(string fileName = "videos.json")
        {
            StartCoroutine(LoadFromStreamingAssetsCoroutine(fileName));
        }

        private IEnumerator LoadFromStreamingAssetsCoroutine(string fileName)
        {
            string filePath = Path.Combine(Application.streamingAssetsPath, fileName);
            string json = null;

            // Android에서는 UnityWebRequest 사용 필요
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
                        Debug.LogError($"[LocalVideoLoader] StreamingAssets 로드 실패: {request.error}");
                        yield break;
                    }
                }
            }
            else
            {
                // PC, iOS 등에서는 직접 파일 읽기
                if (File.Exists(filePath))
                {
                    json = File.ReadAllText(filePath);
                }
                else
                {
                    Debug.LogError($"[LocalVideoLoader] 파일이 존재하지 않습니다: {filePath}");
                    yield break;
                }
            }

            // JSON 파싱
            ParseAndLogVideos(json, "StreamingAssets");
        }

        #endregion

        #region Method 2: Resources에서 로드

        /// <summary>
        /// Resources 폴더에서 JSON 파일 로드 (동기)
        /// 파일 경로: Assets/Resources/Data/videos.json
        /// 주의: Resources.Load는 확장자 없이 경로 지정
        /// </summary>
        public List<Video> LoadFromResources(string resourcePath = "Data/videos")
        {
            TextAsset jsonAsset = Resources.Load<TextAsset>(resourcePath);

            if (jsonAsset == null)
            {
                Debug.LogError($"[LocalVideoLoader] Resources에서 파일을 찾을 수 없습니다: {resourcePath}");
                return null;
            }

            return ParseAndLogVideos(jsonAsset.text, "Resources");
        }

        #endregion

        #region Method 3: PersistentDataPath에서 로드

        /// <summary>
        /// PersistentDataPath에서 JSON 파일 로드
        /// 다운로드한 JSON이나 사용자 데이터 저장에 적합
        /// </summary>
        public List<Video> LoadFromPersistentData(string fileName = "videos.json")
        {
            string filePath = Path.Combine(Application.persistentDataPath, fileName);

            if (!File.Exists(filePath))
            {
                Debug.LogError($"[LocalVideoLoader] 파일이 존재하지 않습니다: {filePath}");
                return null;
            }

            string json = File.ReadAllText(filePath);
            return ParseAndLogVideos(json, "PersistentDataPath");
        }

        /// <summary>
        /// PersistentDataPath에 JSON 파일 저장
        /// </summary>
        public void SaveToPersistentData(List<Video> videos, string fileName = "videos.json")
        {
            string filePath = Path.Combine(Application.persistentDataPath, fileName);

            VideoListJson data = new VideoListJson
            {
                success = true,
                data = videos.ToArray(),
                count = videos.Count
            };

            string json = JsonUtility.ToJson(data, true); // true = 보기 좋게 포맷팅
            File.WriteAllText(filePath, json);

            Debug.Log($"[LocalVideoLoader] JSON 저장 완료: {filePath}");
        }

        #endregion

        #region Method 4: 임의 경로에서 로드

        /// <summary>
        /// 절대 경로에서 JSON 파일 로드
        /// </summary>
        public List<Video> LoadFromPath(string absolutePath)
        {
            if (!File.Exists(absolutePath))
            {
                Debug.LogError($"[LocalVideoLoader] 파일이 존재하지 않습니다: {absolutePath}");
                return null;
            }

            string json = File.ReadAllText(absolutePath);
            return ParseAndLogVideos(json, "CustomPath");
        }

        #endregion

        #region JSON Parsing

        /// <summary>
        /// JSON 문자열을 파싱하여 Video 목록 반환
        /// API 응답 형식과 단순 배열 형식 모두 지원
        /// </summary>
        private List<Video> ParseAndLogVideos(string json, string source)
        {
            List<Video> videos = new List<Video>();

            try
            {
                // 먼저 API 응답 형식 시도 (success, data, count 포함)
                VideoListJson response = JsonUtility.FromJson<VideoListJson>(json);

                if (response != null && response.data != null && response.data.Length > 0)
                {
                    videos = new List<Video>(response.data);
                    Debug.Log($"[LocalVideoLoader] {source}에서 {videos.Count}개 비디오 로드됨 (API 형식)");
                }
                else
                {
                    // 단순 배열 형식 시도
                    // JsonUtility는 배열을 직접 파싱할 수 없으므로 래퍼 사용
                    string wrappedJson = "{\"videos\":" + json + "}";
                    VideoArrayWrapper wrapper = JsonUtility.FromJson<VideoArrayWrapper>(wrappedJson);

                    if (wrapper != null && wrapper.videos != null)
                    {
                        videos = new List<Video>(wrapper.videos);
                        Debug.Log($"[LocalVideoLoader] {source}에서 {videos.Count}개 비디오 로드됨 (배열 형식)");
                    }
                }

                // 결과 출력
                foreach (var video in videos)
                {
                    Debug.Log($"  [{video.index}] {video.title} - {video.filename}");
                }
            }
            catch (Exception e)
            {
                Debug.LogError($"[LocalVideoLoader] JSON 파싱 오류: {e.Message}");
            }

            return videos;
        }

        /// <summary>
        /// JSON 문자열에서 직접 파싱 (외부에서 호출용)
        /// </summary>
        public static List<Video> ParseJson(string json)
        {
            try
            {
                VideoListJson response = JsonUtility.FromJson<VideoListJson>(json);
                if (response?.data != null)
                {
                    return new List<Video>(response.data);
                }

                // 배열 형식 시도
                string wrappedJson = "{\"videos\":" + json + "}";
                VideoArrayWrapper wrapper = JsonUtility.FromJson<VideoArrayWrapper>(wrappedJson);
                if (wrapper?.videos != null)
                {
                    return new List<Video>(wrapper.videos);
                }
            }
            catch (Exception e)
            {
                Debug.LogError($"JSON 파싱 오류: {e.Message}");
            }

            return new List<Video>();
        }

        #endregion
    }

    #region Usage Examples

    /// <summary>
    /// LocalVideoLoader 사용 예제
    /// </summary>
    public class LocalVideoLoaderExample : MonoBehaviour
    {
        [Header("Components")]
        [SerializeField] private LocalVideoLoader videoLoader;

        [Header("Settings")]
        [SerializeField] private string streamingAssetsFile = "videos.json";
        [SerializeField] private string resourcesPath = "Data/videos";

        private void Start()
        {
            if (videoLoader == null)
            {
                videoLoader = gameObject.AddComponent<LocalVideoLoader>();
            }
        }

        /// <summary>
        /// StreamingAssets에서 로드 (비동기)
        /// </summary>
        public void LoadFromStreamingAssets()
        {
            Debug.Log("=== StreamingAssets에서 비디오 목록 로드 ===");
            videoLoader.LoadFromStreamingAssets(streamingAssetsFile);
        }

        /// <summary>
        /// Resources에서 로드 (동기)
        /// </summary>
        public void LoadFromResources()
        {
            Debug.Log("=== Resources에서 비디오 목록 로드 ===");
            List<LocalVideoLoader.Video> videos = videoLoader.LoadFromResources(resourcesPath);

            if (videos != null)
            {
                ProcessVideos(videos);
            }
        }

        /// <summary>
        /// PersistentDataPath에서 로드
        /// </summary>
        public void LoadFromPersistentData()
        {
            Debug.Log("=== PersistentDataPath에서 비디오 목록 로드 ===");
            List<LocalVideoLoader.Video> videos = videoLoader.LoadFromPersistentData();

            if (videos != null)
            {
                ProcessVideos(videos);
            }
        }

        /// <summary>
        /// JSON 문자열에서 직접 파싱
        /// </summary>
        public void ParseJsonString()
        {
            // 예시 JSON 문자열
            string sampleJson = @"{
                ""success"": true,
                ""data"": [
                    {
                        ""id"": ""uuid-1"",
                        ""index"": 1,
                        ""filename"": ""video1.mp4"",
                        ""title"": ""샘플 비디오 1"",
                        ""description"": ""첫 번째 비디오"",
                        ""file_url"": ""https://example.com/video1.mp4"",
                        ""thumbnail_url"": ""https://example.com/thumb1.jpg"",
                        ""duration"": 120,
                        ""file_size"": 10485760,
                        ""is_preinstalled"": true,
                        ""is_active"": true,
                        ""sort_order"": 1
                    },
                    {
                        ""id"": ""uuid-2"",
                        ""index"": 2,
                        ""filename"": ""video2.mp4"",
                        ""title"": ""샘플 비디오 2"",
                        ""description"": ""두 번째 비디오"",
                        ""file_url"": ""https://example.com/video2.mp4"",
                        ""thumbnail_url"": ""https://example.com/thumb2.jpg"",
                        ""duration"": 180,
                        ""file_size"": 15728640,
                        ""is_preinstalled"": false,
                        ""is_active"": true,
                        ""sort_order"": 2
                    }
                ],
                ""count"": 2
            }";

            Debug.Log("=== JSON 문자열 직접 파싱 ===");
            List<LocalVideoLoader.Video> videos = LocalVideoLoader.ParseJson(sampleJson);
            ProcessVideos(videos);
        }

        /// <summary>
        /// 비디오 목록 처리 예시
        /// </summary>
        private void ProcessVideos(List<LocalVideoLoader.Video> videos)
        {
            Debug.Log($"총 {videos.Count}개 비디오 로드됨");

            foreach (var video in videos)
            {
                Debug.Log($"---");
                Debug.Log($"제목: {video.title}");
                Debug.Log($"파일: {video.filename}");
                Debug.Log($"URL: {video.file_url}");
                Debug.Log($"길이: {video.duration}초");
                Debug.Log($"사전설치: {video.is_preinstalled}");
            }
        }

        /// <summary>
        /// API에서 받은 데이터를 로컬에 저장하는 예시
        /// </summary>
        public void SaveToLocalExample()
        {
            // 예시 데이터
            List<LocalVideoLoader.Video> videos = new List<LocalVideoLoader.Video>
            {
                new LocalVideoLoader.Video
                {
                    id = "test-1",
                    index = 1,
                    filename = "test_video.mp4",
                    title = "테스트 비디오",
                    description = "로컬 저장 테스트",
                    file_url = "https://example.com/test.mp4",
                    duration = 60,
                    file_size = 5242880,
                    is_preinstalled = false,
                    is_active = true,
                    sort_order = 1
                }
            };

            videoLoader.SaveToPersistentData(videos, "my_videos.json");

            // 저장 경로 출력
            Debug.Log($"저장 경로: {Application.persistentDataPath}/my_videos.json");
        }
    }

    #endregion
}
