/**
 * AgentRegistry — central catalogue of all Craflo agents.
 *
 * Usage:
 *   import { AgentRegistry } from './agents/registry.mjs';
 *
 *   AgentRegistry.all()              → BaseAgent[]
 *   AgentRegistry.get('query_analyzer') → BaseAgent | undefined
 *   AgentRegistry.byGroup('rag')     → BaseAgent[]
 *   AgentRegistry.toJSON()           → serialisable metadata array
 *
 * Exposed via GET /api/agents in index.mjs.
 */

// ── RAG pipeline agents ───────────────────────────────────────────────────────
import { queryAnalyzerAgent }      from './rag/queryAnalyzer.mjs';
import { queryRewriterAgent }      from './rag/queryRewriter.mjs';
import { hybridRetrieverAgent }    from './rag/hybridRetriever.mjs';
import { rerankerAgent }           from './rag/reranker.mjs';
import { docGraderAgent }          from './rag/docGrader.mjs';
import { knowledgeGeneratorAgent } from './rag/generator.mjs';
import { fallbackGeneratorAgent }  from './rag/fallbackGenerator.mjs';

// ── Project Workshop agents ───────────────────────────────────────────────────
import { nodeSuggesterAgent }        from './project/nodeSuggester.mjs';
import { backgroundResearcherAgent } from './project/backgroundResearcher.mjs';
import { fieldCompletionAgent }      from './project/fieldCompletion.mjs';
import { projectAnalyzerAgent }      from './project/projectAnalyzer.mjs';

// ── Portfolio A2A agents ──────────────────────────────────────────────────────
import { projectHandoffAgent }     from './portfolio/projectHandoff.mjs';
import { portfolioStructureAgent } from './portfolio/portfolioStructure.mjs';

// ── Learning Path agent ───────────────────────────────────────────────────────
import { pathAdjusterAgent } from './learning/pathAdjuster.mjs';

// ── Registry ──────────────────────────────────────────────────────────────────
const AGENTS = [
  // RAG (execution order mirrors the LangGraph pipeline)
  queryAnalyzerAgent,
  queryRewriterAgent,
  hybridRetrieverAgent,
  rerankerAgent,
  docGraderAgent,
  knowledgeGeneratorAgent,
  fallbackGeneratorAgent,

  // Project Workshop
  nodeSuggesterAgent,
  backgroundResearcherAgent,
  fieldCompletionAgent,
  projectAnalyzerAgent,

  // Portfolio A2A
  projectHandoffAgent,
  portfolioStructureAgent,

  // Learning Path
  pathAdjusterAgent,
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
