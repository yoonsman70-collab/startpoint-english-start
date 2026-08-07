import { getUserFromRequest, jsonResponse } from '../../_utils/auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const db = env.DB;
  const requester = await getUserFromRequest(request, db);
  if (!requester || requester.role !== 'admin') {
    return jsonResponse({ ok: false, error: '관리자만 할 수 있어요.' }, 403);
  }

  let body;
  try { body = await request.json(); } catch (e) { return jsonResponse({ ok: false, error: '잘못된 요청이에요.' }, 400); }

  const { id, pattern_text, desc_text, icon } = body;
  if (!id || !pattern_text) return jsonResponse({ ok: false, error: '패턴 정보가 부족해요.' }, 400);

  await db.prepare('UPDATE patterns SET pattern_text = ?, desc_text = ?, icon = ? WHERE id = ?')
    .bind(pattern_text, desc_text || '', icon || '📘', id).run();

  return jsonResponse({ ok: true });
}
