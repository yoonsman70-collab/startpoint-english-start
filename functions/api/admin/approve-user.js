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

  const { id, class_name } = body;
  if (!id) {
    return jsonResponse({ ok: false, error: 'id가 필요해요.' }, 400);
  }

  await db.prepare('UPDATE users SET is_approved = 1, class_name = COALESCE(?, class_name) WHERE id = ?')
    .bind(class_name || null, id).run();

  return jsonResponse({ ok: true });
}
