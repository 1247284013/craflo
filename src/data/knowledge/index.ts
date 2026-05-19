// ─────────────────────────────────────────────────────────────────────────────
// Craflo Knowledge Base — Data Layer
// Supabase 版本：所有数据从 Supabase knowledge_nodes 表实时读取
// 本地 fallback 数据保留在 localFallback 中，Supabase 不可用时使用
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from '../../lib/supabase';
import { ragQuery } from '../../lib/agentAPI';

export type KnowledgeDomain = 'portfolio' | 'project' | 'learning-path' | 'interview' | 'general';
export type KnowledgeLevel  = 'beginner' | 'intermediate' | 'advanced';
export type KnowledgeType   = 'branch' | 'concept' | 'tutorial' | 'standard' | 'tip' | 'task';

export interface KnowledgeNode {
  id: string;
  parent_id: string | null;
  title_zh: string;
  title_en: string;
  type: KnowledgeType;
  content_zh?: string;
  content_en?: string;
  images?: { url: string; caption_zh: string; caption_en: string }[];
  domains: KnowledgeDomain[];
  roles: string[];
  level: KnowledgeLevel;
  tags: string[];
  ai_scenarios?: string[];
  references?: { label: string; url: string }[];
  sort_order: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Supabase fetch — 带本地 fallback
// ─────────────────────────────────────────────────────────────────────────────
let _cache: KnowledgeNode[] | null = null;

export async function fetchAllNodes(): Promise<KnowledgeNode[]> {
  if (_cache) return _cache;

  try {
    const { data, error } = await supabase
      .from('knowledge_nodes')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    if (data && data.length > 0) {
      _cache = data as KnowledgeNode[];
      return _cache;
    }
  } catch (e) {
    console.warn('[Knowledge] Supabase fetch failed, using local fallback:', e);
  }

  _cache = LOCAL_FALLBACK;
  return _cache;
}

/** 清除缓存（强制重新拉取） */
export function clearCache() { _cache = null; }

// ─────────────────────────────────────────────────────────────────────────────
// Sync helpers（基于已加载的 nodes 数组操作，供组件内使用）
// ─────────────────────────────────────────────────────────────────────────────
export function getChildren(nodes: KnowledgeNode[], parentId: string): KnowledgeNode[] {
  return nodes
    .filter(n => n.parent_id === parentId)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function getNode(nodes: KnowledgeNode[], id: string): KnowledgeNode | undefined {
  return nodes.find(n => n.id === id);
}

export function getBreadcrumb(nodes: KnowledgeNode[], id: string): KnowledgeNode[] {
  const path: KnowledgeNode[] = [];
  let current = getNode(nodes, id);
  while (current) {
    path.unshift(current);
    current = current.parent_id ? getNode(nodes, current.parent_id) : undefined;
  }
  return path;
}

export function searchNodes(nodes: KnowledgeNode[], query: string): KnowledgeNode[] {
  const q = query.toLowerCase();
  return nodes.filter(n =>
    n.type !== 'branch' && (
      n.title_zh.toLowerCase().includes(q) ||
      n.title_en?.toLowerCase().includes(q) ||
      n.content_zh?.toLowerCase().includes(q) ||
      n.tags.some(t => t.toLowerCase().includes(q))
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Community Post type（from community_posts table）
// ─────────────────────────────────────────────────────────────────────────────
export interface CommunityPost {
  id: string;
  title: string;
  content: string;
  board_id: string;
  author_name: string | null;
  author_initial: string | null;
  tags: string[];
  like_count: number;
  comment_count: number;
  view_count: number;
  is_solved: boolean;
  is_official: boolean;
  is_pinned: boolean;
  has_ai_summary: boolean;
  ai_summary: string | null;
  similarity?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Global Search（知识节点 + 社区帖子 并行语义检索）
// ─────────────────────────────────────────────────────────────────────────────
export interface GlobalSearchResult {
  knowledgeNodes: KnowledgeNode[];
  communityPosts: CommunityPost[];
}

export async function globalSearch(query: string): Promise<GlobalSearchResult> {
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
  if (!apiKey) throw new Error('Missing VITE_GOOGLE_API_KEY');

  // 生成查询向量
  const embedRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/gemini-embedding-001',
        content: { parts: [{ text: query }] },
        outputDimensionality: 768,
      }),
    }
  );
  if (!embedRes.ok) throw new Error(`Embedding API error: ${embedRes.status}`);
  const embedData = await embedRes.json();
  const queryEmbedding: number[] = embedData.embedding.values;

  // 并行搜索两张表
  const [nodesRes, postsRes] = await Promise.allSettled([
    supabase.rpc('match_knowledge_nodes', {
      query_embedding: queryEmbedding,
      match_threshold: 0.65,
      match_count: 4,
    }),
    supabase.rpc('match_community_posts', {
      query_embedding: queryEmbedding,
      match_threshold: 0.6,
      match_count: 3,
    }),
  ]);

  const knowledgeNodes = nodesRes.status === 'fulfilled' && nodesRes.value.data
    ? (nodesRes.value.data as KnowledgeNode[]).filter(n => n.type !== 'branch')
    : [];

  const rawPosts = postsRes.status === 'fulfilled' && postsRes.value.data
    ? (postsRes.value.data as CommunityPost[])
    : [];

  // 二次过滤：提取查询中的核心词（3字以上中文词组），要求帖子至少命中一个
  const keyTerms = (query.match(/[\u4e00-\u9fa5a-zA-Z]{3,}/g) ?? [])
    .filter(t => !['如何', '怎么', '什么', '为什么', '哪些', '可以', '使用', '怎样', '有哪些'].includes(t));

  const communityPosts = keyTerms.length === 0
    ? rawPosts
    : rawPosts.filter(p => {
        const text = `${p.title} ${p.content} ${p.tags.join(' ')}`;
        return keyTerms.some(term => text.includes(term));
      });

  return { knowledgeNodes, communityPosts };
}

// ─────────────────────────────────────────────────────────────────────────────
// RAG Answer Generation（语义搜索 → Gemini 生成综合回答）
// ─────────────────────────────────────────────────────────────────────────────
export interface AIAnswer {
  text: string;
  relatedNodes: KnowledgeNode[];
  relatedPosts: CommunityPost[];
  recommendations: string[];
}

export async function generateAnswer(query: string, lang: 'zh' | 'en' = 'zh'): Promise<AIAnswer> {
  // Delegate to the LangChain Agent backend. In production this must use
  // VITE_API_BASE_URL via agentAPI; direct "/api/rag" only works in Vite dev proxy.
  const data = await ragQuery(query, lang);

  return {
    text: data.text ?? '',
    relatedNodes: (data.relatedNodes ?? []).map((n) => ({
      id: n.id,
      parent_id: null,
      title_zh: n.title,
      title_en: n.title,
      type: (n.type as KnowledgeType) ?? 'concept',
      content_zh: n.content ?? '',
      content_en: n.content ?? '',
      images: [],
      domains: [],
      roles: [],
      level: (n.level as KnowledgeLevel) ?? 'beginner',
      tags: n.tags ?? [],
      sort_order: 0,
    })),
    relatedPosts: (data.relatedPosts ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      content: p.summary ?? '',
      board_id: p.board,
      author_name: null,
      author_initial: null,
      tags: [],
      like_count: p.likes ?? 0,
      comment_count: p.comments ?? 0,
      view_count: p.views ?? 0,
      is_solved: false,
      is_official: false,
      is_pinned: false,
      has_ai_summary: Boolean(p.summary),
      ai_summary: p.summary ?? null,
    })),
    recommendations: data.recommendations ?? [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Semantic Search（Google Embedding + Supabase pgvector）
// ─────────────────────────────────────────────────────────────────────────────
export async function semanticSearch(query: string): Promise<KnowledgeNode[]> {
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
  if (!apiKey) throw new Error('Missing VITE_GOOGLE_API_KEY');

  // 1. 把查询词转成向量
  const embedRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/gemini-embedding-001',
        content: { parts: [{ text: query }] },
        outputDimensionality: 768,
      }),
    }
  );
  if (!embedRes.ok) throw new Error(`Embedding API error: ${embedRes.status}`);
  const embedData = await embedRes.json();
  const queryEmbedding: number[] = embedData.embedding.values;

  // 2. 用向量在 Supabase 中查相似节点
  const { data, error } = await supabase.rpc('match_knowledge_nodes', {
    query_embedding: queryEmbedding,
    match_threshold: 0.65,
    match_count: 8,
  });
  if (error) throw error;
  return ((data ?? []) as KnowledgeNode[]).filter(n => n.type !== 'branch');
}

