import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'vr_logs',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function seedDatabase() {
  const client = await pool.connect();

  try {
    console.log('Starting database seeding...');

    // Create sample spaces
    const spaces = [
      { name: '교보문고 광화문점', location: '서울시 종로구 종로 1' },
      { name: '교보문고 강남점', location: '서울시 강남구 강남대로 465' },
      { name: '교보문고 잠실점', location: '서울시 송파구 올림픽로 300' },
    ];

    const spaceIds: string[] = [];

    for (const space of spaces) {
      const id = uuidv4();
      await client.query(
        `INSERT INTO spaces (id, name, location) VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [id, space.name, space.location]
      );
      spaceIds.push(id);
      console.log(`Created space: ${space.name}`);
    }

    // Create sample devices
    const devices = [
      { device_id: 'VR-DEVICE-001', mac_address: 'AA:BB:CC:DD:EE:01', model: 'Meta Quest 3' },
      { device_id: 'VR-DEVICE-002', mac_address: 'AA:BB:CC:DD:EE:02', model: 'Meta Quest 3' },
      { device_id: 'VR-DEVICE-003', mac_address: 'AA:BB:CC:DD:EE:03', model: 'Meta Quest 3' },
      { device_id: 'VR-DEVICE-004', mac_address: 'AA:BB:CC:DD:EE:04', model: 'Meta Quest Pro' },
      { device_id: 'VR-DEVICE-005', mac_address: 'AA:BB:CC:DD:EE:05', model: 'Meta Quest 3' },
    ];

    const deviceIds: string[] = [];

    for (const device of devices) {
      const id = uuidv4();
      await client.query(
        `INSERT INTO devices (id, device_id, mac_address, model)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (device_id) DO NOTHING`,
        [id, device.device_id, device.mac_address, device.model]
      );
      deviceIds.push(id);
      console.log(`Created device: ${device.device_id}`);
    }

    // Create sample sessions and logs
    const contents = [
      { id: 'content-001', name: '한강 야경 VR 투어' },
      { id: 'content-002', name: '제주도 오름 트레킹' },
      { id: 'content-003', name: '서울 고궁 탐방' },
      { id: 'content-004', name: '부산 해운대 일출' },
      { id: 'content-005', name: '설악산 등반 체험' },
    ];

    // Create sessions for the past 7 days
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date();
      date.setDate(date.getDate() - dayOffset);

      for (let i = 0; i < 3 + Math.floor(Math.random() * 5); i++) {
        const deviceIndex = Math.floor(Math.random() * deviceIds.length);
        const sessionId = uuidv4();

        const startHour = 9 + Math.floor(Math.random() * 10); // 9 AM to 7 PM
        const startDate = new Date(date);
        startDate.setHours(startHour, Math.floor(Math.random() * 60), 0, 0);

        const duration = 600 + Math.floor(Math.random() * 1200); // 10-30 minutes
        const endDate = new Date(startDate.getTime() + duration * 1000);

        await client.query(
          `INSERT INTO sessions (id, device_id, start_time, end_time, duration, is_active)
           VALUES ($1, $2, $3, $4, $5, false)`,
          [sessionId, deviceIds[deviceIndex], startDate, endDate, duration]
        );

        // Add content logs for this session
        const numContents = 1 + Math.floor(Math.random() * 3);
        let logTime = new Date(startDate);

        for (let j = 0; j < numContents; j++) {
          const content = contents[Math.floor(Math.random() * contents.length)];
          const watchDuration = 120 + Math.floor(Math.random() * 300);

          // Content select
          await client.query(
            `INSERT INTO content_logs (id, session_id, content_id, content_name, action_type, timestamp)
             VALUES ($1, $2, $3, $4, 'SELECT', $5)`,
            [uuidv4(), sessionId, content.id, content.name, logTime]
          );

          logTime = new Date(logTime.getTime() + 5000);

          // Watch start
          await client.query(
            `INSERT INTO content_logs (id, session_id, content_id, content_name, action_type, timestamp)
             VALUES ($1, $2, $3, $4, 'WATCH_START', $5)`,
            [uuidv4(), sessionId, content.id, content.name, logTime]
          );

          logTime = new Date(logTime.getTime() + watchDuration * 1000);

          // Watch end
          await client.query(
            `INSERT INTO content_logs (id, session_id, content_id, content_name, action_type, timestamp, duration)
             VALUES ($1, $2, $3, $4, 'WATCH_END', $5, $6)`,
            [uuidv4(), sessionId, content.id, content.name, logTime, watchDuration]
          );

          logTime = new Date(logTime.getTime() + 10000);
        }
      }
    }

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedDatabase();
