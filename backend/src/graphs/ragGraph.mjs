/**
 * Craflo RAG Pipeline — LangGraph StateGraph (7 nodes)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  START                                                                  │
 * │    ↓                                                                    │
 * │  [1. analyze_query]   意图识别 + 问题诊断                                │
 * │    ↓                                                                    │
 * │  [2. rewrite_query]   Query 改写 → 标准化输出 + 多路 Query               │
 * │    ↓                                                                    │
 * │  [3. hybrid_retrieve] 向量相似度检索 + 关键词检索（并行）                 │
 * │    ↓                                                                    │
 * │  [4. rerank_results]  上下文召回 + 重排（综合评分）                       │
 * │    ↓                                                                    │
 * │  [5. grade_docs]      文档相关性评估                                     │
 * │    ↓  (条件路由)                                                         │
 * │  [6a. generate]       有相关文档 → 基于知识库生成                         │
 * │  [6b. generate_fallback] 无文档 → 基于通用知识生成                        │
 * │    ↓                                                                    │
 * │  END                                                                    │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * 每个节点在 LangSmith Traces 中独立显示，LangGraph Studio 可视化图结构。
 */

import { StateGraph, START, END, Annotation } from '@langchain/langgraph';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import {
  vectorSearchKnowledge,
  vectorSearchCommunity,
  keywordSearchKnowledge,
  keywordSearchCommunity,
} from '../tools/supabaseSearch.mjs';

// ── LLM instances ─────────────────────────────────────────────────────────────

// Fast model for analysis/rewrite (low latency, low cost)
const fastLLM = new ChatGoogleGenerativeAI({
  model: 'gemini-2.5-flash',
  apiKey: process.env.GOOGLE_API_KEY,
  temperature: 0.1,
  maxOutputTokens: 400,
});

// Full model for generation
const genLLM = new ChatGoogleGenerativeAI({
  model: 'gemini-2.5-flash',
  apiKey: process.env.GOOGLE_API_KEY,
  temperature: 0.5,
  maxOutputTokens: 2000,
});

// ── Graph State ───────────────────────────────────────────────────────────────

