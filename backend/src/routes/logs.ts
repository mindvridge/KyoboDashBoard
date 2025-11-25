import { Router } from 'express';
import { LogController } from '../controllers/logController';
import { authenticateDevice } from '../middleware/auth';
import { validate, contentSelectSchema, contentWatchSchema } from '../middleware/validation';
import { loggingLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * @swagger
 * /logs/content-select:
 *   post:
 *     summary: 콘텐츠 선택 로그
 *     description: 사용자가 VR 콘텐츠를 선택한 이벤트를 기록합니다.
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ContentSelect'
 *     responses:
 *       201:
 *         description: 로그 저장 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: 입력값 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: 인증 실패
 */
router.post(
  '/content-select',
  authenticateDevice,
  loggingLimiter,
  validate(contentSelectSchema),
  LogController.contentSelect
);

/**
 * @swagger
 * /logs/content-watch:
 *   post:
 *     summary: 콘텐츠 시청 로그
 *     description: 콘텐츠 시청 시작/종료/일시정지/재개 이벤트를 기록합니다.
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ContentWatch'
 *     responses:
 *       201:
 *         description: 로그 저장 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: 입력값 오류 (duration은 0-86400초, action_type은 WATCH_START/WATCH_END/WATCH_PAUSE/WATCH_RESUME)
 *       401:
 *         description: 인증 실패
 */
router.post(
  '/content-watch',
  authenticateDevice,
  loggingLimiter,
  validate(contentWatchSchema),
  LogController.contentWatch
);

/**
 * @swagger
 * /logs/lobby:
 *   post:
 *     summary: 로비 체류 로그
 *     description: VR 로비에서의 체류 시간을 기록합니다.
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_id
 *             properties:
 *               session_id:
 *                 type: string
 *                 format: uuid
 *               duration:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 86400
 *                 description: 로비 체류 시간 (초)
 *     responses:
 *       201:
 *         description: 로그 저장 성공
 *       401:
 *         description: 인증 실패
 */
router.post(
  '/lobby',
  authenticateDevice,
  loggingLimiter,
  LogController.lobby
);

/**
 * @swagger
 * /logs/content-switch:
 *   post:
 *     summary: 콘텐츠 전환 로그
 *     description: 한 콘텐츠에서 다른 콘텐츠로 전환한 이벤트를 기록합니다.
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_id
 *               - from_content_id
 *               - to_content_id
 *             properties:
 *               session_id:
 *                 type: string
 *                 format: uuid
 *               from_content_id:
 *                 type: string
 *                 maxLength: 255
 *               to_content_id:
 *                 type: string
 *                 maxLength: 255
 *     responses:
 *       201:
 *         description: 로그 저장 성공
 *       401:
 *         description: 인증 실패
 */
router.post(
  '/content-switch',
  authenticateDevice,
  loggingLimiter,
  LogController.contentSwitch
);

/**
 * @swagger
 * /logs/recent:
 *   get:
 *     summary: 최근 로그 조회
 *     description: 최근 100개의 로그를 조회합니다. (대시보드용)
 *     tags: [Logs]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 100
 *           maximum: 1000
 *         description: 조회할 로그 수
 *     responses:
 *       200:
 *         description: 최근 로그 목록
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
router.get('/recent', LogController.getRecent);

/**
 * @swagger
 * /logs/session/{sessionId}:
 *   get:
 *     summary: 세션별 로그 조회
 *     description: 특정 세션의 모든 로그를 조회합니다.
 *     tags: [Logs]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 세션 ID
 *     responses:
 *       200:
 *         description: 세션 로그 목록
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
router.get('/session/:sessionId', LogController.getBySession);

/**
 * @swagger
 * /logs/content/{contentId}/stats:
 *   get:
 *     summary: 콘텐츠별 통계 조회
 *     description: 특정 콘텐츠의 시청 통계를 조회합니다.
 *     tags: [Logs]
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *         description: 콘텐츠 ID
 *     responses:
 *       200:
 *         description: 콘텐츠 통계
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
 *                     total_views:
 *                       type: number
 *                       description: 총 시청 수
 *                     total_watch_time:
 *                       type: number
 *                       description: 총 시청 시간 (초)
 *                     avg_watch_time:
 *                       type: number
 *                       description: 평균 시청 시간 (초)
 */
router.get('/content/:contentId/stats', LogController.getContentStats);

/**
 * @swagger
 * /logs:
 *   get:
 *     summary: 기간별 로그 조회
 *     description: 지정된 기간의 로그를 조회합니다.
 *     tags: [Logs]
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
 *         name: session_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 세션 ID (필터링 옵션)
 *       - in: query
 *         name: content_id
 *         schema:
 *           type: string
 *         description: 콘텐츠 ID (필터링 옵션)
 *     responses:
 *       200:
 *         description: 로그 목록
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
router.get('/', LogController.getByDateRange);

export default router;
