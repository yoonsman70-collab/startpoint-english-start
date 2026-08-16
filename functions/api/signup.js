import { jsonResponse } from '../_utils/auth.js';
import { hashPassword } from '../_utils/crypto.js';

// 학생이 직접 가입 신청을 하는 API입니다.
// 로그인 없이 누구나 호출할 수 있지만, 계정은 바로 쓸 수 없고
// is_approved = 0(대기중) 상태로 저장되어 관리자가 승인해야 로그인할 수 있습니다.
export async function onRequestPost(context) {
  const { request, env } = context;
  const db = env.DB;

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ ok: false, error: '잘못된 요청이에요.' }, 400);
  }

  const username = (body.username || '').trim();
  const password = body.password || '';
  const display_name = (body.display_name || '').trim();

  if (!username || !password || !display_name) {
    return jsonResponse({ ok: false, error: '이름, 아이디, 비밀번호를 모두 입력해주세요.' }, 400);
  }
  if (username.length > 8) {
    return jsonResponse({ ok: false, error: '아이디는 8자 이하로 입력해주세요.' }, 400);
  }
  if (password.length > 12) {
    return jsonResponse({ ok: false, error: '비밀번호는 12자 이하로 입력해주세요.' }, 400);
  }
  if (password.length < 4) {
    return jsonResponse({ ok: false, error: '비밀번호는 4자 이상으로 입력해주세요.' }, 400);
  }
  // 아이디에 한글/공백/특수문자가 섞이지 않도록 (영문/숫자만 허용)
  if (!/^[a-zA-Z0-9]+$/.test(username)) {
    return jsonResponse({ ok: false, error: '아이디는 영문과 숫자만 사용할 수 있어요.' }, 400);
  }

  const existing = await db.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
  if (existing) {
    return jsonResponse({ ok: false, error: '이미 사용 중인 아이디예요.' }, 409);
  }

  const hash = await hashPassword(password);
  await db.prepare(
    `INSERT INTO users (username, password_hash, display_name, role, is_approved)
     VALUES (?, ?, ?, 'student', 0)`
  ).bind(username, hash, display_name).run();

  return jsonResponse({ ok: true, message: '가입 신청이 완료됐어요! 선생님 승인 후 로그인할 수 있어요.' });
}
