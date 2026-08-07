import { getUserFromRequest, jsonResponse } from '../../_utils/auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const db = env.DB;

  const requester = await getUserFromRequest(request, db);
  if (!requester || requester.role !== 'admin') {
    return jsonResponse({ ok: false, error: '관리자만 할 수 있어요.' }, 403);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ ok: false, error: '잘못된 요청이에요.' }, 400);
  }

  const { user_id } = body;
  if (!user_id) {
    return jsonResponse({ ok: false, error: '대상 학생 정보가 필요해요.' }, 400);
  }

  await db.prepare(
    'UPDATE users SET is_locked = 0, failed_attempts = 0, locked_at = NULL WHERE id = ?'
  ).bind(user_id).run();

  return jsonResponse({ ok: true });
}
