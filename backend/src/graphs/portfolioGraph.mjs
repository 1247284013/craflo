/**
 * Portfolio Agent-to-Agent Graph (LangGraph)
 *
 * Flow:
 *   [START]
 *      │
 *      ▼
 *   handoff_analysis          ← Agent 1: ProjectHandoffAgent
 *      │  Reads project fields, scores readiness,
 *      │  builds narrative arc + key insights
 *      ▼
 *   generate_structure         ← Agent 2: PortfolioStructureAgent
 *      │  Takes Agent 1's analysis + project data + target role,
 *      │  produces detailed portfolio page structure
 *      ▼
 *   [END]
 *
 * Both agents are automatically traced to LangSmith.
 */

import { StateGraph, END } from '@langchain/langgraph';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

// ── LLMs ─────────────────────────────────────────────────────────────────────
const analysisLLM = new ChatGoogleGenerativeAI({
  model: 'gemini-2.5-flash',
  apiKey: process.env.GOOGLE_API_KEY,
  temperature: 0.2,
  maxOutputTokens: 800,
});

const structureLLM = new ChatGoogleGenerativeAI({
  model: 'gemini-2.5-flash',
  apiKey: process.env.GOOGLE_API_KEY,
  temperature: 0.4,
  maxOutputTokens: 2000,
});

