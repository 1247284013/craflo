/**
 * Shared LLM instances.
 * Import the right one in each agent instead of re-creating them.
 */
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

const KEY = process.env.GOOGLE_API_KEY;
const MODEL = 'gemini-2.5-flash';

/** Low-latency: intent analysis, query rewriting, grading */
export const fastLLM = new ChatGoogleGenerativeAI({
  model: MODEL, apiKey: KEY, temperature: 0.1, maxOutputTokens: 400,
});

/** Learning path planner */
export const plannerLLM = new ChatGoogleGenerativeAI({
  model: MODEL, apiKey: KEY, temperature: 0.3, maxOutputTokens: 2000,
});

/** Learning path orchestrator — needs large output for full weekly task JSON */
export const orchestratorLLM = new ChatGoogleGenerativeAI({
  model: MODEL, apiKey: KEY, temperature: 0.3, maxOutputTokens: 8000,
});

/** Project agent (content production) */
export const projectAgentLLM = new ChatGoogleGenerativeAI({
  model: MODEL, apiKey: KEY, temperature: 0.5, maxOutputTokens: 3000,
});

/** Portfolio agent (visualization + layout) */
export const portfolioAgentLLM = new ChatGoogleGenerativeAI({
  model: MODEL, apiKey: KEY, temperature: 0.4, maxOutputTokens: 3000,
});

/** Job application agent (resume + interview + JD feedback) */
export const careerLLM = new ChatGoogleGenerativeAI({
  model: MODEL, apiKey: KEY, temperature: 0.4, maxOutputTokens: 3000,
});

/** Creative: answer generation */
export const genLLM = new ChatGoogleGenerativeAI({
  model: MODEL, apiKey: KEY, temperature: 0.5, maxOutputTokens: 2000,
});

/** Portfolio analysis (Agent 1) */
export const analysisLLM = new ChatGoogleGenerativeAI({
  model: MODEL, apiKey: KEY, temperature: 0.2, maxOutputTokens: 800,
});

/** Portfolio structure generation (Agent 2) */
export const structureLLM = new ChatGoogleGenerativeAI({
  model: MODEL, apiKey: KEY, temperature: 0.4, maxOutputTokens: 2000,
});

/** Project node suggestion / analysis */
export const projectLLM = new ChatGoogleGenerativeAI({
  model: MODEL, apiKey: KEY, temperature: 0.3, maxOutputTokens: 1200,
});

/** Project field completion */
export const completeLLM = new ChatGoogleGenerativeAI({
  model: MODEL, apiKey: KEY, temperature: 0.65, maxOutputTokens: 1000,
});

/** Background research */
export const researchLLM = new ChatGoogleGenerativeAI({
  model: MODEL, apiKey: KEY, temperature: 0.5, maxOutputTokens: 700,
});

/** Learning path adjustment */
export const learningLLM = new ChatGoogleGenerativeAI({
  model: MODEL, apiKey: KEY, temperature: 0.2, maxOutputTokens: 4000,
});
