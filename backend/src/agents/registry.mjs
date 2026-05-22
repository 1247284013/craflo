/**
 * AgentRegistry — central catalogue of all Craflo agents.
 *
 * Usage:
 *   import { AgentRegistry } from './agents/registry.mjs';
 *
 *   AgentRegistry.all()                    → BaseAgent[]
 *   AgentRegistry.get('knowledge_base')    → BaseAgent | undefined
 *   AgentRegistry.byGroup('knowledge')     → BaseAgent[]
 *   AgentRegistry.toJSON()                 → serialisable metadata array
 *
 * Exposed via GET /api/agents in index.mjs.
 *
 * Note: The KnowledgeBaseAgent wraps the internal 7-step RAG pipeline.
 * Internal RAG sub-agents (query_analyzer, reranker, etc.) are implementation
 * details and are NOT registered here — they are not part of the public
 * business-level agent contract.
 */

// ── Knowledge Base (wraps full RAG pipeline) ──────────────────────────────────
import { knowledgeBaseAgent } from './rag/knowledgeBase.mjs';

// ── Project Workshop agents ───────────────────────────────────────────────────
import { nodeSuggesterAgent }        from './project/nodeSuggester.mjs';
import { backgroundResearcherAgent } from './project/backgroundResearcher.mjs';
import { fieldCompletionAgent }      from './project/fieldCompletion.mjs';
import { projectAnalyzerAgent }      from './project/projectAnalyzer.mjs';

// ── Portfolio A2A agents ──────────────────────────────────────────────────────
import { projectHandoffAgent }     from './portfolio/projectHandoff.mjs';
import { portfolioStructureAgent } from './portfolio/portfolioStructure.mjs';

// ── Learning Path agents ──────────────────────────────────────────────────────
import { pathAdjusterAgent }              from './learning/pathAdjuster.mjs';
import { learningPathOrchestratorAgent }  from './learning/pathOrchestrator.mjs';

// ── Career agents ─────────────────────────────────────────────────────────────
import { targetMatcherAgent } from './career/targetMatcher.mjs';

// ── Registry ──────────────────────────────────────────────────────────────────
const AGENTS = [
  // Knowledge Base (1 agent, full RAG pipeline inside)
  knowledgeBaseAgent,

  // Project Workshop (4)
  nodeSuggesterAgent,
  backgroundResearcherAgent,
  fieldCompletionAgent,
  projectAnalyzerAgent,

  // Portfolio A2A (2)
  projectHandoffAgent,
  portfolioStructureAgent,

  // Learning Path (2: orchestrator + adjuster)
  learningPathOrchestratorAgent,
  pathAdjusterAgent,

  // Career (1)
  targetMatcherAgent,
];

export const AgentRegistry = {
  /** All registered agents */
  all: () => AGENTS,

  /** Find agent by ID */
  get: (id) => AGENTS.find((a) => a.id === id),

  /** Filter by group */
  byGroup: (group) => AGENTS.filter((a) => a.group === group),

  /** Serialisable metadata (safe to send to frontend) */
  toJSON: () => AGENTS.map((a) => a.toJSON()),
};
