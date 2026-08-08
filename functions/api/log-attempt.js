import { getUserFromRequest, jsonResponse } from '../_utils/auth.js';

// 학생이 문장을 하나 시도할 때마다(성공/실패 상관없이) 호출되는 API입니다.
// attempts 테이블에는 매번 기록을 쌓고,
// progress 테이블에는 "이 학생이 이 문장을 완료했는지" 요약 정보를 갱신합니다.
export async function onRequestPost(context) {
  const { request, env } = context;
  const db = env.DB;

  const user = await getUserFromRequest(request, db);
  if (!user) {
    return jsonResponse({ ok: false, error: '로그인이 필요해요.' }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ ok: false, error: '잘못된 요청이에요.' }, 400);
  }

  const { sentence_id, is_pass, transcript, confidence, completed } = body;
  if (!sentence_id) {
    return jsonResponse({ ok: false, error: 'sentence_id가 필요해요.' }, 400);
  }

  const now = new Date().toISOString();

  await db.prepare(
    'INSERT INTO attempts (user_id, sentence_id, is_pass, transcript, confidence, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(user.id, sentence_id, is_pass ? 1 : 0, transcript || null, confidence ?? null, now).run();

  await db.prepare(
    `INSERT INTO progress (user_id, sentence_id, completed, attempt_count, last_attempt_at)
     VALUES (?, ?, ?, 1, ?)
     ON CONFLICT(user_id, sentence_id) DO UPDATE SET
       attempt_count = attempt_count + 1,
       completed = MAX(completed, excluded.completed),
       last_attempt_at = excluded.last_attempt_at`
  ).bind(user.id, sentence_id, completed ? 1 : 0, now).run();

  return jsonResponse({ ok: true });
}
