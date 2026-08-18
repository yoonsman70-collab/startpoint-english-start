import { getUserFromRequest, jsonResponse } from '../../_utils/auth.js';

// 예: /api/admin/student-vocab-progress?user_id=12&level=mid_essential
// 패턴(말하기) 진도와는 별개로, 단어장(보카) 앱들의 학습 현황을 조회합니다.
export async function onRequestGet(context) {
  const { request, env } = context;
  const db = env.DB;

  const requester = await getUserFromRequest(request, db);
  if (!requester || requester.role !== 'admin') {
    return jsonResponse({ ok: false, error: '관리자만 할 수 있어요.' }, 403);
  }

  const url = new URL(request.url);
  const userId = url.searchParams.get('user_id');
  const levelCode = url.searchParams.get('level') || 'elem_basic';
  if (!userId) {
    return jsonResponse({ ok: false, error: 'user_id가 필요해요.' }, 400);
  }

  const level = await db.prepare('SELECT id, name FROM vocab_levels WHERE code = ?').bind(levelCode).first();
  if (!level) {
    return jsonResponse({ ok: false, error: '존재하지 않는 단계예요.' }, 404);
  }

  // Day(일차)별로 "전체 단어 수"와 "이 학생이 완료한 단어 수"를 함께 집계
  const { results: byDay } = await db.prepare(
    `SELECT vw.day_number,
            COUNT(vw.id) as total_words,
            COUNT(CASE WHEN vp.completed = 1 THEN 1 END) as completed_words
     FROM vocab_words vw
     LEFT JOIN vocab_progress vp ON vp.word_id = vw.id AND vp.user_id = ?
     WHERE vw.level_id = ?
     GROUP BY vw.day_number
     ORDER BY vw.day_number ASC`
  ).bind(userId, level.id).all();

  // 전체 시도 횟수 / 성공 횟수
  const summary = await db.prepare(
    `SELECT COUNT(*) as total_attempts,
            SUM(CASE WHEN va.is_pass = 1 THEN 1 ELSE 0 END) as pass_attempts
     FROM vocab_attempts va
     JOIN vocab_words vw ON vw.id = va.word_id
     WHERE va.user_id = ? AND vw.level_id = ?`
  ).bind(userId, level.id).first();

  // 최근 학습 활동 5건 (단어 + 정답 여부 + 시각)
  const { results: recent } = await db.prepare(
    `SELECT va.created_at, va.is_pass, vw.en_text, vw.ko_text
     FROM vocab_attempts va
     JOIN vocab_words vw ON vw.id = va.word_id
     WHERE va.user_id = ? AND vw.level_id = ?
     ORDER BY va.created_at DESC
     LIMIT 5`
  ).bind(userId, level.id).all();

  return jsonResponse({
    ok: true,
    levelName: level.name,
    byDay,
    summary: {
      total_attempts: summary?.total_attempts || 0,
      pass_attempts: summary?.pass_attempts || 0
    },
    recent
  });
}
