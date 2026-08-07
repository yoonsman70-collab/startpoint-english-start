import { getUserFromRequest, jsonResponse } from '../../_utils/auth.js';
import { hashPassword } from '../../_utils/crypto.js';

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

  const { user_id, new_password } = body;
  if (!user_id || !new_password) {
    return jsonResponse({ ok: false, error: '대상 학생과 새 비밀번호가 필요해요.' }, 400);
  }

  const hash = await hashPassword(new_password);
  // 비밀번호를 재설정하면서, 잠금 상태였다면 함께 풀어줍니다.
  await db.prepare(
    'UPDATE users SET password_hash = ?, failed_attempts = 0, is_locked = 0, locked_at = NULL WHERE id = ?'
  ).bind(hash, user_id).run();

  return jsonResponse({ ok: true });
}
