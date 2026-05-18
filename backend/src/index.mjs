import 'dotenv/config';
// Node.js 18 polyfill: LangGraph requires globalThis.crypto (Web Crypto API)
import { webcrypto } from 'crypto';
if (!globalThis.crypto) globalThis.crypto = webcrypto;

import express from 'express';
import cors from 'cors';
import { ragGraph } from './graphs/ragGraph.mjs';
import { portfolioGraph } from './graphs/portfolioGraph.mjs';
import {
  suggestNodesChain,
  completeFieldChain,
  analyzeProjectChain,
} from './chains/projectChain.mjs';
import { adjustLearningPathChain } from './chains/learningChain.mjs';

const app = express();

const ALLOWED_ORIGINS = [
  'http://localhost:5174',
  'http://localhost:5173',
  'http://localhost:3000',
  // Add your Vercel domain here after deployment, e.g.:
  // 'https://craflo.vercel.app',
  /^https:\/\/.*\.vercel\.app$/,   // allow all Vercel preview URLs
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // server-to-server / curl
    const ok = ALLOWED_ORIGINS.some((o) =>
      typeof o === 'string' ? o === origin : o.test(origin),
    );
    cb(ok ? null : new Error('CORS blocked'), ok);
  },
}));
app.use(express.json({ limit: '2mb' }));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    langsmith: process.env.LANGCHAIN_TRACING_V2 === 'true' ? 'enabled' : 'disabled',
    project: process.env.LANGCHAIN_PROJECT ?? 'craflo-dev',
  });
});

// ── RAG: Knowledge Base Chat ──────────────────────────────────────────────────
// POST /api/rag  { query: string, lang?: 'zh' | 'en' }
app.post('/api/rag', async (req, res) => {
  const { query, lang = 'zh' } = req.body;
  if (!query?.trim()) return res.status(400).json({ error: 'query is required' });

  try {
    const result = await ragGraph.invoke(
      { query, lang },
      { runName: `RAG · ${query.slice(0, 40)}` },
    );

    res.json({
      text:         result.answer ?? '',
      relatedNodes: result.relatedNodes ?? [],
      relatedPosts: result.relatedPosts ?? [],
      recommendations: result.recommendations ?? [],
    });
  } catch (err) {
    console.error('[/api/rag]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Project: suggest next canvas nodes ───────────────────────────────────────
// POST /api/project/suggest-nodes  { name: string, overview: string }
app.post('/api/project/suggest-nodes', async (req, res) => {
  const { name = '', overview = '' } = req.body;
  try {
    const raw = await suggestNodesChain.invoke(
      { name, overview },
      { runName: `SuggestNodes · ${name.slice(0, 30)}` },
    );
    const match = raw.match(/\[[\s\S]*?\]/);
    const keys = match ? JSON.parse(match[0]) : ['designGoal', 'challenge', 'contribution'];
    res.json({ keys });
  } catch (err) {
    console.error('[/api/project/suggest-nodes]', err.message);
    res.json({ keys: ['designGoal', 'challenge', 'contribution'] });
  }
});

// ── Project: AI fill a single field ──────────────────────────────────────────
// POST /api/project/complete-field  { context: string, fieldLabel: string }
app.post('/api/project/complete-field', async (req, res) => {
  const { context = '', fieldLabel = '' } = req.body;
  try {
    const text = await completeFieldChain.invoke(
      { context, fieldLabel },
      { runName: `CompleteField · ${fieldLabel}` },
    );
    res.json({ text });
  } catch (err) {
    console.error('[/api/project/complete-field]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Project: AI analyze entire project ───────────────────────────────────────
// POST /api/project/analyze  { context: string }
app.post('/api/project/analyze', async (req, res) => {
  const { context = '' } = req.body;
  try {
    const raw = await analyzeProjectChain.invoke(
      { context },
      { runName: 'AnalyzeProject' },
    );

    const feedbackMatch = raw.match(/FEEDBACK:\s*(.+?)(?=\nMISSING:|$)/s);
    const missingMatch = raw.match(/MISSING:\s*(.+?)(?=\nRATE:|$)/s);
    const rateMatch = raw.match(/RATE:\s*(\d+)/);

    res.json({
      feedback: feedbackMatch?.[1]?.trim() ?? '',
      missing: (missingMatch?.[1] ?? '').split('|').map((s) => s.trim()).filter(Boolean),
      completionRate: Math.min(100, Math.max(0, parseInt(rateMatch?.[1] ?? '50', 10))),
    });
  } catch (err) {
    console.error('[/api/project/analyze]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Portfolio: Agent-to-Agent generation ─────────────────────────────────────
// POST /api/portfolio/generate  { project: Project, targetRole: string }
// Agent 1 (ProjectHandoffAgent) → Agent 2 (PortfolioStructureAgent)
app.post('/api/portfolio/generate', async (req, res) => {
  const { project, targetRole = 'product-design-engineer' } = req.body;
  if (!project?.id) return res.status(400).json({ error: 'project is required' });

  try {
    const result = await portfolioGraph.invoke(
      { project, targetRole },
      { runName: `Portfolio A2A · ${project.name?.slice(0, 30)}` },
    );

    // portfolioResult is built by Agent 2 and includes Agent 1 analysis
    const portfolio = result.portfolioResult;
    if (!portfolio) throw new Error('Portfolio generation returned empty result');

    res.json({
      portfolio,
      handoffAnalysis: result.handoffAnalysis, // expose Agent 1 output to frontend
    });
  } catch (err) {
    console.error('[/api/portfolio/generate]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Learning Path: adjust tasks based on user knowledge ──────────────────────
// POST /api/learning/adjust  { tasks: WeeklyTask[], userInput: string }
app.post('/api/learning/adjust', async (req, res) => {
  const { tasks = [], userInput = '' } = req.body;
  try {
    const raw = await adjustLearningPathChain.invoke(
      { tasksJson: JSON.stringify(tasks, null, 2), userInput },
      { runName: `AdjustLearningPath · "${userInput.slice(0, 40)}"` },
    );
    const match = raw.match(/\[[\s\S]*\]/);
    const adjusted = match ? JSON.parse(match[0]) : tasks;
    res.json({ tasks: adjusted });
  } catch (err) {
    console.error('[/api/learning/adjust]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? '3001', 10);
app.listen(PORT, () => {
  const tracing = process.env.LANGCHAIN_TRACING_V2 === 'true';
  console.log(`\n🚀  Craflo Agent Backend  →  http://localhost:${PORT}`);
  console.log(
    tracing
      ? `📊  LangSmith tracing ON  →  project: "${process.env.LANGCHAIN_PROJECT}"`
      : `⚠️   LangSmith tracing OFF (set LANGCHAIN_API_KEY to enable)`,
  );
});
