/** Shared utilities for all RAG pipeline agents */

export function extractJSON(text, fallback) {
  try {
    const m = text.match(/```json\n?([\s\S]*?)```/) || text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    return JSON.parse(m ? m[1] : text.trim());
  } catch { return fallback; }
}

export function dedup(arr) {
  const seen = new Set();
  return arr.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export const STOP_TERMS = new Set([
  '如何', '怎么', '怎样', '什么', '为什么', '哪些', '可以', '是否', '有没有',
  '一个', '这个', '那个', '进行', '使用', '帮助', '设计', '作品集',
  'the', 'and', 'for', 'with', 'how', 'what', 'why', 'can',
]);

export function normalizeText(text = '') {
  return String(text).toLowerCase().replace(/\s+/g, '');
}

export function extractTerms(...inputs) {
  const raw = inputs.flat().filter(Boolean).join(' ');
  const terms = raw.match(/[\u4e00-\u9fa5a-zA-Z0-9]{2,}/g) ?? [];
  const cleaned = terms
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length >= 2 && !STOP_TERMS.has(t));

  const bigrams = [];
  for (const term of cleaned) {
    if (/^[\u4e00-\u9fa5]{4,}$/.test(term)) {
      for (let i = 0; i < term.length - 1; i++) {
        const bg = term.slice(i, i + 2);
        if (!STOP_TERMS.has(bg)) bigrams.push(bg);
      }
    }
  }
  return [...new Set([...cleaned, ...bigrams])].slice(0, 24);
}

export function inferToolTerms(query, keywords = []) {
  const text = normalizeText([query, ...keywords].join(' '));
  const inferred = [];
  if (/(技能|能力|水平|熟练度|胜任力|维度|画像).*(可视化|图|展示|表达|评估)|雷达|radar/.test(text))
    inferred.push('雷达图', '技能水平', '能力评估', '多维度可视化');
  if (/(形态|矩阵|方案组合|设计空间|概念生成|系统性|系统思维|组合创新|morphological)/.test(text))
    inferred.push('形态学矩阵', '方案组合', '设计空间', '系统性思维');
  return inferred;
}

export function getLLMText(response) {
  const c = response.content;
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) return c.map((x) => x.text ?? '').join('');
  return String(c ?? '');
}

export function parseAnswer(rawText) {
  let recommendations = [];
  let answer = rawText;

  const recoMatch = rawText.match(/<recommendations>([\s\S]*?)<\/recommendations>/);
  if (recoMatch) {
    const inner = recoMatch[1].replace(/```json|```/g, '').trim();
    try { recommendations = JSON.parse(inner); } catch { /* ignore */ }
    answer = rawText.replace(/<recommendations>[\s\S]*?<\/recommendations>/, '').trim();
  }
  if (recommendations.length === 0) {
    const arrMatch = answer.match(/\[\s*"[^"]+?"[\s\S]*?\]\s*$/);
    if (arrMatch) {
      try {
        recommendations = JSON.parse(arrMatch[0]);
        answer = answer.slice(0, answer.lastIndexOf(arrMatch[0])).trim();
      } catch { /* ignore */ }
    }
  }
  if (!Array.isArray(recommendations)) recommendations = [];
  recommendations = recommendations.filter((r) => typeof r === 'string' && r.trim()).slice(0, 4);
  return { answer, recommendations };
}
