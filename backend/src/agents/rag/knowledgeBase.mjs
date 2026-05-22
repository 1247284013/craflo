/**
 * KnowledgeBaseAgent — the single public-facing RAG agent.
 *
 * Internally runs the full 7-step pipeline via ragGraph:
 *   query_analyzer → query_rewriter → hybrid_retriever
 *   → reranker → doc_grader → knowledge_generator / fallback_generator
 *
 * From the outside this looks like one agent with a clean interface:
 *   input:  { query, lang? }
 *   output: { answer, recommendations, context, hasRelevantDocs }
 */
import { BaseAgent } from '../base.mjs';
import { ragGraph }  from '../../graphs/ragGraph.mjs';

class KnowledgeBaseAgent extends BaseAgent {
  constructor() {
    super({
      id:          'knowledge_base',
      name:        'KnowledgeBaseAgent',
      group:       'knowledge',
      description: '知识库问答。接收用户查询，内部执行完整的检索增强生成（RAG）管道（意图分析→改写→混合检索→重排→评级→生成），返回答案和推荐内容。',
      inputSchema: {
        query: 'string · 用户的自然语言查询',
        lang:  "'zh' | 'en' · 回答语言，默认 zh",
      },
      outputSchema: {
        answer:          'string · 生成的答案',
        recommendations: 'string[] · 推荐的相关学习节点或内容',
        context:         'string · 检索到的上下文片段（调试用）',
        hasRelevantDocs: 'boolean · 是否找到相关文档',
      },
      connects_to: ['learning_path_planner', 'project_agent'],
    });
  }

  async execute(input) {
    const state = await ragGraph.invoke({
      query: input.query ?? '',
      lang:  input.lang  ?? 'zh',
    });
    return {
      answer:          state.answer          ?? '',
      recommendations: state.recommendations ?? [],
      context:         state.context         ?? '',
      hasRelevantDocs: state.hasRelevantDocs ?? false,
    };
  }
}

export const knowledgeBaseAgent = new KnowledgeBaseAgent();
