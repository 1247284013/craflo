import 'dotenv/config';
// Node.js 18: LangGraph requires globalThis.crypto (Web Crypto API)
import { webcrypto } from 'crypto';
if (!globalThis.crypto) globalThis.crypto = webcrypto;

import express from 'express';
import cors from 'cors';

// ── LangGraph compiled graphs ─────────────────────────────────────────────────
import { ragGraph }       from './graphs/ragGraph.mjs';
import { portfolioGraph } from './graphs/portfolioGraph.mjs';

// ── Agent Registry (all 14 agents) ───────────────────────────────────────────
import { AgentRegistry } from './agents/registry.mjs';

// ── Individual agents (called directly for non-graph routes) ─────────────────
import { nodeSuggesterAgent }        from './agents/project/nodeSuggester.mjs';
import { backgroundResearcherAgent } from './agents/project/backgroundResearcher.mjs';
import { fieldCompletionAgent }      from './agents/project/fieldCompletion.mjs';
import { projectAnalyzerAgent }      from './agents/project/projectAnalyzer.mjs';
import { pathAdjusterAgent }         from './agents/learning/pathAdjuster.mjs';
import { genLLM, careerLLM }          from './agents/llms.mjs';
import { getLLMText as parseLLMContent } from './agents/rag/helpers.mjs';

// ── Express app ───────────────────────────────────────────────────────────────
const app = express();

const ALLOWED_ORIGINS = [
  'http://localhost:5174',
  'http://localhost:5173',
  'http://localhost:3000',
  /^https:\/\/.*\.vercel\.app$/,
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const ok = ALLOWED_ORIGINS.some((o) =>
      typeof o === 'string' ? o === origin : o.test(origin),
    );
    cb(ok ? null : new Error('CORS blocked'), ok);
  },
}));
app.use(express.json({ limit: '2mb' }));

// ═══════════════════════════════════════════════════════════════════════════════
// META
// ═══════════════════════════════════════════════════════════════════════════════

/** Health check */
app.get('/api/health', (_req, res) => {
  res.json({
    status:    'ok',
    agents:    AgentRegistry.all().length,
    langsmith: process.env.LANGCHAIN_TRACING_V2 === 'true' ? 'enabled' : 'disabled',
    project:   process.env.LANGCHAIN_PROJECT ?? 'craflo-dev',
  });
});

/**
 * GET /api/agents
 * Returns the full registry: id, name, group, description,
 * inputSchema, outputSchema, connects_to for every agent.
 */
app.get('/api/agents', (_req, res) => {
  res.json({
    total:  AgentRegistry.all().length,
    groups: {
      rag:       AgentRegistry.byGroup('rag').length,
      project:   AgentRegistry.byGroup('project').length,
      portfolio: AgentRegistry.byGroup('portfolio').length,
      learning:  AgentRegistry.byGroup('learning').length,
    },
    agents: AgentRegistry.toJSON(),
  });
});

/**
 * GET /api/agents/:id
 * Returns metadata for a single agent.
 */
app.get('/api/agents/:id', (req, res) => {
  const agent = AgentRegistry.get(req.params.id);
  if (!agent) return res.status(404).json({ error: `Agent "${req.params.id}" not found` });
  res.json(agent.toJSON());
});