// ─────────────────────────────────────────────────────────────────────────────
// Local Fallback（Supabase 不可用时使用）
// ─────────────────────────────────────────────────────────────────────────────
const LOCAL_FALLBACK: KnowledgeNode[] = [
  {
    id: 'root', parent_id: null, title_zh: '知识库', title_en: 'Knowledge Base',
    type: 'branch', domains: ['general'], roles: ['all'], level: 'beginner', tags: [], sort_order: 0,
  },
  {
    id: 'viz-tools', parent_id: 'root', title_zh: '可视化工具', title_en: 'Visualization Tools',
    type: 'branch', domains: ['portfolio', 'project'], roles: ['all'], level: 'beginner',
    tags: ['可视化', '工具', '设计方法'], sort_order: 1,
  },
  {
    id: 'radar-chart', parent_id: 'viz-tools',
    title_zh: '雷达图 Radar Chart', title_en: 'Radar Chart (Spider Plot)',
    type: 'tutorial', domains: ['portfolio', 'project', 'learning-path'], roles: ['all'], level: 'beginner',
    tags: ['雷达图', '蜘蛛网图', '竞品分析', '用户调研', '可视化', '多维数据'],
    content_zh: `## 什么是雷达图？\n\n雷达图（Radar Chart），又称蜘蛛网图（Spider Plot），是一种表现**多维数据强弱**的图表。\n\n**核心价值**：透过多维度量化评估多个设计方案或市场竞品，通过图形重叠面积的对比，直观论证设计的优越性与可行性。\n\n---\n\n## 什么时候可以用雷达图？\n\n### #01 竞品分析（Competitor Analysis）\n比较自己的设计与多个竞品在关键维度的优劣势。\n\n### #02 用户调研（User Research）\n分析特定用户画像在不同需求维度上的特征。`,
    images: [
      { url: '/knowledge-images/radar-chart_image1.jpeg', caption_zh: '雷达图设计步骤 Step 1–3', caption_en: 'Radar Chart Design Steps 1–3' },
      { url: '/knowledge-images/radar-chart_image2.jpeg', caption_zh: '雷达图设计步骤 Step 4–5', caption_en: 'Radar Chart Design Steps 4–5' },
    ],
    ai_scenarios: ['用户问「怎么展示我的技能水平」→ 推荐雷达图', '作品集缺少能力可视化时 → 建议添加雷达图'],
    references: [{ label: 'Pinterest 参考案例', url: 'https://www.pinterest.com/pin/512566001350790524/' }],
    sort_order: 1,
  },
  {
    id: 'morphological-chart', parent_id: 'viz-tools',
    title_zh: '形态学矩阵 Morphological Chart', title_en: 'Morphological Chart',
    type: 'tutorial', domains: ['portfolio', 'project'], roles: ['all'], level: 'beginner',
    tags: ['形态学矩阵', '概念设计', '发散思维', '方案推导', '系统设计'],
    content_zh: `## 什么是形态学矩阵？\n\n通过形态学矩阵进行严谨的排列组合，不仅能高效推导出多个创新方案，更能深度展现你的**系统性逻辑思维**。\n\n**核心原理**：将复杂问题拆解为多个独立的功能或形态特征变量，对每一变量穷举可能的解决方案，最后跨越维度进行交叉组合。`,
    images: [
      { url: '/knowledge-images/morphological-chart_image1.jpeg', caption_zh: '形态学矩阵示例 1', caption_en: 'Example 1' },
      { url: '/knowledge-images/morphological-chart_image2.jpeg', caption_zh: '形态学矩阵示例 2', caption_en: 'Example 2' },
      { url: '/knowledge-images/morphological-chart_image3.jpeg', caption_zh: '形态学矩阵示例 3', caption_en: 'Example 3' },
      { url: '/knowledge-images/morphological-chart_image4.jpeg', caption_zh: '形态学矩阵示例 4', caption_en: 'Example 4' },
    ],
    ai_scenarios: ['用户在概念设计阶段卡住 → 推荐使用形态学矩阵', '作品集缺少方案推导逻辑 → 建议补充形态学矩阵'],
    references: [{ label: 'Cornell Morphological Chart', url: 'https://arl.human.cornell.edu/PAGES_Delft/Morpholigical_Chart-deeper.pdf' }],
    sort_order: 2,
  },
];
