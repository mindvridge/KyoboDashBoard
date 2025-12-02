import { query } from '../config/database';
import { Device } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class DeviceModel {
  static async create(data: {
    device_id: string;
    mac_address?: string;
    model?: string;
  }): Promise<Device> {
    const id = uuidv4();
    const sql = `
      INSERT INTO devices (id, device_id, mac_address, model, last_seen, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), true, NOW(), NOW())
      RETURNING *
    `;
    const rows = await query<Device>(sql, [
      id,
      data.device_id,
      data.mac_address || null,
      data.model || null,
    ]);
    return rows[0];
  }

  static async findById(id: string): Promise<Device | null> {
    const sql = 'SELECT * FROM devices WHERE id = $1';
    const rows = await query<Device>(sql, [id]);
    return rows[0] || null;
  }

  static async findByDeviceId(deviceId: string): Promise<Device | null> {
    const sql = 'SELECT * FROM devices WHERE device_id = $1';
    const rows = await query<Device>(sql, [deviceId]);
    return rows[0] || null;
  }

  static async findByMacAddress(macAddress: string): Promise<Device | null> {
    const sql = 'SELECT * FROM devices WHERE mac_address = $1';
    const rows = await query<Device>(sql, [macAddress]);
    return rows[0] || null;
  }

  static async findByDeviceIdOrMac(deviceId: string, macAddress: string): Promise<Device | null> {
    const sql = 'SELECT * FROM devices WHERE device_id = $1 OR mac_address = $2';
    const rows = await query<Device>(sql, [deviceId, macAddress]);
    return rows[0] || null;
  }

  static async findAll(): Promise<Device[]> {
    const sql = 'SELECT * FROM devices ORDER BY last_seen DESC';
    return query<Device>(sql);
  }

  static async updateLastSeen(id: string): Promise<void> {
    const sql = 'UPDATE devices SET last_seen = NOW(), is_active = true, updated_at = NOW() WHERE id = $1';
    await query(sql, [id]);
  }

  static async setInactive(id: string): Promise<void> {
    const sql = 'UPDATE devices SET is_active = false, updated_at = NOW() WHERE id = $1';
    await query(sql, [id]);
  }

  static async update(id: string, data: Partial<Device>): Promise<Device | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.model !== undefined) {
      fields.push(`model = $${paramIndex++}`);
      values.push(data.model);
    }
    if (data.mac_address !== undefined) {
      fields.push(`mac_address = $${paramIndex++}`);
      values.push(data.mac_address);
    }

    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const sql = `
      UPDATE devices SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    const rows = await query<Device>(sql, values);
    return rows[0] || null;
  }

  static async delete(id: string): Promise<boolean> {
    const sql = 'DELETE FROM devices WHERE id = $1';
    await query(sql, [id]);
    return true;
  }

  static async getActiveDevices(): Promise<Device[]> {
    const sql = `
      SELECT * FROM devices
      WHERE is_active = true
      ORDER BY last_seen DESC
    `;
    return query(sql);
  }
}
