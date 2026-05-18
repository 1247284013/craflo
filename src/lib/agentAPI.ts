/**
 * agentAPI.ts
 * Thin wrappers around the Craflo Agent backend (/api/*).
 * All calls are routed through Vite's proxy → http://localhost:3001.
 * Every request is traced in LangSmith when the backend has
 * LANGCHAIN_TRACING_V2=true configured.
 */

// ── Types (mirror backend responses) ────────────────────────────────────────

export interface RAGAnswer {
  text: string;
  relatedNodes: RelatedNode[];
  relatedPosts: RelatedPost[];
  recommendations: string[];
}

export interface RelatedNode {
  id: string;
  title: string;
  content: string;
  type: string;
  tags: string[];
  level?: string;
}

export interface RelatedPost {
  id: string;
  title: string;
  summary: string;
  board: string;
  likes: number;
  views: number;
  comments: number;
}

// ── Base URL: empty string in dev (Vite proxy), full URL in production ────────
// Set VITE_API_BASE_URL in Vercel environment variables to your Render backend URL
// e.g. https://craflo-backend.onrender.com
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

// ── Generic fetch helper ──────────────────────────────────────────────────────

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error: string }).error ?? 'Agent backend error');
  }
  return res.json() as Promise<T>;
}

// ── 1. Knowledge base RAG chat ────────────────────────────────────────────────
export async function ragQuery(query: string, lang: 'zh' | 'en' = 'zh'): Promise<RAGAnswer> {
  return post<RAGAnswer>('/api/rag', { query, lang });
}

// ── 2. Project Workshop: suggest next canvas nodes ───────────────────────────
export async function suggestProjectNodes(name: string, overview: string): Promise<string[]> {
  const { keys } = await post<{ keys: string[] }>('/api/project/suggest-nodes', { name, overview });
  return keys;
}

// ── 3. Project Workshop: AI complete a field ─────────────────────────────────
export async function completeProjectField(context: string, fieldLabel: string): Promise<string> {
  const { text } = await post<{ text: string }>('/api/project/complete-field', { context, fieldLabel });
  return text;
}

// ── 4. Project Workshop: AI analyze project ──────────────────────────────────
export interface ProjectAnalysis {
  feedback: string;
  missing: string[];
  completionRate: number;
}

export async function analyzeProject(context: string): Promise<ProjectAnalysis> {
  return post<ProjectAnalysis>('/api/project/analyze', { context });
}

// ── 6. Portfolio Studio: Agent-to-Agent generation ───────────────────────────
export interface PortfolioPage {
  pageNumber: number;
  title: string;
  contentSuggestion: string;
  requiredMaterials: string[];
  isComplete: boolean;
}

export interface HandoffAnalysis {
  completionScore: number;
  transferReady: boolean;
  coreStrengths: string[];
  narrativeArc: { problem: string; process: string; solution: string; outcome: string };
  missingGaps: string[];
  portfolioAngle: string;
}

export interface AIPortfolioResult {
  portfolio: {
    projectId: string;
    targetRole: string;
    highlights: string[];
    overallSuggestion: string;
    missingMaterials: string[];
    structure: PortfolioPage[];
    handoffAnalysis: HandoffAnalysis;
  };
  handoffAnalysis: HandoffAnalysis;
}

export async function generatePortfolioFromAI(
  project: Record<string, unknown>,
  targetRole: string,
): Promise<AIPortfolioResult> {
  return post<AIPortfolioResult>('/api/portfolio/generate', { project, targetRole });
}

// ── 5. Learning Path: AI adjust tasks ────────────────────────────────────────
export async function adjustLearningPath<T>(tasks: T[], userInput: string): Promise<T[]> {
  const { tasks: adjusted } = await post<{ tasks: T[] }>('/api/learning/adjust', { tasks, userInput });
  return adjusted;
}

// ── Health check (optional, for debugging) ───────────────────────────────────
export async function checkBackendHealth(): Promise<{ status: string; langsmith: string }> {
  const res = await fetch(`${API_BASE}/api/health`);
  return res.json();
}
