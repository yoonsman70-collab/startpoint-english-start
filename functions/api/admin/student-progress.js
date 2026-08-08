import { getUserFromRequest, jsonResponse } from '../../_utils/auth.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const db = env.DB;

  const requester = await getUserFromRequest(request, db);
  if (!requester || requester.role !== 'admin') {
    return jsonResponse({ ok: false, error: '관리자만 할 수 있어요.' }, 403);
  }

  const url = new URL(request.url);
  const userId = url.searchParams.get('user_id');
  const levelCode = url.searchParams.get('level') || 'start';
  if (!userId) {
    return jsonResponse({ ok: false, error: 'user_id가 필요해요.' }, 400);
  }

  // 패턴별로 "전체 문장 수"와 "이 학생이 완료한 문장 수"를 함께 집계
  const { results: byPattern } = await db.prepare(
    `SELECT pt.id as pattern_id, pt.pattern_text, pt.icon,
            COUNT(s.id) as total_sentences,
            COUNT(CASE WHEN pr.completed = 1 THEN 1 END) as completed_sentences
     FROM patterns pt
     JOIN sentences s ON s.pattern_id = pt.id
     LEFT JOIN progress pr ON pr.sentence_id = s.id AND pr.user_id = ?
     WHERE pt.level_id = (SELECT id FROM levels WHERE code = ?)
     GROUP BY pt.id
     ORDER BY pt.sort_order ASC`
  ).bind(userId, levelCode).all();

  // 전체 시도 횟수 / 성공 횟수 (정확도 참고용)
  const summary = await db.prepare(
    `SELECT COUNT(*) as total_attempts,
            SUM(CASE WHEN is_pass = 1 THEN 1 ELSE 0 END) as pass_attempts
     FROM attempts WHERE user_id = ?`
  ).bind(userId).first();

  // 최근 학습 활동 5건
  const { results: recent } = await db.prepare(
    `SELECT a.created_at, a.is_pass, s.eng_text
     FROM attempts a
     JOIN sentences s ON s.id = a.sentence_id
     WHERE a.user_id = ?
     ORDER BY a.created_at DESC
     LIMIT 5`
  ).bind(userId).all();

  return jsonResponse({
    ok: true,
    byPattern,
    summary: {
      total_attempts: summary?.total_attempts || 0,
      pass_attempts: summary?.pass_attempts || 0
    },
    recent
  });
}
