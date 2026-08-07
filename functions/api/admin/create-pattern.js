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

  const { level_code, pattern_text, desc_text, icon } = body;
  if (!level_code || !pattern_text) {
    return jsonResponse({ ok: false, error: '레벨과 패턴 문구는 필수예요.' }, 400);
  }

  const level = await db.prepare('SELECT id FROM levels WHERE code = ?').bind(level_code).first();
  if (!level) return jsonResponse({ ok: false, error: '존재하지 않는 레벨이에요.' }, 404);

  const countRow = await db.prepare('SELECT COUNT(*) as cnt FROM patterns WHERE level_id = ?').bind(level.id).first();
  const sortOrder = (countRow?.cnt || 0) + 1;

  const result = await db.prepare(
    'INSERT INTO patterns (level_id, pattern_text, desc_text, icon, sort_order) VALUES (?, ?, ?, ?, ?)'
  ).bind(level.id, pattern_text, desc_text || '', icon || '📘', sortOrder).run();

  return jsonResponse({ ok: true, id: result.meta.last_row_id });
}
