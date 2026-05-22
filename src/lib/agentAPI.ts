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

// ── 3a. Project Workshop: research background from project name ───────────────
export async function researchProjectBackground(projectName: string): Promise<string> {
  const { text } = await post<{ text: string }>('/api/project/research-background', { projectName });
  return text;
}

// ── 3b. Project Workshop: AI complete a field ────────────────────────────────
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

// ── 5b. Learning Path: re-plan based on JD ───────────────────────────────────

export interface JDPlanResult<T> {
  tasks: T[];
  gaps: string[];
  jdAlignment: {
    score: number;
    summary: string;
    highlights: string[];
  };
}

export async function planWithJD<T>(
  parsedJD: ParsedJDResponse,
  tasks: T[],
  roleType?: string,
): Promise<JDPlanResult<T>> {
  return post<JDPlanResult<T>>('/api/learning/plan-with-jd', { parsedJD, tasks, roleType });
}

// ── 7. Career / JD — parse a JD string into structured data ─────────────────

export interface ParsedJDResponse {
  title: string;
  company?: string;
  roleType?: string;
  summary?: string;
  requiredSkills: string[];
  preferredSkills: string[];
  keyResponsibilities: string[];
  keywords: string[];
}

export async function parseJD(jdText: string): Promise<ParsedJDResponse> {
  const { parsed } = await post<{ parsed: ParsedJDResponse }>('/api/career/parse-jd', { jdText });
  return parsed;
}

// ── 8. Career / JD — analyze skill gap ───────────────────────────────────────

export interface GapAnalysis {
  gapAnalysis: string[];
  emphasize: string[];
  interviewFocus: string[];
  fitScore: number;
}

export async function analyzeJDGap(
  parsedJD: ParsedJDResponse,
  userSkills: string[],
  projectSummaries: string[],
): Promise<GapAnalysis> {
  return post<GapAnalysis>('/api/career/analyze-gap', { parsedJD, userSkills, projectSummaries });
}

// ── Health check (optional, for debugging) ───────────────────────────────────
export async function checkBackendHealth(): Promise<{ status: string; langsmith: string }> {
  const res = await fetch(`${API_BASE}/api/health`);
  return res.json();
}

// ── 8. Learning Path Orchestrator ─────────────────────────────────────────────

export interface TargetItem {
  name: string;
  tier: 'reach' | 'target' | 'safety';
  matchScore?: number;   // job mode
  offerChance?: number;  // school mode
  industry?: string;
  country?: string;
  program?: string;
  size?: string;
  roles?: string[];
  highlights: string;
  resumeTip?: string;
  portfolioTip?: string;
  city?: string;
  deadline?: string;
  tuition?: string;
}

export interface TargetTiers {
  reach:  TargetItem[];
  target: TargetItem[];
  safety: TargetItem[];
}

export interface OrchestrateResult<T> {
  weeklyTasks:   T[];
  targets:       TargetItem[];
  tiers:         TargetTiers;
  resumeTips:    string;
  portfolioTips: string;
  agentCallLog:  { agent: string; status: string; output?: string; error?: string }[];
  orchestration: { suggestProjects: string[]; portfolioFocus: string };
}

export interface OrchestrateInput {
  mode:          'job' | 'school';
  profile:       string;
  currentSkills: string[];
  direction:     string;
  jdContext?:    string;
  preferences?:  string;
}

export async function orchestrateLearningPath<T>(
  input: OrchestrateInput,
): Promise<OrchestrateResult<T>> {
  return post<OrchestrateResult<T>>('/api/learning/orchestrate', input);
}

// ── 9. Target Matcher (standalone) ───────────────────────────────────────────

export interface MatchTargetsInput {
  mode:         'job' | 'school';
  profile:      string;
  skills:       string[];
  direction:    string;
  preferences?: string;
}

export interface MatchTargetsResult {
  targets:       TargetItem[];
  tiers:         TargetTiers;
  resumeTips:    string;
  portfolioTips: string;
}

export async function matchTargets(input: MatchTargetsInput): Promise<MatchTargetsResult> {
  return post<MatchTargetsResult>('/api/career/match-targets', input);
}

// ── Agent Registry ────────────────────────────────────────────────────────────

export interface AgentMeta {
  id: string;
  name: string;
  group: 'knowledge' | 'rag' | 'project' | 'portfolio' | 'learning' | 'career';
  description: string;
  inputSchema: Record<string, string>;
  outputSchema: Record<string, string>;
  connects_to: string[];
  tools?: string[];
}

export interface AgentRegistryResponse {
  total: number;
  groups: { rag: number; knowledge: number; project: number; portfolio: number; learning: number; career: number };
  agents: AgentMeta[];
}

export async function fetchAgents(): Promise<AgentRegistryResponse> {
  const res = await fetch(`${API_BASE}/api/agents`);
  if (!res.ok) throw new Error(`Failed to fetch agents: ${res.status}`);
  return res.json();
}
