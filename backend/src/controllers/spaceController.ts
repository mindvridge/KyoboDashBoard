import { Request, Response, NextFunction } from 'express';
import { SpaceModel } from '../models/space';
import { StatsService } from '../services/statsService';

export class SpaceController {
  /**
   * POST /api/spaces
   * Create a new space
   */
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, location, description } = req.body;

      const space = await SpaceModel.create({ name, location, description });

      res.status(201).json({
        success: true,
        data: space,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/spaces
   * Get all spaces with stats
   */
  static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const spaces = await SpaceModel.getWithStats();

      res.json({
        success: true,
        data: spaces,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/spaces/:id
   * Get space by ID
   */
  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const space = await SpaceModel.findById(id);

      if (!space) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Space not found' },
        });
        return;
      }

      res.json({
        success: true,
        data: space,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/spaces/:id
   * Update space
   */
  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const space = await SpaceModel.update(id, req.body);

      if (!space) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Space not found' },
        });
        return;
      }

      res.json({
        success: true,
        data: space,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/spaces/:id
   * Delete space
   */
  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await SpaceModel.delete(id);

      res.json({
        success: true,
        message: 'Space deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/spaces/:id/stats
   * Get space-specific statistics
   */
  static async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { start_date, end_date } = req.query;

      const startDate = start_date
        ? new Date(start_date as string)
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const endDate = end_date
        ? new Date(end_date as string)
        : new Date();

      const stats = await StatsService.getSpaceStats(id, startDate, endDate);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}
