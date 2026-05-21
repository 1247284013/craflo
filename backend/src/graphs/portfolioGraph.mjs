/**
 * Portfolio Agent-to-Agent Graph (LangGraph)
 *
 * [START]
 *   → handoff_analysis    ← ProjectHandoffAgent (Agent 1)
 *   → generate_structure  ← PortfolioStructureAgent (Agent 2)
 * [END]
 *
 * Both agents are self-contained objects with full metadata,
 * compiled into a LangGraph via agent.asNode().
 */

import { StateGraph, END } from '@langchain/langgraph';
import { projectHandoffAgent }     from '../agents/portfolio/projectHandoff.mjs';
import { portfolioStructureAgent } from '../agents/portfolio/portfolioStructure.mjs';

// ── Shared graph state ────────────────────────────────────────────────────────
const graphState = {
  project:         { value: (a, b) => b ?? a, default: () => ({}) },
  targetRole:      { value: (a, b) => b ?? a, default: () => 'product-design-engineer' },
  handoffAnalysis: { value: (a, b) => b ?? a, default: () => null },
  portfolioResult: { value: (a, b) => b ?? a, default: () => null },
};

// ── Build graph using agent.asNode() ─────────────────────────────────────────
const workflow = new StateGraph({ channels: graphState })
  .addNode(projectHandoffAgent.id,     projectHandoffAgent.asNode())
  .addNode(portfolioStructureAgent.id, portfolioStructureAgent.asNode())
  .addEdge('__start__',              projectHandoffAgent.id)
  .addEdge(projectHandoffAgent.id,   portfolioStructureAgent.id)
  .addEdge(portfolioStructureAgent.id, END);

export const portfolioGraph = workflow.compile();
