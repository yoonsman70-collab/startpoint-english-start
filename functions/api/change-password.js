import { getUserFromRequest, jsonResponse } from '../_utils/auth.js';
import { hashPassword, verifyPassword } from '../_utils/crypto.js';

// 로그인한 사용자 본인이 자기 비밀번호를 바꾸는 API입니다.
// (관리자뿐 아니라 학생 계정도 나중에 재사용할 수 있도록 role 제한은 걸지 않았습니다.)
export async function onRequestPost(context) {
  const { request, env } = context;
  const db = env.DB;

  const requester = await getUserFromRequest(request, db);
  if (!requester) {
    return jsonResponse({ ok: false, error: '로그인이 필요해요.' }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ ok: false, error: '잘못된 요청이에요.' }, 400);
  }

  const { current_password, new_password } = body;
  if (!new_password) {
    return jsonResponse({ ok: false, error: '새 비밀번호를 입력해주세요.' }, 400);
  }
  if (new_password.length > 12) {
    return jsonResponse({ ok: false, error: '비밀번호는 12자 이하로 입력해주세요.' }, 400);
  }
  if (new_password.length < 4) {
    return jsonResponse({ ok: false, error: '비밀번호는 4자 이상으로 입력해주세요.' }, 400);
  }

  // 최초 로그인 강제 변경 상황이 아니라면, 현재 비밀번호 확인을 요구합니다.
  const fullUser = await db.prepare('SELECT password_hash, must_change_password FROM users WHERE id = ?')
    .bind(requester.id).first();

  if (!fullUser.must_change_password) {
    if (!current_password) {
      return jsonResponse({ ok: false, error: '현재 비밀번호를 입력해주세요.' }, 400);
    }
    const valid = await verifyPassword(current_password, fullUser.password_hash);
    if (!valid) {
      return jsonResponse({ ok: false, error: '현재 비밀번호가 올바르지 않아요.' }, 401);
    }
  }

  const newHash = await hashPassword(new_password);
  await db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?')
    .bind(newHash, requester.id).run();

  return jsonResponse({ ok: true });
}
