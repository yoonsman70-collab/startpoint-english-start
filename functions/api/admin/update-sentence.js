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

  const { id, eng_text, kor_text } = body;
  if (!id || !eng_text || !kor_text) return jsonResponse({ ok: false, error: '문장 정보가 부족해요.' }, 400);

  await db.prepare('UPDATE sentences SET eng_text = ?, kor_text = ? WHERE id = ?')
    .bind(eng_text, kor_text, id).run();

  return jsonResponse({ ok: true });
}