// ═══════════════════════════════════════════════════════════════════════════════
// RAG — Knowledge Base Chat
// POST /api/rag  { query: string, lang?: 'zh' | 'en' }
// Orchestrated by: ragGraph (7-node LangGraph pipeline)
// ═══════════════════════════════════════════════════════════════════════════════
app.post('/api/rag', async (req, res) => {
  const { query, lang = 'zh' } = req.body;
  if (!query?.trim()) return res.status(400).json({ error: 'query is required' });

  try {
    const result = await ragGraph.invoke(
      { query, lang },
      { runName: `RAG · ${query.slice(0, 40)}` },
    );
    res.json({
      text:            result.answer          ?? '',
      relatedNodes:    result.relatedNodes    ?? [],
      relatedPosts:    result.relatedPosts    ?? [],
      recommendations: result.recommendations ?? [],
    });
  } catch (err) {
    console.error('[/api/rag]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROJECT WORKSHOP
// ═══════════════════════════════════════════════════════════════════════════════

/** NodeSuggesterAgent — POST /api/project/suggest-nodes */
app.post('/api/project/suggest-nodes', async (req, res) => {
  const { name = '', overview = '' } = req.body;
  try {
    const result = await nodeSuggesterAgent.execute({ name, overview });
    res.json(result);
  } catch (err) {
    console.error('[/api/project/suggest-nodes]', err.message);
    res.json({ keys: ['designGoal', 'challenge', 'contribution'] });
  }
});

/** BackgroundResearcherAgent — POST /api/project/research-background */
app.post('/api/project/research-background', async (req, res) => {
  const { projectName = '' } = req.body;
  if (!projectName.trim()) return res.status(400).json({ error: 'projectName is required' });
  try {
    const result = await backgroundResearcherAgent.execute({ projectName });
    res.json(result);
  } catch (err) {
    console.error('[/api/project/research-background]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/** FieldCompletionAgent — POST /api/project/complete-field */
app.post('/api/project/complete-field', async (req, res) => {
  const { context = '', fieldLabel = '' } = req.body;
  try {
    const result = await fieldCompletionAgent.execute({ context, fieldLabel });
    res.json(result);
  } catch (err) {
    console.error('[/api/project/complete-field]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/** ProjectAnalyzerAgent — POST /api/project/analyze */
app.post('/api/project/analyze', async (req, res) => {
  const { context = '' } = req.body;
  try {
    const result = await projectAnalyzerAgent.execute({ context });
    res.json(result);
  } catch (err) {
    console.error('[/api/project/analyze]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PORTFOLIO A2A
// POST /api/portfolio/generate  { project: Project, targetRole: string }
// Orchestrated by: portfolioGraph
//   Agent 1 (ProjectHandoffAgent) → Agent 2 (PortfolioStructureAgent)
// ═══════════════════════════════════════════════════════════════════════════════
app.post('/api/portfolio/generate', async (req, res) => {
  const { project, targetRole = 'product-design-engineer' } = req.body;
  if (!project?.id) return res.status(400).json({ error: 'project is required' });

  try {
    const result = await portfolioGraph.invoke(
      { project, targetRole },
      { runName: `Portfolio A2A · ${project.name?.slice(0, 30)}` },
    );
    const portfolio = result.portfolioResult;
    if (!portfolio) throw new Error('Portfolio generation returned empty result');
    res.json({ portfolio, handoffAnalysis: result.handoffAnalysis });
  } catch (err) {
    console.error('[/api/portfolio/generate]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// LEARNING PATH
// POST /api/learning/adjust  { tasks: WeeklyTask[], userInput: string }
// ═══════════════════════════════════════════════════════════════════════════════
app.post('/api/learning/adjust', async (req, res) => {
  const { tasks = [], userInput = '' } = req.body;
  try {
    // Strip any JD-related markers so the LLM receives clean task data
    const cleanTasks = tasks.map(t => {
      const { _jdModified, _jdRelevance, _lowPriority, ...rest } = t;
      void _jdModified; void _jdRelevance; void _lowPriority;
      return {
        ...rest,
        title: (rest.title || '').replace(/^[⭐○]\s+/, ''),
        objective: (rest.objective || '').replace(/（与岗位要求高度相关）$/, ''),
      };
    });
    const result = await pathAdjusterAgent.execute({ tasks: cleanTasks, userInput });
    res.json(result);
  } catch (err) {
    console.error('[/api/learning/adjust]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// LEARNING PATH + JD
// POST /api/learning/plan-with-jd
// Body: { parsedJD, tasks, roleType? }
// Re-plans the learning path based on JD requirements.
// Returns: { tasks, gaps, jdAlignment, highlights }
// ═══════════════════════════════════════════════════════════════════════════════
app.post('/api/learning/plan-with-jd', async (req, res) => {
  const { parsedJD, tasks = [], roleType = '' } = req.body;
  if (!parsedJD) return res.status(400).json({ error: 'parsedJD is required' });
  if (!tasks.length) return res.status(400).json({ error: 'tasks is required' });

  // ── Pass only a compact summary to the LLM (week + title), not the full tasks JSON.
  // This keeps token usage low and avoids truncation. Changes are applied locally.
  const taskSummary = tasks.map(t => `W${t.week}: ${t.title}`).join('\n');

  const prompt = `你是 Craflo 学习路径规划 Agent。根据目标岗位 JD，分析以下学习路径任务列表的契合度，输出优先级分类和 gap 分析。

目标岗位：${parsedJD.title}${parsedJD.company ? `（${parsedJD.company}）` : ''}
岗位类型：${parsedJD.roleType ?? roleType ?? '未指定'}
必备技能：${(parsedJD.requiredSkills ?? []).join('、')}
加分技能：${(parsedJD.preferredSkills ?? []).join('、')}
核心职责：${(parsedJD.keyResponsibilities ?? []).join('；')}
关键词：${(parsedJD.keywords ?? []).join('、')}

当前学习路径（周数 + 任务标题）：
${taskSummary}

请完成：
1. 判断每周任务与 JD 的相关性
2. 识别 JD 要求但路径中缺失的技能
3. 给出整体契合度评分

以 JSON 格式输出（只返回JSON，不加任何其他文字）：
{
  "highPriority": [1, 3, 7],
  "lowPriority": [4, 5],
  "gaps": ["JD 要求但路径中缺失的技能1", "缺失的技能2"],
  "jdAlignment": {
    "score": 75,
    "summary": "当前路径与目标 JD 的匹配情况概述（2-3句）",
    "highlights": ["路径中与 JD 最契合的内容1", "最契合的内容2"]
  }
}

说明：
- highPriority 填写与 JD 高度相关的周数数组（整数）
- lowPriority 填写与 JD 无关或冲突的周数数组（如JD是数字产品但任务包含CMF/制造工艺）
- 未提到的周视为 medium 优先级`;

  try {
    const response = await genLLM.invoke(prompt);
    const raw = parseLLMContent(response);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in LLM response');
    const diff = JSON.parse(jsonMatch[0]);

    const highSet = new Set((diff.highPriority ?? []).map(Number));
    const lowSet  = new Set((diff.lowPriority  ?? []).map(Number));

    // Apply diff locally — no need to re-send the full tasks through LLM
    const updatedTasks = tasks.map(t => {
      if (highSet.has(t.week)) {
        return {
          ...t,
          title:     t.title.startsWith('⭐') ? t.title : `⭐ ${t.title}`,
          objective: t.objective ? `${t.objective}（与岗位要求高度相关）` : t.objective,
          _jdModified: true,
          _jdRelevance: 'high',
        };
      }
      if (lowSet.has(t.week)) {
        return {
          ...t,
          title:       t.title.startsWith('○') ? t.title : `○ ${t.title}`,
          _jdModified: true,
          _jdRelevance: 'low',
          _lowPriority: true,
        };
      }
      return { ...t, _jdRelevance: 'medium' };
    });

    res.json({
      tasks: updatedTasks,
      gaps: diff.gaps ?? [],
      jdAlignment: diff.jdAlignment ?? { score: 0, summary: '', highlights: [] },
    });
  } catch (err) {
    console.error('[/api/learning/plan-with-jd]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CAREER / JD  —  POST /api/career/parse-jd  { jdText: string }
// Parses a raw JD string into structured skill requirements.
// Returns: { title, company, requiredSkills, preferredSkills, keyResponsibilities, keywords, roleType, summary }
// ═══════════════════════════════════════════════════════════════════════════════
app.post('/api/career/parse-jd', async (req, res) => {
  const { jdText = '' } = req.body;
  if (!jdText.trim()) return res.status(400).json({ error: 'jdText is required' });

  const prompt = `你是一个招聘信息分析助手。请分析以下 JD，提取关键信息并以 JSON 格式输出。

JD 原文：
${jdText}

请以 JSON 格式输出（只返回JSON，不加任何其他文字）：
{
  "title": "岗位名称",
  "company": "公司名称（如有）",
  "roleType": "岗位类别（如：ux-ui-designer / ai-pm / industrial-designer / mechanical-engineer / service-designer / researcher / creative-director / other）",
  "summary": "一句话概括这个岗位的核心要求（30字以内）",
  "requiredSkills": ["必须具备的技能1", "必须具备的技能2"],
  "preferredSkills": ["加分技能1", "加分技能2"],
  "keyResponsibilities": ["核心职责1", "核心职责2", "核心职责3"],
  "keywords": ["简历关键词1", "简历关键词2", "简历关键词3"]
}`;

  try {
    const response = await genLLM.invoke(prompt);
    const raw = parseLLMContent(response);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in LLM response');
    const parsed = JSON.parse(jsonMatch[0]);
    res.json({ parsed });
  } catch (err) {
    console.error('[/api/career/parse-jd]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CAREER / JD  —  POST /api/career/analyze-gap
// Analyzes skill gap between user's projects/skills and target JD.
// Body: { parsedJD, userSkills, projectSummaries }
// Returns: { gapAnalysis, emphasize, interviewFocus }
// ═══════════════════════════════════════════════════════════════════════════════
app.post('/api/career/analyze-gap', async (req, res) => {
  const { parsedJD, userSkills = [], projectSummaries = [] } = req.body;
  if (!parsedJD) return res.status(400).json({ error: 'parsedJD is required' });

  const allRequired = [...(parsedJD.requiredSkills ?? []), ...(parsedJD.preferredSkills ?? [])];
  const prompt = `你是求职顾问。分析用户与目标岗位的技能 gap，只返回 JSON。

岗位：${parsedJD.title}，要求技能：${allRequired.slice(0, 10).join('、')}，关键词：${(parsedJD.keywords ?? []).slice(0, 8).join('、')}
用户技能：${userSkills.slice(0, 10).join('、') || '未填写'}
项目经验：${projectSummaries.slice(0, 3).map((s, i) => `${i + 1}.${s.slice(0, 60)}`).join(' | ') || '暂无'}

输出 JSON（只返回JSON）：
{"gapAnalysis":["缺失技能1","缺失技能2"],"emphasize":["简历侧重1","简历侧重2"],"interviewFocus":["面试重点1","面试重点2"],"fitScore":75}`;

  try {
    const response = await careerLLM.invoke(prompt);
    const raw = parseLLMContent(response);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in LLM response');
    const analysis = JSON.parse(jsonMatch[0]);
    res.json(analysis);
  } catch (err) {
    console.error('[/api/career/analyze-gap]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? '3001', 10);
app.listen(PORT, () => {
  const tracing = process.env.LANGCHAIN_TRACING_V2 === 'true';
  console.log(`\n🚀  Craflo Agent Backend  →  http://localhost:${PORT}`);
  console.log(`🤖  Agents registered: ${AgentRegistry.all().length} (RAG:${AgentRegistry.byGroup('rag').length} Project:${AgentRegistry.byGroup('project').length} Portfolio:${AgentRegistry.byGroup('portfolio').length} Learning:${AgentRegistry.byGroup('learning').length})`);
  console.log(
    tracing
      ? `📊  LangSmith tracing ON  →  project: "${process.env.LANGCHAIN_PROJECT}"`
      : `⚠️   LangSmith tracing OFF (set LANGCHAIN_API_KEY to enable)`,
  );
});
