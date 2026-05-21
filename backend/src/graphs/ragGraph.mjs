/**
 * Craflo RAG Pipeline — LangGraph StateGraph (7 nodes)
 *
 * Each node is a registered Agent. The graph wires them together:
 *
 * [START]
 *   → query_analyzer   (意图识别 + 问题诊断)
 *   → query_rewriter   (Query 改写 + 标准化)
 *   → hybrid_retriever (向量 + 关键词混合检索)
 *   → reranker         (上下文重排)
 *   → doc_grader       (相关性判定 + context 组装)
 *   → [conditional]
 *       hasRelevantDocs=true  → knowledge_generator
 *       hasRelevantDocs=false → fallback_generator
 * [END]
 */

import { StateGraph, START, END, Annotation } from '@langchain/langgraph';

// ── Import agents (each encapsulates its own LLM + logic) ────────────────────
import { queryAnalyzerAgent }   from '../agents/rag/queryAnalyzer.mjs';
import { queryRewriterAgent }   from '../agents/rag/queryRewriter.mjs';
import { hybridRetrieverAgent } from '../agents/rag/hybridRetriever.mjs';
import { rerankerAgent }        from '../agents/rag/reranker.mjs';
import { docGraderAgent }       from '../agents/rag/docGrader.mjs';
import { knowledgeGeneratorAgent } from '../agents/rag/generator.mjs';
import { fallbackGeneratorAgent }  from '../agents/rag/fallbackGenerator.mjs';

// ── Shared graph state ────────────────────────────────────────────────────────
const GraphState = Annotation.Root({
  query:           Annotation({ reducer: (_, v) => v }),
  lang:            Annotation({ reducer: (_, v) => v, default: () => 'zh' }),
  // query_analyzer outputs
  intent:          Annotation({ reducer: (_, v) => v, default: () => 'general' }),
  queryIssues:     Annotation({ reducer: (_, v) => v, default: () => [] }),
  diagnosis:       Annotation({ reducer: (_, v) => v, default: () => '' }),
  // query_rewriter outputs
  rewrittenQuery:  Annotation({ reducer: (_, v) => v, default: () => '' }),
  searchQueries:   Annotation({ reducer: (_, v) => v, default: () => [] }),
  keywords:        Annotation({ reducer: (_, v) => v, default: () => [] }),
  // hybrid_retriever outputs
  rawNodes:        Annotation({ reducer: (_, v) => v, default: () => [] }),
  rawPosts:        Annotation({ reducer: (_, v) => v, default: () => [] }),
  // reranker outputs
  relatedNodes:    Annotation({ reducer: (_, v) => v, default: () => [] }),
  relatedPosts:    Annotation({ reducer: (_, v) => v, default: () => [] }),
  // doc_grader outputs
  context:         Annotation({ reducer: (_, v) => v, default: () => '' }),
  hasRelevantDocs: Annotation({ reducer: (_, v) => v, default: () => false }),
  // generator outputs
  answer:          Annotation({ reducer: (_, v) => v, default: () => '' }),
  recommendations: Annotation({ reducer: (_, v) => v, default: () => [] }),
});

// ── Routing function (doc_grader → generator / fallback_generator) ────────────
function routeAfterGrading(state) {
  return state.hasRelevantDocs ? 'knowledge_generator' : 'fallback_generator';
}

// ── Build graph using agent.asNode() ─────────────────────────────────────────
const workflow = new StateGraph(GraphState)
  .addNode(queryAnalyzerAgent.id,       queryAnalyzerAgent.asNode())
  .addNode(queryRewriterAgent.id,       queryRewriterAgent.asNode())
  .addNode(hybridRetrieverAgent.id,     hybridRetrieverAgent.asNode())
  .addNode(rerankerAgent.id,            rerankerAgent.asNode())
  .addNode(docGraderAgent.id,           docGraderAgent.asNode())
  .addNode(knowledgeGeneratorAgent.id,  knowledgeGeneratorAgent.asNode())
  .addNode(fallbackGeneratorAgent.id,   fallbackGeneratorAgent.asNode())

  .addEdge(START,                     queryAnalyzerAgent.id)
  .addEdge(queryAnalyzerAgent.id,     queryRewriterAgent.id)
  .addEdge(queryRewriterAgent.id,     hybridRetrieverAgent.id)
  .addEdge(hybridRetrieverAgent.id,   rerankerAgent.id)
  .addEdge(rerankerAgent.id,          docGraderAgent.id)
  .addConditionalEdges(docGraderAgent.id, routeAfterGrading, {
    knowledge_generator: knowledgeGeneratorAgent.id,
    fallback_generator:  fallbackGeneratorAgent.id,
  })
  .addEdge(knowledgeGeneratorAgent.id, END)
  .addEdge(fallbackGeneratorAgent.id,  END);

export const ragGraph = workflow.compile();
