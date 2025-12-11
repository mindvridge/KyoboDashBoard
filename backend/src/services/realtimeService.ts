import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { Session, ContentLog, RealtimeEvent, RealtimeEventType } from '../types';
import { logger } from '../utils/logger';
import { config } from '../config';
import { formatKoreaISO } from '../utils/timezone';

let io: SocketServer | null = null;

export class RealtimeService {
  static initialize(server: HttpServer): SocketServer {
    // Support multiple CORS origins for Socket.io
    const corsOrigin = config.cors.origins.length === 1
      ? config.cors.origins[0]
      : config.cors.origins;

    io = new SocketServer(server, {
      cors: {
        origin: corsOrigin,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    io.on('connection', (socket: Socket) => {
      logger.info('Dashboard client connected', { socketId: socket.id });

      socket.on('subscribe', (room: string) => {
        socket.join(room);
        logger.debug('Client subscribed to room', { socketId: socket.id, room });
      });

      socket.on('unsubscribe', (room: string) => {
        socket.leave(room);
        logger.debug('Client unsubscribed from room', { socketId: socket.id, room });
      });

      socket.on('disconnect', (reason) => {
        logger.info('Dashboard client disconnected', { socketId: socket.id, reason });
      });

      socket.on('error', (error) => {
        logger.error('Socket error', { socketId: socket.id, error });
      });
    });

    logger.info('WebSocket server initialized');
    return io;
  }

  static getIO(): SocketServer | null {
    return io;
  }

  static broadcast(event: RealtimeEvent): void {
    if (!io) {
      logger.warn('Socket.io not initialized, cannot broadcast');
      return;
    }

    io.emit('event', event);
    logger.debug('Broadcasted event', { type: event.type });
  }

  static broadcastToRoom(room: string, event: RealtimeEvent): void {
    if (!io) return;
    io.to(room).emit('event', event);
  }

  static broadcastSessionStart(session: Session, deviceInfo: string): void {
    this.broadcast({
      type: 'SESSION_START',
      data: {
        session_id: session.id,
        device_id: session.device_id,
        device_info: deviceInfo,
        start_time: session.start_time,
      },
      timestamp: formatKoreaISO(new Date()),
    });
  }

  static broadcastSessionEnd(session: Session): void {
    this.broadcast({
      type: 'SESSION_END',
      data: {
        session_id: session.id,
        device_id: session.device_id,
        duration: session.duration,
        end_time: session.end_time,
      },
      timestamp: formatKoreaISO(new Date()),
    });
  }

  static broadcastContentEvent(log: ContentLog): void {
    this.broadcast({
      type: 'CONTENT_WATCH',
      data: {
        log_id: log.id,
        session_id: log.session_id,
        content_id: log.content_id,
        content_name: log.content_name,
        action_type: log.action_type,
        duration: log.duration,
      },
      timestamp: formatKoreaISO(new Date()),
    });
  }

  static broadcastDeviceOnline(deviceId: string, deviceInfo: string): void {
    this.broadcast({
      type: 'DEVICE_ONLINE',
      data: { device_id: deviceId, device_info: deviceInfo },
      timestamp: formatKoreaISO(new Date()),
    });
  }

  static broadcastDeviceOffline(deviceId: string): void {
    this.broadcast({
      type: 'DEVICE_OFFLINE',
      data: { device_id: deviceId },
      timestamp: formatKoreaISO(new Date()),
    });
  }

  static broadcastStatsUpdate(stats: unknown): void {
    this.broadcast({
      type: 'STATS_UPDATE',
      data: stats,
      timestamp: formatKoreaISO(new Date()),
    });
  }

  static broadcastAlert(alert: {
    type: string;
    message: string;
    severity: string;
    device_id?: string;
  }): void {
    this.broadcast({
      type: 'ALERT',
      data: alert,
      timestamp: formatKoreaISO(new Date()),
    });
  }
}
