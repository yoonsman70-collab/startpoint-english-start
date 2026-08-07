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

  const { id } = body;
  if (!id) return jsonResponse({ ok: false, error: '삭제할 패턴 정보가 없어요.' }, 400);

  // 패턴에 딸린 문장들을 먼저 삭제하고, 패턴을 삭제합니다.
  await db.prepare('DELETE FROM sentences WHERE pattern_id = ?').bind(id).run();
  await db.prepare('DELETE FROM patterns WHERE id = ?').bind(id).run();

  return jsonResponse({ ok: true });
}
