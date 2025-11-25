import { Router } from 'express';
import { DeviceController } from '../controllers/deviceController';
import { authenticateDevice } from '../middleware/auth';
import { validate, deviceRegistrationSchema } from '../middleware/validation';
import { registrationLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * @swagger
 * /devices/register:
 *   post:
 *     summary: 디바이스 등록
 *     description: VR 디바이스를 등록하고 JWT 토큰을 발급받습니다. 등록된 디바이스는 로그 전송 및 세션 생성이 가능합니다.
 *     tags: [Devices]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DeviceRegistration'
 *     responses:
 *       201:
 *         description: 디바이스 등록 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     device:
 *                       $ref: '#/components/schemas/Device'
 *                     token:
 *                       type: string
 *                       description: JWT 인증 토큰
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       400:
 *         description: 입력값 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: 이미 등록된 디바이스
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/register',
  registrationLimiter,
  validate(deviceRegistrationSchema),
  DeviceController.register
);

/**
 * @swagger
 * /devices:
 *   get:
 *     summary: 전체 디바이스 목록 조회
 *     description: 등록된 모든 디바이스를 조회합니다. (대시보드용)
 *     tags: [Devices]
 *     responses:
 *       200:
 *         description: 디바이스 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Device'
 */
router.get('/', DeviceController.getAll);

/**
 * @swagger
 * /devices/active:
 *   get:
 *     summary: 활성 디바이스 목록 조회
 *     description: 최근 5분 이내에 활동한 디바이스를 조회합니다.
 *     tags: [Devices]
 *     responses:
 *       200:
 *         description: 활성 디바이스 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Device'
 */
router.get('/active', DeviceController.getActive);

/**
 * @swagger
 * /devices/{id}:
 *   get:
 *     summary: 디바이스 상세 조회
 *     description: 특정 디바이스의 상세 정보를 조회합니다.
 *     tags: [Devices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 디바이스 ID
 *     responses:
 *       200:
 *         description: 디바이스 상세 정보
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Device'
 *       404:
 *         description: 디바이스를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', DeviceController.getById);

/**
 * @swagger
 * /devices/{id}:
 *   patch:
 *     summary: 디바이스 정보 수정
 *     description: 디바이스의 이름, 모델, 공간 정보를 수정합니다.
 *     tags: [Devices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 디바이스 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               device_name:
 *                 type: string
 *                 maxLength: 255
 *               model:
 *                 type: string
 *                 maxLength: 100
 *               space_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: 디바이스 정보 수정 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Device'
 *       404:
 *         description: 디바이스를 찾을 수 없음
 */
router.patch('/:id', DeviceController.update);

/**
 * @swagger
 * /devices/{id}:
 *   delete:
 *     summary: 디바이스 삭제
 *     description: 디바이스를 비활성화합니다. (실제 삭제는 하지 않음)
 *     tags: [Devices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 디바이스 ID
 *     responses:
 *       200:
 *         description: 디바이스 삭제 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Device deactivated successfully
 *       404:
 *         description: 디바이스를 찾을 수 없음
 */
router.delete('/:id', DeviceController.delete);

/**
 * @swagger
 * /devices/heartbeat:
 *   post:
 *     summary: 디바이스 하트비트
 *     description: 디바이스의 활성 상태를 갱신합니다. JWT 토큰이 필요합니다.
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 하트비트 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Heartbeat received
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/heartbeat', authenticateDevice, DeviceController.heartbeat);

export default router;
