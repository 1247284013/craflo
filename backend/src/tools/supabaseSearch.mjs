import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { DynamicTool } from '@langchain/core/tools';
import ws from 'ws';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { realtime: { transport: ws } },
);

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: 'gemini-embedding-001',
  apiKey: process.env.GOOGLE_API_KEY,
  taskType: 'RETRIEVAL_QUERY',
  outputDimensionality: 768,
});

const STOP_TERMS = new Set([
  '如何', '怎么', '怎样', '什么', '为什么', '哪些', '可以', '是否', '有没有',
  '一个', '这个', '那个', '进行', '使用', '帮助', '设计', '作品集',
  'the', 'and', 'for', 'with', 'how', 'what', 'why', 'can',
]);

function cleanKeyword(k) {
  return String(k ?? '')
    .trim()
    .replace(/[%,.*()[\]{}]/g, '')
    .toLowerCase();
}

function normalizeKeywords(keywords) {
  return [...new Set((keywords ?? []).map(cleanKeyword))]
    .filter((k) => k.length >= 2 && !STOP_TERMS.has(k))
    .slice(0, 10);
}

// ── Shared: get embedding vector ──────────────────────────────────────────────
export async function getEmbedding(text) {
  return embeddings.embedQuery(text);
}

// ── Vector search: knowledge nodes ────────────────────────────────────────────
export async function vectorSearchKnowledge(query, { threshold = 0.42, count = 6 } = {}) {
  const embedding = await getEmbedding(query);
  const { data, error } = await supabase.rpc('match_knowledge_nodes', {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: count,
  });
  if (error) throw error;
  return (data ?? [])
    .filter((n) => n.type !== 'branch')
    .map((n) => ({
      id: n.id,
      title: n.title_zh,
      content: n.content_zh?.slice(0, 600) ?? '',
      type: n.type,
      tags: n.tags ?? [],
      level: n.level,
      similarity: n.similarity ?? 0,
      source: 'vector',
    }));
}

// ── Vector search: community posts ────────────────────────────────────────────
export async function vectorSearchCommunity(query, { threshold = 0.42, count = 4 } = {}) {
  const embedding = await getEmbedding(query);
  const { data, error } = await supabase.rpc('match_community_posts', {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: count,
  });
  if (error) throw error;
  return (data ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    summary: p.ai_summary?.slice(0, 400) ?? '',
    board: p.board_id,
    likes: p.likes ?? 0,
    views: p.views ?? 0,
    comments: p.comment_count ?? 0,
    similarity: p.similarity ?? 0,
    source: 'vector',
  }));
}

// ── Keyword search: knowledge nodes (ilike, no new RPC needed) ────────────────
export async function keywordSearchKnowledge(keywords) {
  const terms = normalizeKeywords(keywords);
  if (!terms.length) return [];
  const orFilter = terms
    .flatMap((k) => [`title_zh.ilike.%${k}%`, `content_zh.ilike.%${k}%`, `title_en.ilike.%${k}%`, `content_en.ilike.%${k}%`])
    .join(',');
  const { data } = await supabase
    .from('knowledge_nodes')
    .select('id, title_zh, content_zh, type, tags, level')
    .or(orFilter)
    .neq('type', 'branch')
    .limit(8);
  return (data ?? []).map((n) => ({
    id: n.id,
    title: n.title_zh,
    content: n.content_zh?.slice(0, 600) ?? '',
    type: n.type,
    tags: n.tags ?? [],
    level: n.level,
    similarity: 0.42,  // keyword-only candidates still need rerank evidence
    source: 'keyword',
  }));
}

// ── Keyword search: community posts ──────────────────────────────────────────
export async function keywordSearchCommunity(keywords) {
  const terms = normalizeKeywords(keywords);
  if (!terms.length) return [];
  const orFilter = terms
    .flatMap((k) => [`title.ilike.%${k}%`, `content.ilike.%${k}%`])
    .join(',');
  const { data } = await supabase
    .from('community_posts')
    .select('id, title, content, board_id, likes, views, ai_summary')
    .or(orFilter)
    .limit(3);
  return (data ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    summary: p.ai_summary?.slice(0, 400) ?? p.content?.slice(0, 300) ?? '',
    board: p.board_id,
    likes: p.likes ?? 0,
    views: p.views ?? 0,
    comments: 0,
    similarity: 0.35,
    source: 'keyword',
  }));
}

// ── Legacy DynamicTool wrappers (kept for backward compat) ────────────────────
export const searchKnowledgeTool = new DynamicTool({
  name: 'search_knowledge_nodes',
  description: '在知识库中语义检索相关知识节点。输入：搜索查询字符串。',
  func: async (query) => {
    try {
      const results = await vectorSearchKnowledge(query);
      return results.length ? JSON.stringify(results) : '未找到相关知识节点。';
    } catch (err) { return `检索失败：${err.message}`; }
  },
});

export const searchCommunityTool = new DynamicTool({
  name: 'search_community_posts',
  description: '在社区帖子中语义检索相关讨论。输入：搜索查询字符串。',
  func: async (query) => {
    try {
      const results = await vectorSearchCommunity(query);
      return results.length ? JSON.stringify(results) : '未找到相关社区帖子。';
    } catch (err) { return `检索失败：${err.message}`; }
  },
});
