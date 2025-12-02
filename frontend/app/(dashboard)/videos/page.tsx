'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { videosApi } from '@/utils/api';
import { Video } from '@/types';
import {
  Video as VideoIcon,
  Plus,
  Pencil,
  Trash2,
  Download,
  ToggleLeft,
  ToggleRight,
  X,
  Save,
  FileVideo,
} from 'lucide-react';

interface VideoFormData {
  filename: string;
  title: string;
  description: string;
  file_url: string;
  thumbnail_url: string;
  duration: string;
  file_size: string;
  is_preinstalled: boolean;
}

const initialFormData: VideoFormData = {
  filename: '',
  title: '',
  description: '',
  file_url: '',
  thumbnail_url: '',
  duration: '',
  file_size: '',
  is_preinstalled: false,
};

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [formData, setFormData] = useState<VideoFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVideos = async () => {
    try {
      setIsLoading(true);
      const response = await videosApi.getAll();
      if (response.success) {
        setVideos(response.data);
      }
    } catch {
      setError('비디오 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const openCreateModal = () => {
    setEditingVideo(null);
    setFormData(initialFormData);
    setIsModalOpen(true);
    setError(null);
  };

  const openEditModal = (video: Video) => {
    setEditingVideo(video);
    setFormData({
      filename: video.filename,
      title: video.title,
      description: video.description || '',
      file_url: video.file_url || '',
      thumbnail_url: video.thumbnail_url || '',
      duration: video.duration?.toString() || '',
      file_size: video.file_size?.toString() || '',
      is_preinstalled: video.is_preinstalled || false,
    });
    setIsModalOpen(true);
    setError(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingVideo(null);
    setFormData(initialFormData);
    setError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const data = {
        filename: formData.filename,
        title: formData.title,
        description: formData.description || undefined,
        file_url: formData.file_url || undefined,
        thumbnail_url: formData.thumbnail_url || undefined,
        duration: formData.duration ? parseInt(formData.duration, 10) : undefined,
        file_size: formData.file_size ? parseInt(formData.file_size, 10) : undefined,
        is_preinstalled: formData.is_preinstalled,
      };

      if (editingVideo) {
        await videosApi.update(editingVideo.id, data);
      } else {
        await videosApi.create(data);
      }

      closeModal();
      fetchVideos();
    } catch (err: any) {
      setError(err.message || '저장에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (video: Video) => {
    if (!confirm(`"${video.title}" 비디오를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await videosApi.delete(video.id);
      fetchVideos();
    } catch {
      alert('삭제에 실패했습니다.');
    }
  };

  const handleToggleActive = async (video: Video) => {
    try {
      await videosApi.toggleActive(video.id);
      fetchVideos();
    } catch {
      alert('상태 변경에 실패했습니다.');
    }
  };

  const handleExport = () => {
    const url = videosApi.exportUrl(false);
    window.open(url, '_blank');
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1">
        <Header title="비디오 관리" />

        <main className="p-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <VideoIcon className="w-5 h-5 mr-2" />
                  등록된 비디오 ({videos.length}개)
                </CardTitle>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={handleExport}>
                    <Download className="w-4 h-4 mr-2" />
                    JSON 내보내기
                  </Button>
                  <Button onClick={openCreateModal}>
                    <Plus className="w-4 h-4 mr-2" />
                    비디오 추가
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
                </div>
              ) : videos.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileVideo className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>등록된 비디오가 없습니다.</p>
                  <Button className="mt-4" onClick={openCreateModal}>
                    <Plus className="w-4 h-4 mr-2" />
                    첫 비디오 추가하기
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">인덱스</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">파일명</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">타이틀</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">설명</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">길이</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">크기</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">사전설치</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">관리</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {videos.map((video) => (
                        <tr key={video.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-semibold text-sm">
                              {video.index}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium text-gray-900">{video.filename}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-900">{video.title}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-500 truncate max-w-xs block">
                              {video.description || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-600">{formatDuration(video.duration)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-600">{formatFileSize(video.file_size)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={video.is_preinstalled ? 'info' : 'default'}>
                              {video.is_preinstalled ? '설치됨' : '-'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={video.is_active ? 'success' : 'default'}>
                              {video.is_active ? '활성' : '비활성'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleToggleActive(video)}
                                className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded"
                                title={video.is_active ? '비활성화' : '활성화'}
                              >
                                {video.is_active ? (
                                  <ToggleRight className="w-5 h-5 text-green-600" />
                                ) : (
                                  <ToggleLeft className="w-5 h-5" />
                                )}
                              </button>
                              <button
                                onClick={() => openEditModal(video)}
                                className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded"
                                title="수정"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(video)}
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded"
                                title="삭제"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingVideo ? '비디오 수정' : '새 비디오 추가'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    파일명 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    name="filename"
                    value={formData.filename}
                    onChange={handleInputChange}
                    placeholder="video_001.mp4"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    타이틀 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="한강 VR 투어"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="비디오에 대한 설명을 입력하세요..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">파일 URL</label>
                  <Input
                    name="file_url"
                    value={formData.file_url}
                    onChange={handleInputChange}
                    placeholder="https://example.com/videos/video_001.mp4"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">썸네일 URL</label>
                  <Input
                    name="thumbnail_url"
                    value={formData.thumbnail_url}
                    onChange={handleInputChange}
                    placeholder="https://example.com/thumbnails/video_001.jpg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">길이 (초)</label>
                    <Input
                      name="duration"
                      type="number"
                      value={formData.duration}
                      onChange={handleInputChange}
                      placeholder="180"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">파일 크기 (바이트)</label>
                    <Input
                      name="file_size"
                      type="number"
                      value={formData.file_size}
                      onChange={handleInputChange}
                      placeholder="1073741824"
                      min="0"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_preinstalled"
                    name="is_preinstalled"
                    checked={formData.is_preinstalled}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_preinstalled" className="ml-2 block text-sm text-gray-700">
                    디바이스 사전 설치 비디오
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end px-6 py-4 border-t space-x-3">
                <Button type="button" variant="outline" onClick={closeModal}>
                  취소
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {editingVideo ? '수정' : '추가'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
