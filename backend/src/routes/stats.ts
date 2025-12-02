import { Router } from 'express';
import { StatsController } from '../controllers/statsController';
import { authenticateUser } from '../middleware/userAuth';

const router = Router();

// 모든 Stats 라우트는 인증이 필요합니다
router.use(authenticateUser);

/**
 * @swagger
 * /stats/dashboard:
 *   get:
 *     summary: 대시보드 요약 통계
 *     description: 메인 대시보드에 표시할 주요 통계 정보를 조회합니다.
 *     tags: [Stats]
 *     responses:
 *       200:
 *         description: 대시보드 통계
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
 *                     total_devices:
 *                       type: number
 *                       description: 전체 디바이스 수
 *                     active_devices:
 *                       type: number
 *                       description: 활성 디바이스 수
 *                     today_sessions:
 *                       type: number
 *                       description: 오늘 세션 수
 *                     active_sessions:
 *                       type: number
 *                       description: 현재 활성 세션 수
 *                     avg_session_duration:
 *                       type: number
 *                       description: 평균 세션 시간 (초)
 *                     total_content_views:
 *                       type: number
 *                       description: 총 콘텐츠 조회 수
 */
router.get('/dashboard', StatsController.getDashboard);

/**
 * @swagger
 * /stats/detailed:
 *   get:
 *     summary: 상세 통계
 *     description: 지정된 기간의 상세 통계를 조회합니다.
 *     tags: [Stats]
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
 *     responses:
 *       200:
 *         description: 상세 통계
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
 */
router.get('/detailed', StatsController.getDetailed);

/**
 * @swagger
 * /stats/popular:
 *   get:
 *     summary: 인기 콘텐츠 통계
 *     description: 가장 많이 시청된 콘텐츠 순위를 조회합니다.
 *     tags: [Stats]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *           maximum: 100
 *         description: 조회할 콘텐츠 수
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
 *         description: 인기 콘텐츠 목록
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
 *                       content_id:
 *                         type: string
 *                       content_name:
 *                         type: string
 *                       view_count:
 *                         type: number
 *                       total_watch_time:
 *                         type: number
 *                       avg_watch_time:
 *                         type: number
 */
router.get('/popular', StatsController.getPopular);

/**
 * @swagger
 * /stats/daily:
 *   get:
 *     summary: 일별 통계
 *     description: 지정된 기간의 일별 통계를 조회합니다.
 *     tags: [Stats]
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
 *         description: 일별 통계
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
 *                       date:
 *                         type: string
 *                         format: date
 *                       session_count:
 *                         type: number
 *                       total_duration:
 *                         type: number
 *                       avg_duration:
 *                         type: number
 */
router.get('/daily', StatsController.getDaily);

/**
 * @swagger
 * /stats/hourly:
 *   get:
 *     summary: 시간대별 통계
 *     description: 특정 날짜의 시간대별 세션 분포를 조회합니다.
 *     tags: [Stats]
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: 조회할 날짜 (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: 시간대별 통계
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
 *                       hour:
 *                         type: number
 *                         minimum: 0
 *                         maximum: 23
 *                       session_count:
 *                         type: number
 */
router.get('/hourly', StatsController.getHourly);

/**
 * @swagger
 * /stats/export/sessions:
 *   get:
 *     summary: 세션 데이터 CSV 내보내기
 *     description: 세션 데이터를 CSV 형식으로 내보냅니다.
 *     tags: [Stats]
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
 *         description: CSV 파일
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 */
router.get('/export/sessions', StatsController.exportSessions);

/**
 * @swagger
 * /stats/export/logs:
 *   get:
 *     summary: 로그 데이터 CSV 내보내기
 *     description: 로그 데이터를 CSV 형식으로 내보냅니다.
 *     tags: [Stats]
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
 *         description: CSV 파일
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 */
router.get('/export/logs', StatsController.exportLogs);

/**
 * @swagger
 * /stats/alerts:
 *   get:
 *     summary: 시스템 알림 조회
 *     description: 미해결된 시스템 알림을 조회합니다.
 *     tags: [Stats]
 *     responses:
 *       200:
 *         description: 알림 목록
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
 *                       type:
 *                         type: string
 *                         enum: [device_offline, session_timeout, error_rate_high]
 *                       message:
 *                         type: string
 *                       severity:
 *                         type: string
 *                         enum: [info, warning, error, critical]
 *                       created_at:
 *                         type: string
 *                         format: date-time
 */
router.get('/alerts', StatsController.getAlerts);

/**
 * @swagger
 * /stats/alerts/{id}/resolve:
 *   post:
 *     summary: 알림 해결 처리
 *     description: 특정 알림을 해결됨으로 표시합니다.
 *     tags: [Stats]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 알림 ID
 *     responses:
 *       200:
 *         description: 알림 해결 성공
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
 *                   example: Alert resolved successfully
 *       404:
 *         description: 알림을 찾을 수 없음
 */
router.post('/alerts/:id/resolve', StatsController.resolveAlert);

export default router;
