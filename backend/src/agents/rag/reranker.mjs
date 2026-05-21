import { BaseAgent } from '../base.mjs';
import { normalizeText, extractTerms, inferToolTerms } from './helpers.mjs';

class RerankerAgent extends BaseAgent {
  constructor() {
    super({
      id:          'reranker',
      name:        'RerankerAgent',
      group:       'rag',
      description: '上下文重排。用混合评分（向量相似度×0.52 + 关键词覆盖×0.28 + 标题命中×0.22 + 工具名精确命中加成）对候选结果排序过滤，知识节点保留最多4条，帖子保留最多2条。',
      inputSchema: {
        rawNodes: 'KnowledgeNode[] · hybridRetriever 输出的原始知识节点',
        rawPosts: 'CommunityPost[] · hybridRetriever 输出的原始帖子',
        keywords: 'string[] · 关键词列表',
        query:    'string · 原始查询',
        rewrittenQuery: 'string · 改写后查询',
      },
      outputSchema: {
        relatedNodes: 'KnowledgeNode[] · 重排后的知识节点（带 _score 字段）',
        relatedPosts: 'CommunityPost[] · 重排后的帖子（带 _score 字段）',
      },
      connects_to: ['doc_grader'],
    });
  }

  async execute(state) {
    const { rawNodes, rawPosts, keywords = [], query, rewrittenQuery } = state;

    const inferredTerms = inferToolTerms(query, keywords);
    const queryTerms    = extractTerms(query, rewrittenQuery, keywords, inferredTerms);
    const queryTermSet  = new Set(queryTerms);

    const score = (item) => {
      const title = normalizeText(item.title ?? '');
      const body  = normalizeText(item.content ?? item.summary ?? '');
      const text  = `${title}${body}`;

      const hits       = [...queryTermSet].filter((k) => text.includes(normalizeText(k)));
      const titleHits  = hits.filter((k) => title.includes(normalizeText(k)));
      const kwCoverage = Math.min(hits.length / Math.max(Math.min(queryTermSet.size, 6), 1), 1);
      const titleCov   = Math.min(titleHits.length / Math.max(Math.min(queryTermSet.size, 4), 1), 1);
      const titleBoost = titleCov * 0.22;
      const exactBoost = inferredTerms.some((t) => title.includes(normalizeText(t))) ? 0.18 : 0;

      return Math.min((item.similarity ?? 0) * 0.52 + kwCoverage * 0.28 + titleBoost + exactBoost, 1);
    };

    const keepNode = (n) => {
      const title = normalizeText(n.title ?? '');
      const text  = `${title}${normalizeText(n.content ?? '')}`;
      const hits  = queryTerms.filter((k) => text.includes(normalizeText(k)));
      const titleHit    = hits.some((k) => title.includes(normalizeText(k)));
      const exactToolHit = inferredTerms.some((t) => title.includes(normalizeText(t)));
      return exactToolHit || titleHit || (n.similarity ?? 0) >= 0.48 || ((n._score ?? 0) >= 0.38 && hits.length > 0);
    };

    const keepPost = (p) => {
      const text = normalizeText(`${p.title ?? ''}${p.summary ?? ''}`);
      const hits = queryTerms.filter((k) => text.includes(normalizeText(k)));
      return (p.similarity ?? 0) >= 0.56 || ((p._score ?? 0) >= 0.44 && hits.length >= 2);
    };

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
}

export const rerankerAgent = new RerankerAgent();
