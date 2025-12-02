import { query } from '../config/database';
import { Space } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class SpaceModel {
  static async create(data: { name: string; location: string; description?: string }): Promise<Space> {
    const id = uuidv4();
    const sql = `
      INSERT INTO spaces (id, name, location, description, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING *
    `;
    const rows = await query<Space>(sql, [id, data.name, data.location, data.description || null]);
    return rows[0];
  }

  static async findById(id: string): Promise<Space | null> {
    const sql = 'SELECT * FROM spaces WHERE id = $1';
    const rows = await query<Space>(sql, [id]);
    return rows[0] || null;
  }

  static async findAll(): Promise<Space[]> {
    const sql = 'SELECT * FROM spaces ORDER BY created_at DESC';
    return query<Space>(sql);
  }

  static async update(id: string, data: Partial<Space>): Promise<Space | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.location !== undefined) {
      fields.push(`location = $${paramIndex++}`);
      values.push(data.location);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }

    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const sql = `
      UPDATE spaces SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    const rows = await query<Space>(sql, values);
    return rows[0] || null;
  }

  static async delete(id: string): Promise<boolean> {
    const sql = 'DELETE FROM spaces WHERE id = $1';
    await query(sql, [id]);
    return true;
  }

  static async getWithStats(): Promise<(Space & { device_count: number; active_sessions: number })[]> {
    // space_id가 devices에서 제거되어 더 이상 디바이스-공간 연결 불가
    // 공간 목록만 반환 (device_count, active_sessions는 0으로)
    const sql = `
      SELECT
        s.*,
        0 as device_count,
        0 as active_sessions
      FROM spaces s
      ORDER BY s.created_at DESC
    `;
    return query(sql);
  }
}
