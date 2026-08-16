import { getUserFromRequest, jsonResponse } from '../../_utils/auth.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const db = env.DB;

  const requester = await getUserFromRequest(request, db);
  if (!requester || requester.role !== 'admin') {
    return jsonResponse({ ok: false, error: '관리자만 할 수 있어요.' }, 403);
  }

  const { results } = await db.prepare(
    `SELECT id, username, display_name, created_at FROM users
     WHERE is_approved = 0 ORDER BY created_at ASC`
  ).all();

  return jsonResponse({ ok: true, pending: results });
}