// ── State schema ──────────────────────────────────────────────────────────────
const graphState = {
  // Inputs
  project: { value: (a, b) => b ?? a, default: () => ({}) },
  targetRole: { value: (a, b) => b ?? a, default: () => 'product-design-engineer' },

  // Agent 1 output
  handoffAnalysis: { value: (a, b) => b ?? a, default: () => null },

  // Agent 2 output
  portfolioResult: { value: (a, b) => b ?? a, default: () => null },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function getLLMText(result) {
  if (typeof result === 'string') return result;
  if (result?.content) return String(result.content);
  if (result?.text) return String(result.text);
  return String(result);
}

function extractJSON(text, fallback) {
  try {
    const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (m) return JSON.parse(m[1].trim());
    const start = text.indexOf('{') !== -1 ? text.indexOf('{') : text.indexOf('[');
    const end   = text.lastIndexOf('}') !== -1 ? text.lastIndexOf('}') : text.lastIndexOf(']');
    if (start !== -1 && end !== -1) return JSON.parse(text.slice(start, end + 1));
  } catch (_) {}
  return fallback;
}

function buildProjectContext(project) {
  const fields = [
    ['项目名称',   project.name],
    ['项目背景',   project.background],
    ['设计目标',   project.designGoal],
    ['个人贡献',   project.personalContribution],
    ['核心挑战',   project.mainChallenge],
    ['方案探索',   project.solutionComparison],
    ['材料选型',   project.materialChoice],
    ['制造工艺',   project.manufacturingConsideration],
    ['改进方向',   project.improvementIdeas],
    ['AI分析反馈', project.aiFeedback],
  ];
  return fields
    .filter(([, v]) => v && String(v).trim())
    .map(([k, v]) => `【${k}】\n${v}`)
    .join('\n\n');
}

// ── Agent 1: ProjectHandoffAgent ──────────────────────────────────────────────
async function handoff_analysis(state) {
  const { project } = state;
  const context = buildProjectContext(project);

  const prompt = `你是设计工程项目评审 Agent（Agent 1）。
你的任务是：分析该设计项目，为后续的作品集生成 Agent（Agent 2）提供结构化的项目交接分析。

项目信息：
${context}

请以 JSON 格式输出，字段如下：
{
  "completionScore": 0-100 的整数（项目记录完整度评分）,
  "transferReady": true/false（项目是否足够充分可生成作品集）,
  "coreStrengths": ["亮点1", "亮点2", "亮点3"] （3-5个最能体现价值的亮点）,
  "narrativeArc": {
    "problem": "问题/背景一句话概括",
    "process": "设计过程核心路径",
    "solution": "最终方案要点",
    "outcome": "结果与价值（若有）"
  },
  "missingGaps": ["缺失项1", "缺失项2"]（可为空数组）,
  "portfolioAngle": "建议作品集叙事角度（2-3句话）"
}

只返回 JSON，不加任何其他文字。`;

  const result = await analysisLLM.invoke(prompt);
  const text = getLLMText(result);
  const parsed = extractJSON(text, {
    completionScore: 50,
    transferReady: true,
    coreStrengths: ['设计思维清晰', '有明确目标'],
    narrativeArc: { problem: project.background ?? '', process: '', solution: project.designGoal ?? '', outcome: '' },
    missingGaps: [],
    portfolioAngle: '展示系统性设计思维与工程落地能力',
  });

  return { handoffAnalysis: parsed };
}

// ── Agent 2: PortfolioStructureAgent ─────────────────────────────────────────
async function generate_structure(state) {
  const { project, targetRole, handoffAnalysis } = state;
  const context = buildProjectContext(project);

  const analysisStr = JSON.stringify(handoffAnalysis, null, 2);

  const prompt = `你是作品集结构生成 Agent（Agent 2）。
你收到了来自 Agent 1（项目分析 Agent）的交接分析，以及原始项目数据，请为目标岗位生成作品集页面结构。

目标岗位：${targetRole}

Agent 1 交接分析：
${analysisStr}

原始项目数据：
${context}

请生成一套专业的作品集结构，以 JSON 格式输出：
{
  "highlights": ["核心亮点1", "核心亮点2", "核心亮点3"],
  "overallSuggestion": "整体建议（2-3句话）",
  "missingMaterials": ["需补充的素材1", "需补充的素材2"],
  "structure": [
    {
      "pageNumber": 1,
      "title": "页面标题",
      "contentSuggestion": "该页面的详细内容建议（3-5句话，指导用户填写）",
      "requiredMaterials": ["需要的素材/截图/图纸"],
      "isComplete": false
    }
  ]
}

设计规范：
- 通常 8-12 页，顺序为：封面/项目概述 → 问题定义 → 研究与洞察 → 方案探索 → 最终方案 → 技术实现 → 结果与反思 → 个人价值
- 根据 Agent 1 的 narrativeArc 调整叙事顺序
- contentSuggestion 要具体，直接基于项目内容给出写作建议
- 如果某些信息缺失，在 contentSuggestion 中注明需要补充什么

只返回 JSON，不加任何其他文字。`;

  const result = await structureLLM.invoke(prompt);
  const text = getLLMText(result);
  const parsed = extractJSON(text, {
    highlights: handoffAnalysis?.coreStrengths ?? ['设计思维', '工程实现'],
    overallSuggestion: handoffAnalysis?.portfolioAngle ?? '展示系统性设计能力',
    missingMaterials: handoffAnalysis?.missingGaps ?? [],
    structure: [
      { pageNumber: 1, title: '项目概述', contentSuggestion: `基于"${project.background}"，简要介绍项目背景与意义。`, requiredMaterials: ['项目封面图', '效果图'], isComplete: false },
      { pageNumber: 2, title: '设计目标', contentSuggestion: project.designGoal || '描述量化的设计目标与验收标准。', requiredMaterials: [], isComplete: false },
    ],
  });

  const portfolioResult = {
    projectId: project.id,
    targetRole,
    highlights: parsed.highlights ?? [],
    overallSuggestion: parsed.overallSuggestion ?? '',
    missingMaterials: parsed.missingMaterials ?? [],
    structure: (parsed.structure ?? []).map((p, i) => ({
      pageNumber:        p.pageNumber ?? i + 1,
      title:             p.title ?? `第 ${i + 1} 页`,
      contentSuggestion: p.contentSuggestion ?? '',
      requiredMaterials: p.requiredMaterials ?? [],
      isComplete:        p.isComplete ?? false,
    })),
    // Pass through Agent 1 analysis for frontend visibility
    handoffAnalysis,
  };

  return { portfolioResult };
}

// ── Build & compile the graph ─────────────────────────────────────────────────
const workflow = new StateGraph({ channels: graphState })
  .addNode('handoff_analysis', handoff_analysis)
  .addNode('generate_structure', generate_structure)
  .addEdge('__start__', 'handoff_analysis')
  .addEdge('handoff_analysis', 'generate_structure')
  .addEdge('generate_structure', END);

export const portfolioGraph = workflow.compile();
