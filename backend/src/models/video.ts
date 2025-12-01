import { query } from '../config/database';
import { Video, VideoCreateRequest, VideoUpdateRequest } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class VideoModel {
  /**
   * Create a new video
   */
  static async create(data: VideoCreateRequest): Promise<Video> {
    const id = uuidv4();
    const sql = `
      INSERT INTO videos (
        id, filename, title, description, file_url, thumbnail_url,
        duration, file_size, is_preinstalled, sort_order, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *
    `;
    const rows = await query<Video>(sql, [
      id,
      data.filename,
      data.title,
      data.description || null,
      data.file_url || null,
      data.thumbnail_url || null,
      data.duration || null,
      data.file_size || null,
      data.is_preinstalled || false,
      data.sort_order || 0,
    ]);
    return rows[0];
  }

  /**
   * Find video by ID
   */
  static async findById(id: string): Promise<Video | null> {
    const sql = 'SELECT * FROM videos WHERE id = $1';
    const rows = await query<Video>(sql, [id]);
    return rows[0] || null;
  }

  /**
   * Find video by index
   */
  static async findByIndex(index: number): Promise<Video | null> {
    const sql = 'SELECT * FROM videos WHERE index = $1';
    const rows = await query<Video>(sql, [index]);
    return rows[0] || null;
  }

  /**
   * Get all videos (optionally filter by active status)
   */
  static async findAll(activeOnly: boolean = false): Promise<Video[]> {
    let sql = 'SELECT * FROM videos';
    if (activeOnly) {
      sql += ' WHERE is_active = true';
    }
    sql += ' ORDER BY sort_order ASC, index ASC';
    return query<Video>(sql);
  }

  /**
   * Get active videos for Unity client
   */
  static async getActiveVideos(): Promise<Video[]> {
    const sql = `
      SELECT id, index, filename, title, description, file_url, thumbnail_url, duration, file_size, is_preinstalled
      FROM videos
      WHERE is_active = true
      ORDER BY sort_order ASC, index ASC
    `;
    return query<Video>(sql);
  }

  /**
   * Update video
   */
  static async update(id: string, data: VideoUpdateRequest): Promise<Video | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.filename !== undefined) {
      fields.push(`filename = $${paramIndex++}`);
      values.push(data.filename);
    }
    if (data.title !== undefined) {
      fields.push(`title = $${paramIndex++}`);
      values.push(data.title);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.file_url !== undefined) {
      fields.push(`file_url = $${paramIndex++}`);
      values.push(data.file_url);
    }
    if (data.thumbnail_url !== undefined) {
      fields.push(`thumbnail_url = $${paramIndex++}`);
      values.push(data.thumbnail_url);
    }
    if (data.duration !== undefined) {
      fields.push(`duration = $${paramIndex++}`);
      values.push(data.duration);
    }
    if (data.file_size !== undefined) {
      fields.push(`file_size = $${paramIndex++}`);
      values.push(data.file_size);
    }
    if (data.is_preinstalled !== undefined) {
      fields.push(`is_preinstalled = $${paramIndex++}`);
      values.push(data.is_preinstalled);
    }
    if (data.is_active !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(data.is_active);
    }
    if (data.sort_order !== undefined) {
      fields.push(`sort_order = $${paramIndex++}`);
      values.push(data.sort_order);
    }

    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const sql = `
      UPDATE videos SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    const rows = await query<Video>(sql, values);
    return rows[0] || null;
  }

  /**
   * Delete video (hard delete)
   */
  static async delete(id: string): Promise<boolean> {
    const sql = 'DELETE FROM videos WHERE id = $1';
    await query(sql, [id]);
    return true;
  }

  /**
   * Toggle video active status
   */
  static async toggleActive(id: string): Promise<Video | null> {
    const sql = `
      UPDATE videos
      SET is_active = NOT is_active, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const rows = await query<Video>(sql, [id]);
    return rows[0] || null;
  }

  /**
   * Get video count
   */
  static async count(activeOnly: boolean = false): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM videos';
    if (activeOnly) {
      sql += ' WHERE is_active = true';
    }
    const rows = await query<{ count: string }>(sql);
    return parseInt(rows[0].count, 10);
  }

  /**
   * Reorder videos
   */
  static async reorder(videoIds: string[]): Promise<void> {
    for (let i = 0; i < videoIds.length; i++) {
      await query(
        'UPDATE videos SET sort_order = $1, updated_at = NOW() WHERE id = $2',
        [i, videoIds[i]]
      );
    }
  }
}
