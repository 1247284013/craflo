/**
 * Shared LLM instances.
 * Import the right one in each agent instead of re-creating them.
 */
import { ChatDeepSeek } from '@langchain/deepseek';

const KEY = process.env.DEEPSEEK_API_KEY;

// deepseek-chat  = DeepSeek-V3（通用，速度快）
// deepseek-reasoner = DeepSeek-R1（推理增强，较慢）
const FAST_MODEL   = 'deepseek-chat';
const REASON_MODEL = 'deepseek-chat';

/** Low-latency: intent analysis, query rewriting, grading */
export const fastLLM = new ChatDeepSeek({
  model: FAST_MODEL, apiKey: KEY, temperature: 0.1, maxTokens: 400,
});

/** Learning path planner */
export const plannerLLM = new ChatDeepSeek({
  model: FAST_MODEL, apiKey: KEY, temperature: 0.3, maxTokens: 2000,
});

/** Learning path orchestrator — needs large output for full weekly task JSON */
export const orchestratorLLM = new ChatDeepSeek({
  model: FAST_MODEL, apiKey: KEY, temperature: 0.3, maxTokens: 8000,
});

/** Project agent (content production) */
export const projectAgentLLM = new ChatDeepSeek({
  model: FAST_MODEL, apiKey: KEY, temperature: 0.5, maxTokens: 3000,
});

/** Portfolio agent (visualization + layout) */
export const portfolioAgentLLM = new ChatDeepSeek({
  model: FAST_MODEL, apiKey: KEY, temperature: 0.4, maxTokens: 3000,
});

/** Job application agent (resume + interview + JD feedback) */
export const careerLLM = new ChatDeepSeek({
  model: FAST_MODEL, apiKey: KEY, temperature: 0.4, maxTokens: 3000,
});

/** Creative: answer generation */
export const genLLM = new ChatDeepSeek({
  model: FAST_MODEL, apiKey: KEY, temperature: 0.5, maxTokens: 2000,
});

/** Portfolio analysis (Agent 1) */
export const analysisLLM = new ChatDeepSeek({
  model: FAST_MODEL, apiKey: KEY, temperature: 0.2, maxTokens: 800,
});

/** Portfolio structure generation (Agent 2) */
export const structureLLM = new ChatDeepSeek({
  model: FAST_MODEL, apiKey: KEY, temperature: 0.4, maxTokens: 2000,
});

/** Project node suggestion / analysis */
export const projectLLM = new ChatDeepSeek({
  model: FAST_MODEL, apiKey: KEY, temperature: 0.3, maxTokens: 2000,
});

/** Project field completion */
export const completeLLM = new ChatDeepSeek({
  model: FAST_MODEL, apiKey: KEY, temperature: 0.65, maxTokens: 2000,
});

/** Background research */
export const researchLLM = new ChatDeepSeek({
  model: FAST_MODEL, apiKey: KEY, temperature: 0.5, maxTokens: 2500,
});

/** Learning path adjustment */
export const learningLLM = new ChatDeepSeek({
  model: REASON_MODEL, apiKey: KEY, temperature: 0.2, maxTokens: 4000,
});
