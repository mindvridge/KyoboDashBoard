import { Router } from 'express';
import { SessionController } from '../controllers/sessionController';
import { authenticateDevice } from '../middleware/auth';
import { validate, sessionStartSchema, sessionEndSchema } from '../middleware/validation';

const router = Router();

/**
 * @swagger
 * /sessions/start:
 *   post:
 *     summary: VR 세션 시작
 *     description: 새로운 VR 세션을 시작합니다. 이미 활성 세션이 있는 경우 자동으로 종료하고 새 세션을 시작합니다.
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: 세션 시작 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 session_id:
 *                   type: string
 *                   format: uuid
 *                   description: 생성된 세션 ID
 *                 start_time:
 *                   type: string
 *                   format: date-time
 *                   description: 세션 시작 시간 (KST)
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: 디바이스를 찾을 수 없음
 */
router.post('/start', authenticateDevice, SessionController.start);

/**
 * @swagger
 * /sessions/end:
 *   post:
 *     summary: VR 세션 종료
 *     description: 활성 세션을 종료하고 총 시간과 콘텐츠 수를 반환합니다.
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SessionEnd'
 *     responses:
 *       200:
 *         description: 세션 종료 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 session_id:
 *                   type: string
 *                   format: uuid
 *                 duration:
 *                   type: number
 *                   description: 세션 총 시간 (초)
 *                   example: 3600
 *                 content_count:
 *                   type: number
 *                   description: 시청한 콘텐츠 수
 *                   example: 5
 *       400:
 *         description: 입력값 오류
 *       404:
 *         description: 세션을 찾을 수 없음
 *       409:
 *         description: 이미 종료된 세션
 */
router.post('/end', authenticateDevice, validate(sessionEndSchema), SessionController.end);

/**
 * @swagger
 * /sessions/active:
 *   get:
 *     summary: 활성 세션 목록 조회
 *     description: 현재 진행 중인 모든 VR 세션을 조회합니다.
 *     tags: [Sessions]
 *     responses:
 *       200:
 *         description: 활성 세션 목록
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       device_id:
 *                         type: string
 *                         format: uuid
 *                       device_info:
 *                         type: string
 *                         description: 디바이스 이름 또는 ID
 *                       space_name:
 *                         type: string
 *                         description: 공간 이름
 *                       start_time:
 *                         type: string
 *                         format: date-time
 *                       is_active:
 *                         type: boolean
 */
router.get('/active', SessionController.getActive);

/**
 * @swagger
 * /sessions/stats:
 *   get:
 *     summary: 세션 통계 조회
 *     description: 지정된 기간의 세션 통계를 조회합니다.
 *     tags: [Sessions]
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 시작 날짜 (ISO 8601)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 종료 날짜 (ISO 8601)
 *     responses:
 *       200:
 *         description: 세션 통계
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
 *                     total_sessions:
 *                       type: number
 *                       description: 총 세션 수
 *                     avg_duration:
 *                       type: number
 *                       description: 평균 세션 시간 (초)
 *                     total_duration:
 *                       type: number
 *                       description: 총 세션 시간 (초)
 */
router.get('/stats', SessionController.getStats);

/**
 * @swagger
 * /sessions/{id}:
 *   get:
 *     summary: 세션 상세 조회
 *     description: 특정 세션의 상세 정보와 로그를 조회합니다.
 *     tags: [Sessions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 세션 ID
 *     responses:
 *       200:
 *         description: 세션 상세 정보
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
 *                     session:
 *                       type: object
 *                     logs:
 *                       type: array
 *                       items:
 *                         type: object
 *       404:
 *         description: 세션을 찾을 수 없음
 */
router.get('/:id', SessionController.getById);

/**
 * @swagger
 * /sessions:
 *   get:
 *     summary: 기간별 세션 조회
 *     description: 지정된 기간의 세션 목록을 조회합니다.
 *     tags: [Sessions]
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 시작 날짜 (ISO 8601)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 종료 날짜 (ISO 8601)
 *       - in: query
 *         name: space_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 공간 ID (필터링 옵션)
 *       - in: query
 *         name: device_id
 *         schema:
 *           type: string
 *         description: 디바이스 ID (필터링 옵션)
 *     responses:
 *       200:
 *         description: 세션 목록
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
 *                     type: object
 */
router.get('/', SessionController.getByDateRange);

export default router;
