import { getUserFromRequest, jsonResponse } from '../../_utils/auth.js';

// 승인 대기중인 가입 신청을 거절합니다. (아직 정식 계정이 아니므로 완전히 삭제)
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

  const { id } = body;
  if (!id) {
    return jsonResponse({ ok: false, error: 'id가 필요해요.' }, 400);
  }

  // 승인 대기(is_approved = 0) 상태인 계정만 거절할 수 있도록 안전장치를 둡니다.
  const target = await db.prepare('SELECT id, is_approved FROM users WHERE id = ?').bind(id).first();
  if (!target || target.is_approved !== 0) {
    return jsonResponse({ ok: false, error: '거절할 수 없는 계정이에요.' }, 400);
  }

  await db.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
  return jsonResponse({ ok: true });
}
