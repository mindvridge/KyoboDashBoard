import { Request, Response, NextFunction } from 'express';
import { VideoModel } from '../models/video';

export class VideoController {
  /**
   * POST /api/videos
   * Create a new video
   */
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { filename, title, description, file_url, thumbnail_url, duration, file_size, sort_order } = req.body;

      const video = await VideoModel.create({
        filename,
        title,
        description,
        file_url,
        thumbnail_url,
        duration,
        file_size,
        sort_order,
      });

      res.status(201).json({
        success: true,
        data: video,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/videos
   * Get all videos (for dashboard management)
   */
  static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { active_only } = req.query;
      const activeOnly = active_only === 'true';

      const videos = await VideoModel.findAll(activeOnly);
      const count = videos.length;

      res.json({
        success: true,
        data: videos,
        count,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/videos/list
   * Get active videos for Unity client (simplified response)
   */
  static async getList(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const videos = await VideoModel.getActiveVideos();

      res.json({
        success: true,
        data: videos,
        count: videos.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/videos/:id
   * Get video by ID
   */
  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const video = await VideoModel.findById(id);

      if (!video) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Video not found' },
        });
        return;
      }

      res.json({
        success: true,
        data: video,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/videos/index/:index
   * Get video by index number
   */
  static async getByIndex(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const index = parseInt(req.params.index, 10);

      if (isNaN(index)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid index' },
        });
        return;
      }

      const video = await VideoModel.findByIndex(index);

      if (!video) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Video not found' },
        });
        return;
      }

      res.json({
        success: true,
        data: video,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/videos/:id
   * Update video
   */
  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const video = await VideoModel.update(id, req.body);

      if (!video) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Video not found' },
        });
        return;
      }

      res.json({
        success: true,
        data: video,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/videos/:id
   * Delete video
   */
  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const video = await VideoModel.findById(id);
      if (!video) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Video not found' },
        });
        return;
      }

      await VideoModel.delete(id);

      res.json({
        success: true,
        message: 'Video deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/videos/:id/toggle
   * Toggle video active status
   */
  static async toggleActive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const video = await VideoModel.toggleActive(id);

      if (!video) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Video not found' },
        });
        return;
      }

      res.json({
        success: true,
        data: video,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/videos/reorder
   * Reorder videos
   */
  static async reorder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { video_ids } = req.body;

      if (!Array.isArray(video_ids) || video_ids.length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'video_ids array is required' },
        });
        return;
      }

      await VideoModel.reorder(video_ids);

      res.json({
        success: true,
        message: 'Videos reordered successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/videos/export
   * Export videos as JSON file
   */
  static async exportVideos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { active_only } = req.query;
      const activeOnly = active_only === 'true';

      const videos = await VideoModel.findAll(activeOnly);

      // Format for Unity
      const exportData = videos.map((v) => ({
        index: v.index,
        filename: v.filename,
        title: v.title,
        description: v.description || '',
        file_url: v.file_url || '',
        thumbnail_url: v.thumbnail_url || '',
        duration: v.duration || 0,
        file_size: v.file_size || 0,
      }));

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="videos.json"');
      res.json(exportData);
    } catch (error) {
      next(error);
    }
  }
}
