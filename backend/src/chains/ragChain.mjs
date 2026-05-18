/**
 * RAG Chain (LCEL) — Retrieval-Augmented Generation
 *
 * Architecture (each step is a separate LangSmith span):
 *   1. Retrieval  — parallel tool calls: search_knowledge_nodes + search_community_posts
 *   2. Format     — build the context string
 *   3. Generate   — Gemini produces the final answer
 *
 * LangSmith shows: tool inputs, raw results, prompt, output, token counts.
 */
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableLambda, RunnableSequence, RunnablePassthrough } from '@langchain/core/runnables';
import { searchKnowledgeTool, searchCommunityTool } from '../tools/supabaseSearch.mjs';

const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-2.5-flash',
  apiKey: process.env.GOOGLE_API_KEY,
  temperature: 0.5,
  maxOutputTokens: 2000,
});

// ── Step 1: parallel retrieval (both tools always run, both traced) ───────────
const retrieveStep = RunnableLambda.from(async ({ query }) => {
  const [knowledgeRaw, communityRaw] = await Promise.all([
    searchKnowledgeTool.invoke(query),
    searchCommunityTool.invoke(query),
  ]);

  let relatedNodes = [];
  let relatedPosts = [];

  try { relatedNodes = JSON.parse(knowledgeRaw); } catch { /* no results */ }
  try { relatedPosts = JSON.parse(communityRaw); } catch { /* no results */ }

  return { query, relatedNodes, relatedPosts };
}).withConfig({ runName: 'Retrieval' });

// ── Step 2: build context for the LLM ────────────────────────────────────────
const formatStep = RunnableLambda.from(({ query, relatedNodes, relatedPosts }) => {
  const knowledgeCtx = relatedNodes
    .filter((n) => n.content)
    .map((n) => `【知识库】${n.title}\n${n.content.slice(0, 600)}\n标签: ${(n.tags ?? []).join('、')}`)
    .join('\n\n---\n\n');

  const postCtx = relatedPosts
    .slice(0, 2)
    .map((p) => `【社区讨论】${p.title}\n${(p.summary ?? '').slice(0, 300)}`)
    .join('\n\n---\n\n');

  const context = [knowledgeCtx, postCtx].filter(Boolean).join('\n\n═══\n\n') || '（暂无直接相关知识）';

  return { query, context, relatedNodes, relatedPosts };
}).withConfig({ runName: 'FormatContext' });

// ── Step 3: LLM generation ────────────────────────────────────────────────────
const prompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `你是 Craflo 的 AI 助手，专注于设计工程、工业设计、用户研究和作品集制作。
根据以下检索到的知识，用清晰、专业的中文回答用户问题。

检索结果：
{context}

要求：
- 综合知识库内容给出实用的回答，可用 Markdown 格式
- 回答末尾附上 3 个推荐的后续问题：<recommendations>["问题1","问题2","问题3"]</recommendations>`,
  ],
  ['human', '{query}'],
]);

// ── Full RAG chain ────────────────────────────────────────────────────────────
const generateStep = RunnableSequence.from([
  prompt,
  llm,
  new StringOutputParser(),
]).withConfig({ runName: 'Generate' });

// Export as a runnable that accepts { query } and returns { text, relatedNodes, relatedPosts }
export const ragChain = RunnableSequence.from([
  retrieveStep,
  formatStep,
  RunnableLambda.from(async (state) => {
    const text = await generateStep.invoke({
      query: state.query,
      context: state.context,
    });
    return { text, relatedNodes: state.relatedNodes, relatedPosts: state.relatedPosts };
  }).withConfig({ runName: 'RAG' }),
]);