const GraphState = Annotation.Root({
  // ── Input
  query:           Annotation({ reducer: (_, v) => v }),
  lang:            Annotation({ reducer: (_, v) => v, default: () => 'zh' }),

  // ── Node 1: analyze_query output
  intent:          Annotation({ reducer: (_, v) => v, default: () => 'general' }),
  queryIssues:     Annotation({ reducer: (_, v) => v, default: () => [] }),
  diagnosis:       Annotation({ reducer: (_, v) => v, default: () => '' }),

  // ── Node 2: rewrite_query output
  rewrittenQuery:  Annotation({ reducer: (_, v) => v, default: () => '' }),
  searchQueries:   Annotation({ reducer: (_, v) => v, default: () => [] }),
  keywords:        Annotation({ reducer: (_, v) => v, default: () => [] }),

  // ── Node 3: hybrid_retrieve output (before rerank)
  rawNodes:        Annotation({ reducer: (_, v) => v, default: () => [] }),
  rawPosts:        Annotation({ reducer: (_, v) => v, default: () => [] }),

  // ── Node 4: rerank_results output
  relatedNodes:    Annotation({ reducer: (_, v) => v, default: () => [] }),
  relatedPosts:    Annotation({ reducer: (_, v) => v, default: () => [] }),

  // ── Node 5: grade_docs output
  context:         Annotation({ reducer: (_, v) => v, default: () => '' }),
  hasRelevantDocs: Annotation({ reducer: (_, v) => v, default: () => false }),

  // ── Node 6: generate output
  answer:          Annotation({ reducer: (_, v) => v, default: () => '' }),
  recommendations: Annotation({ reducer: (_, v) => v, default: () => [] }),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractJSON(text, fallback) {
  try {
    const m = text.match(/```json\n?([\s\S]*?)```/) || text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    return JSON.parse(m ? m[1] : text.trim());
  } catch { return fallback; }
}

function dedup(arr) {
  const seen = new Set();
  return arr.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

const STOP_TERMS = new Set([
  '如何', '怎么', '怎样', '什么', '为什么', '哪些', '可以', '是否', '有没有',
  '一个', '这个', '那个', '进行', '使用', '帮助', '设计', '作品集',
  'the', 'and', 'for', 'with', 'how', 'what', 'why', 'can',
]);

function normalizeText(text = '') {
  return String(text).toLowerCase().replace(/\s+/g, '');
}

function extractTerms(...inputs) {
  const raw = inputs
    .flat()
    .filter(Boolean)
    .join(' ');

  const terms = raw.match(/[\u4e00-\u9fa5a-zA-Z0-9]{2,}/g) ?? [];
  const cleaned = terms
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length >= 2 && !STOP_TERMS.has(t));

  // Add short Chinese bigrams for phrases like "技能水平可视化".
  const bigrams = [];
  for (const term of cleaned) {
    if (/^[\u4e00-\u9fa5]{4,}$/.test(term)) {
      for (let i = 0; i < term.length - 1; i += 1) {
        const bg = term.slice(i, i + 2);
        if (!STOP_TERMS.has(bg)) bigrams.push(bg);
      }
    }
  }

  return [...new Set([...cleaned, ...bigrams])].slice(0, 24);
}

function inferToolTerms(query, keywords = []) {
  const text = normalizeText([query, ...keywords].join(' '));
  const inferred = [];

  // Domain aliases bridge user intent to tool names stored in the knowledge base.
  if (/(技能|能力|水平|熟练度|胜任力|维度|画像).*(可视化|图|展示|表达|评估)|雷达|radar/.test(text)) {
    inferred.push('雷达图', '技能水平', '能力评估', '多维度可视化');
  }

  if (/(形态|矩阵|方案组合|设计空间|概念生成|系统性|系统思维|组合创新|morphological)/.test(text)) {
    inferred.push('形态学矩阵', '方案组合', '设计空间', '系统性思维');
  }

  return inferred;
}

function getLLMText(response) {
  const c = response.content;
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) return c.map((x) => x.text ?? '').join('');
  return String(c ?? '');
}

function parseAnswer(rawText) {
  let recommendations = [];
  let answer = rawText;

  // Try <recommendations>...</recommendations> block (preferred format)
  const recoMatch = rawText.match(/<recommendations>([\s\S]*?)<\/recommendations>/);
  if (recoMatch) {
    const inner = recoMatch[1].replace(/```json|```/g, '').trim();
    try { recommendations = JSON.parse(inner); } catch { /* ignore */ }
    answer = rawText.replace(/<recommendations>[\s\S]*?<\/recommendations>/, '').trim();
  }

  // Fallback: try to find a trailing JSON array in the text
  if (recommendations.length === 0) {
    const arrMatch = answer.match(/\[\s*"[^"]+?"[\s\S]*?\]\s*$/);
    if (arrMatch) {
      try {
        recommendations = JSON.parse(arrMatch[0]);
        answer = answer.slice(0, answer.lastIndexOf(arrMatch[0])).trim();
      } catch { /* ignore */ }
    }
  }

  // Ensure it's always an array of strings
  if (!Array.isArray(recommendations)) recommendations = [];
  recommendations = recommendations.filter((r) => typeof r === 'string' && r.trim()).slice(0, 4);

  return { answer, recommendations };
}

// ─────────────────────────────────────────────────────────────────────────────
// NODE 1: analyze_query
// 意图识别 + 问题诊断
// ─────────────────────────────────────────────────────────────────────────────
async function analyzeQuery(state) {
  const res = await fastLLM.invoke([
    new SystemMessage(`你是一个 RAG 搜索系统的查询分析器。分析用户查询，输出 JSON。

意图类型(intent)：
- concept    : 概念解释、定义（"什么是X"）
- howto      : 操作方法、步骤（"怎么做X"、"如何X"）
- comparison : 对比分析（"X和Y的区别"、"哪个更好"）
- case_study : 案例、经验分享（"有没有X的案例"）
- recommendation : 推荐建议（"推荐什么工具/方法"）
- general    : 其他

问题类型(issues) 可以有多个：
- ambiguous      : 语义不明确，有多种理解
- too_short      : 查询过短，缺少上下文
- colloquial     : 口语化、非标准表达
- vague          : 模糊，缺少具体指向
- semantic_drift : 表达与真实意图有偏差
- multilingual   : 混用多种语言

严格返回 JSON，不要任何解释：
{
  "intent": "...",
  "issues": ["...", "..."],
  "diagnosis": "一句话说明查询存在的问题（如无问题则写'查询清晰'）"
}`),
    new HumanMessage(`用户查询：${state.query}`),
  ]);

  const parsed = extractJSON(getLLMText(res), {
    intent: 'general',
    issues: [],
    diagnosis: '查询清晰',
  });

  return {
    intent:      parsed.intent ?? 'general',
    queryIssues: parsed.issues ?? [],
    diagnosis:   parsed.diagnosis ?? '查询清晰',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// NODE 2: rewrite_query
// Query 改写 → 标准化 + 多路扩展
// ─────────────────────────────────────────────────────────────────────────────
async function rewriteQuery(state) {
  const issueDesc = state.queryIssues.length > 0
    ? `检测到的问题：${state.queryIssues.join('、')}`
    : '查询无明显问题';

  const res = await fastLLM.invoke([
    new SystemMessage(`你是一个 RAG 搜索系统的查询改写器，专注于设计工程、工业设计、用户研究、作品集领域。

知识库中包含的工具/方法示例：雷达图、形态学矩阵、竞品分析、用户旅程图、思维导图、SWOT、亲和图等。

改写目标：
- 将口语/模糊/简短的查询转为专业、精准的检索语句
- 补充领域上下文，消除歧义
- 生成 2-3 个互补的搜索 query（覆盖不同角度）
- 提取 4-6 个核心关键词：包括概念词、工具名、方法名（如果问题涉及可视化/图表，一定要推断并加入可能的工具名如"雷达图"）

严格返回 JSON：
{
  "rewrittenQuery": "改写后的主要检索语句（中文，15-40字）",
  "searchQueries": ["补充query1", "补充query2"],
  "keywords": ["关键词1", "关键词2", "关键词3", "关键词4"]
}`),
    new HumanMessage(
      `原始查询：${state.query}
意图：${state.intent}
${issueDesc}`,
    ),
  ]);

  const parsed = extractJSON(getLLMText(res), {
    rewrittenQuery: state.query,
    searchQueries:  [state.query],
    keywords:       [state.query],
  });

  return {
    rewrittenQuery: parsed.rewrittenQuery ?? state.query,
    searchQueries: [
      ...(parsed.searchQueries ?? [state.query]),
      ...inferToolTerms(state.query, parsed.keywords ?? []),
    ],
    keywords: [
      ...new Set([
        ...(parsed.keywords ?? [state.query]),
        ...inferToolTerms(state.query, parsed.keywords ?? []),
      ]),
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// NODE 3: hybrid_retrieve
// 向量相似度检索 + 关键词检索（并行执行）
// ─────────────────────────────────────────────────────────────────────────────
async function hybridRetrieve(state) {
  const inferredTerms = inferToolTerms(state.query, state.keywords);
  const allQueries = [
    state.query,
    state.rewrittenQuery,
    ...state.searchQueries,
    inferredTerms.join(' '),
  ].filter(Boolean);
  const allKeywords = [...new Set([...state.keywords, ...inferredTerms])];

  // Run all retrieval tasks in parallel
  const [
    vectorNodeResults,
    vectorPostResults,
    kwNodeResults,
    kwPostResults,
  ] = await Promise.allSettled([
    // Vector search using primary rewritten query + secondary queries
    (async () => {
      const results = await Promise.all(
        allQueries.slice(0, 4).map((q) => vectorSearchKnowledge(q, { threshold: 0.40, count: 8 })),
      );
      return dedup(results.flat());
    })(),
    // Vector search community posts
    vectorSearchCommunity(state.rewrittenQuery, { threshold: 0.48, count: 4 }),
    // Keyword search knowledge nodes
    keywordSearchKnowledge(allKeywords),
    // Keyword search community posts
    keywordSearchCommunity(allKeywords),
  ]);

  const rawNodes = dedup([
    ...(vectorNodeResults.status === 'fulfilled' ? vectorNodeResults.value : []),
    ...(kwNodeResults.status    === 'fulfilled' ? kwNodeResults.value    : []),
  ]);

  const rawPosts = dedup([
    ...(vectorPostResults.status === 'fulfilled' ? vectorPostResults.value : []),
    ...(kwPostResults.status     === 'fulfilled' ? kwPostResults.value     : []),
  ]);

  return { rawNodes, rawPosts };
}

// ─────────────────────────────────────────────────────────────────────────────
// NODE 4: rerank_results
// 上下文召回 + 重排
// Hybrid score = vector_similarity * 0.65 + keyword_bonus * 0.35
// ─────────────────────────────────────────────────────────────────────────────
async function rerankResults(state) {
  const { rawNodes, rawPosts, keywords, query, rewrittenQuery } = state;

  const inferredTerms = inferToolTerms(query, keywords);
  const queryTerms = extractTerms(query, rewrittenQuery, keywords, inferredTerms);
  const queryTermSet = new Set(queryTerms);

  function score(item) {
    const title = normalizeText(item.title ?? '');
    const body = normalizeText(item.content ?? item.summary ?? '');
    const text = `${title}${body}`;

    const hits = [...queryTermSet].filter((k) => text.includes(normalizeText(k)));
    const titleHits = hits.filter((k) => title.includes(normalizeText(k)));
    const keywordCoverage = Math.min(hits.length / Math.max(Math.min(queryTermSet.size, 6), 1), 1);
    const titleCoverage = Math.min(titleHits.length / Math.max(Math.min(queryTermSet.size, 4), 1), 1);

    const vecScore = item.similarity ?? 0;
    const titleBoost = titleCoverage * 0.22;
    const exactToolBoost = inferredTerms.some((t) => title.includes(normalizeText(t))) ? 0.18 : 0;

    return Math.min(
      vecScore * 0.52 +
      keywordCoverage * 0.28 +
      titleBoost +
      exactToolBoost,
      1,
    );
  }

  function keepNode(n) {
    const title = normalizeText(n.title ?? '');
    const text = `${title}${normalizeText(n.content ?? '')}`;
    const hits = queryTerms.filter((k) => text.includes(normalizeText(k)));
    const titleHit = hits.some((k) => title.includes(normalizeText(k)));
    const exactToolHit = inferredTerms.some((t) => title.includes(normalizeText(t)));
    const sim = n.similarity ?? 0;
    const s = n._score ?? 0;

    return exactToolHit || titleHit || sim >= 0.48 || (s >= 0.38 && hits.length > 0);
  }

  function keepPost(p) {
    const text = normalizeText(`${p.title ?? ''}${p.summary ?? ''}`);
    const hits = queryTerms.filter((k) => text.includes(normalizeText(k)));
    const sim = p.similarity ?? 0;
    const s = p._score ?? 0;

    // Community posts are more likely to be noisy, so require stronger evidence.
    return sim >= 0.56 || (s >= 0.44 && hits.length >= 2);
  }

  const relatedNodes = [...rawNodes]
    .map((n) => ({ ...n, _score: score(n) }))
    .filter(keepNode)
    .sort((a, b) => b._score - a._score)
    .slice(0, 4);

  const relatedPosts = [...rawPosts]
    .map((p) => ({ ...p, _score: score(p) }))
    .filter(keepPost)
    .sort((a, b) => b._score - a._score)
    .slice(0, 2);

  return { relatedNodes, relatedPosts };
}

// ─────────────────────────────────────────────────────────────────────────────
// NODE 5: grade_docs
// 文档相关性评估 + 上下文组装
// ─────────────────────────────────────────────────────────────────────────────
async function gradeDocs(state) {
  const MIN_SCORE = 0.34;

  const qualityNodes = state.relatedNodes.filter((n) => (n._score ?? 0) >= MIN_SCORE);
  const qualityPosts = state.relatedPosts.filter((p) => (p._score ?? 0) >= MIN_SCORE);
  const hasRelevantDocs = qualityNodes.length > 0 || qualityPosts.length > 0;

  const knowledgeCtx = qualityNodes
    .filter((n) => n.content)
    .map((n) => {
      const score = n._score ? ` [相关度 ${(n._score * 100).toFixed(0)}%]` : '';
      return `【知识库${score}】${n.title}\n${n.content.slice(0, 700)}\n标签: ${(n.tags ?? []).join('、')}`;
    })
    .join('\n\n---\n\n');

  const postCtx = qualityPosts
    .slice(0, 2)
    .map((p) => {
      const score = p._score ? ` [相关度 ${(p._score * 100).toFixed(0)}%]` : '';
      return `【社区讨论${score}】${p.title}\n${(p.summary ?? '').slice(0, 350)}`;
    })
    .join('\n\n---\n\n');

  const context = [knowledgeCtx, postCtx].filter(Boolean).join('\n\n═══\n\n');

  return { hasRelevantDocs, context };
}

// ─────────────────────────────────────────────────────────────────────────────
// NODE 6a: generate
// 基于召回文档生成回答
// ─────────────────────────────────────────────────────────────────────────────
async function generate(state) {
  const lang = state.lang === 'en' ? '英文' : '中文';
  const res = await genLLM.invoke([
    new SystemMessage(
      `你是 Craflo 的 AI 助手，专注于设计工程、工业设计、用户研究和作品集制作。
根据以下精准检索到的知识，用清晰、专业的${lang}回答用户问题。

检索结果（已按相关度排序）：
${state.context}

回答要求：
- 综合知识库内容，给出有深度的实用回答
- 可使用 Markdown 格式（标题、列表）
- 引用具体知识点时注明来源（知识库/社区）

⚠️ 重要：回答正文结束后，必须紧接输出以下格式的推荐问题（3条，帮助用户深入探索，必须是完整的中文或英文问句）：
<recommendations>["推荐问题1？", "推荐问题2？", "推荐问题3？"]</recommendations>`,
    ),
    new HumanMessage(state.rewrittenQuery || state.query),
  ]);

  return parseAnswer(getLLMText(res));
}

// ─────────────────────────────────────────────────────────────────────────────
// NODE 6b: generate_fallback
// 知识库无相关文档时，基于通用知识回答
// ─────────────────────────────────────────────────────────────────────────────
async function generateFallback(state) {
  const lang = state.lang === 'en' ? '英文' : '中文';
  const res = await genLLM.invoke([
    new SystemMessage(
      `你是 Craflo 的 AI 助手，专注于设计工程、工业设计、用户研究和作品集制作。
知识库中未检索到足够相关的内容（用户原始问题：「${state.query}」，改写后：「${state.rewrittenQuery}」）。

请基于你的专业知识用${lang}回答，并：
- 开头一句说明"知识库暂无直接相关内容，以下为通用专业解答"
- 提供实用、专业的内容，使用 Markdown 格式

⚠️ 重要：回答正文结束后，必须紧接输出以下格式的推荐问题（3条，帮助用户深入探索，必须是完整的问句）：
<recommendations>["推荐问题1？", "推荐问题2？", "推荐问题3？"]</recommendations>`,
    ),
    new HumanMessage(state.rewrittenQuery || state.query),
  ]);

  return parseAnswer(getLLMText(res));
}

// ── Conditional edge router ───────────────────────────────────────────────────
function routeAfterGrading(state) {
  return state.hasRelevantDocs ? 'generate' : 'generate_fallback';
}

// ── Build the LangGraph StateGraph ────────────────────────────────────────────
const workflow = new StateGraph(GraphState)
  .addNode('analyze_query',    analyzeQuery)
  .addNode('rewrite_query',    rewriteQuery)
  .addNode('hybrid_retrieve',  hybridRetrieve)
  .addNode('rerank_results',   rerankResults)
  .addNode('grade_docs',       gradeDocs)
  .addNode('generate',         generate)
  .addNode('generate_fallback', generateFallback)
  // Edges
  .addEdge(START,              'analyze_query')
  .addEdge('analyze_query',    'rewrite_query')
  .addEdge('rewrite_query',    'hybrid_retrieve')
  .addEdge('hybrid_retrieve',  'rerank_results')
  .addEdge('rerank_results',   'grade_docs')
  .addConditionalEdges('grade_docs', routeAfterGrading, {
    generate:          'generate',
    generate_fallback: 'generate_fallback',
  })
  .addEdge('generate',          END)
  .addEdge('generate_fallback', END);

export const ragGraph = workflow.compile();
