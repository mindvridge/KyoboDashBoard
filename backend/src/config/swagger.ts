import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './index';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'VR Log Collection API',
      version: '1.0.0',
      description: '교보문고 VR 대시보드 - 로그 수집 및 분석 API',
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
    },
    servers: [
      {
        url: config.nodeEnv === 'production'
          ? 'https://kyobodashboard-production.up.railway.app/api'
          : `http://localhost:${config.port}/api`,
        description: config.nodeEnv === 'production' ? 'Production server' : 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT 토큰 (디바이스 등록 시 발급)',
        },
      },
      schemas: {
        // Device schemas
        DeviceRegistration: {
          type: 'object',
          required: ['device_id', 'mac_address'],
          properties: {
            device_id: {
              type: 'string',
              description: '디바이스 고유 ID',
              example: 'pico4_abc123def456',
            },
            mac_address: {
              type: 'string',
              description: 'MAC 주소',
              example: '02:1A:2B:3C:4D:5E',
            },
            space_id: {
              type: 'string',
              format: 'uuid',
              description: '공간 ID (선택)',
            },
            device_name: {
              type: 'string',
              description: '디바이스 이름',
              example: 'PICO 4 Ultra - Device 1',
            },
            model: {
              type: 'string',
              description: '디바이스 모델',
              example: 'PICO 4 Ultra',
            },
          },
        },
        Device: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            device_id: {
              type: 'string',
            },
            mac_address: {
              type: 'string',
            },
            space_id: {
              type: 'string',
              format: 'uuid',
            },
            device_name: {
              type: 'string',
            },
            model: {
              type: 'string',
            },
            is_active: {
              type: 'boolean',
            },
            last_seen: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        // Session schemas
        SessionStart: {
          type: 'object',
          required: ['device_id'],
          properties: {
            device_id: {
              type: 'string',
              description: '디바이스 ID (내부 UUID)',
            },
          },
        },
        SessionEnd: {
          type: 'object',
          required: ['session_id'],
          properties: {
            session_id: {
              type: 'string',
              format: 'uuid',
              description: '세션 ID',
            },
            lobby_time: {
              type: 'number',
              minimum: 0,
              maximum: 86400,
              description: '로비 체류 시간 (초)',
            },
          },
        },
        // Log schemas
        ContentSelect: {
          type: 'object',
          required: ['session_id', 'content_id', 'content_name'],
          properties: {
            session_id: {
              type: 'string',
              format: 'uuid',
            },
            content_id: {
              type: 'string',
              maxLength: 255,
            },
            content_name: {
              type: 'string',
              maxLength: 500,
            },
            metadata: {
              type: 'object',
              description: 'VR 메타데이터 (배터리, FPS 등)',
            },
          },
        },
        ContentWatch: {
          type: 'object',
          required: ['session_id', 'content_id', 'content_name', 'action_type'],
          properties: {
            session_id: {
              type: 'string',
              format: 'uuid',
            },
            content_id: {
              type: 'string',
              maxLength: 255,
            },
            content_name: {
              type: 'string',
              maxLength: 500,
            },
            action_type: {
              type: 'string',
              enum: ['WATCH_START', 'WATCH_END', 'WATCH_PAUSE', 'WATCH_RESUME'],
            },
            duration: {
              type: 'number',
              minimum: 0,
              maximum: 86400,
              description: '시청 시간 (초)',
            },
            metadata: {
              type: 'object',
            },
          },
        },
        // Response schemas
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR',
                },
                message: {
                  type: 'string',
                  example: '입력값이 잘못되었습니다',
                },
                errors: {
                  type: 'object',
                  description: '필드별 오류 상세',
                },
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Devices',
        description: '디바이스 관리 API',
      },
      {
        name: 'Sessions',
        description: 'VR 세션 관리 API',
      },
      {
        name: 'Logs',
        description: '콘텐츠 로그 API',
      },
      {
        name: 'Stats',
        description: '통계 및 대시보드 API',
      },
      {
        name: 'Spaces',
        description: '공간 관리 API',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
