import { getUserFromRequest, jsonResponse } from '../../_utils/auth.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const db = env.DB;

  const requester = await getUserFromRequest(request, db);
  if (!requester || requester.role !== 'admin') {
    return jsonResponse({ ok: false, error: '관리자만 할 수 있어요.' }, 403);
  }

  const { results } = await db.prepare(
    `SELECT id, username, display_name, class_name, role, is_locked, failed_attempts, created_at, last_login_at
     FROM users ORDER BY created_at DESC`
  ).all();

  return jsonResponse({ ok: true, users: results });
}
