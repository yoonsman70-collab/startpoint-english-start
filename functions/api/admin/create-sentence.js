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

  const { pattern_id, eng_text, kor_text } = body;
  if (!pattern_id || !eng_text || !kor_text) {
    return jsonResponse({ ok: false, error: '영어 문장과 한글 뜻을 모두 입력해주세요.' }, 400);
  }

  const countRow = await db.prepare('SELECT COUNT(*) as cnt FROM sentences WHERE pattern_id = ?').bind(pattern_id).first();
  const sortOrder = (countRow?.cnt || 0) + 1;

  const result = await db.prepare(
    'INSERT INTO sentences (pattern_id, eng_text, kor_text, sort_order) VALUES (?, ?, ?, ?)'
  ).bind(pattern_id, eng_text, kor_text, sortOrder).run();

  return jsonResponse({ ok: true, id: result.meta.last_row_id });
}
