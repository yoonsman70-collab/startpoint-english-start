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

  const { username, password, display_name, class_name } = body;
  if (!username || !password || !display_name) {
    return jsonResponse({ ok: false, error: '아이디, 비밀번호, 이름은 꼭 입력해야 해요.' }, 400);
  }

  const existing = await db.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
  if (existing) {
    return jsonResponse({ ok: false, error: '이미 사용 중인 아이디예요.' }, 409);
  }

  const hash = await hashPassword(password);
  await db.prepare(
    'INSERT INTO users (username, password_hash, display_name, class_name, role) VALUES (?, ?, ?, ?, ?)'
  ).bind(username, hash, display_name, class_name || null, 'student').run();

  return jsonResponse({ ok: true });
}
