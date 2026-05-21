import { BaseAgent } from '../base.mjs';

const MIN_SCORE = 0.34;

class DocGraderAgent extends BaseAgent {
  constructor() {
    super({
      id:          'doc_grader',
      name:        'DocGraderAgent',
      group:       'rag',
      description: '文档质量判定与上下文组装。对重排结果按最低相关度（0.34）过滤，判断是否有足够相关文档，并将知识节点和社区帖子拼接为结构化 context 字符串传入生成阶段。',
      inputSchema: {
        relatedNodes: 'KnowledgeNode[] · reranker 输出，含 _score',
        relatedPosts: 'CommunityPost[] · reranker 输出，含 _score',
      },
      outputSchema: {
        hasRelevantDocs: 'boolean · true → 走 generator，false → 走 fallback_generator',
        context:         'string · 格式化的知识库+社区上下文',
      },
      connects_to: ['knowledge_generator', 'fallback_generator'],
    });
  }

  async execute(state) {
    const qualityNodes = (state.relatedNodes ?? []).filter((n) => (n._score ?? 0) >= MIN_SCORE);
    const qualityPosts = (state.relatedPosts ?? []).filter((p) => (p._score ?? 0) >= MIN_SCORE);
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
}

export const docGraderAgent = new DocGraderAgent();
