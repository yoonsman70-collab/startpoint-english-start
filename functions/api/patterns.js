import { jsonResponse } from '../_utils/auth.js';

// 학생 앱이 문장을 불러올 때 사용하는 API입니다.
// 예: /api/patterns?level=start
export async function onRequestGet(context) {
  const { request, env } = context;
  const db = env.DB;
  const url = new URL(request.url);
  const levelCode = url.searchParams.get('level') || 'start';

  const level = await db.prepare('SELECT id FROM levels WHERE code = ?').bind(levelCode).first();
  if (!level) {
    return jsonResponse({ ok: false, error: '존재하지 않는 레벨이에요.' }, 404);
  }

  const { results: patterns } = await db.prepare(
    'SELECT id, pattern_text, desc_text, icon, sort_order FROM patterns WHERE level_id = ? ORDER BY sort_order ASC'
  ).bind(level.id).all();

  if (patterns.length === 0) {
    return jsonResponse({ ok: true, patterns: [] });
  }

  const patternIds = patterns.map(p => p.id);
  const placeholders = patternIds.map(() => '?').join(',');
  const { results: sentences } = await db.prepare(
    `SELECT id, pattern_id, eng_text, kor_text, sort_order FROM sentences WHERE pattern_id IN (${placeholders}) ORDER BY sort_order ASC`
  ).bind(...patternIds).all();

  const sentencesByPattern = {};
  sentences.forEach(s => {
    if (!sentencesByPattern[s.pattern_id]) sentencesByPattern[s.pattern_id] = [];
    sentencesByPattern[s.pattern_id].push({
      id: s.id,
      eng: s.eng_text,
      kor: s.kor_text
    });
  });

  const result = patterns.map((p, idx) => ({
    id: p.id,
    title: `Day ${idx + 1}: ${p.pattern_text}`,
    desc: p.desc_text || '',
    icon: p.icon || '📘',
    sentences: sentencesByPattern[p.id] || []
  }));

  return jsonResponse({ ok: true, patterns: result });
}
