import { BaseAgent } from '../base.mjs';
import { structureLLM } from '../llms.mjs';

function extractJSON(text, fallback) {
  try {
    const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (m) return JSON.parse(m[1].trim());
    const start = text.indexOf('{');
    const end   = text.lastIndexOf('}');
    if (start !== -1 && end !== -1) return JSON.parse(text.slice(start, end + 1));
  } catch (_) {}
  return fallback;
}

function getLLMText(result) {
  if (typeof result === 'string') return result;
  if (result?.content) return String(result.content);
  return String(result);
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

class PortfolioStructureAgent extends BaseAgent {
  constructor() {
    super({
      id:          'generate_structure',
      name:        'PortfolioStructureAgent',
      group:       'portfolio',
      description: '作品集结构生成（A2A Agent 2）。接收 ProjectHandoffAgent 的交接分析和原始项目数据，结合目标岗位，生成 8-12 页的作品集页面结构，每页包含内容建议和所需素材。',
      inputSchema: {
        handoffAnalysis: 'object · ProjectHandoffAgent（Agent 1）的完整输出',
        project:         'Project · 原始项目对象',
        targetRole:      'string · 目标岗位',
      },
      outputSchema: {
        portfolioResult: `{
  projectId:        string,
  targetRole:       string,
  highlights:       string[],
  overallSuggestion:string,
  missingMaterials: string[],
  structure: [{
    pageNumber:        number,
    title:             string,
    contentSuggestion: string,
    requiredMaterials: string[],
    isComplete:        boolean
  }],
  handoffAnalysis: object   // Agent 1 输出透传
}`,
      },
      connects_to: [],
    });
  }

  async execute(state) {
    const { project, targetRole, handoffAnalysis } = state;
    const context     = buildProjectContext(project);
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
      "contentSuggestion": "该页面的详细内容建议（3-5句话）",
      "requiredMaterials": ["需要的素材/截图/图纸"],
      "isComplete": false
    }
  ]
}

设计规范：
- 通常 8-12 页，顺序为：封面/项目概述 → 问题定义 → 研究与洞察 → 方案探索 → 最终方案 → 技术实现 → 结果与反思 → 个人价值
- 根据 Agent 1 的 narrativeArc 调整叙事顺序
- contentSuggestion 要具体，直接基于项目内容给出写作建议

只返回 JSON，不加任何其他文字。`;

    const result  = await structureLLM.invoke(prompt);
    const text    = getLLMText(result);
    const parsed  = extractJSON(text, {
      highlights:       handoffAnalysis?.coreStrengths ?? ['设计思维', '工程实现'],
      overallSuggestion:handoffAnalysis?.portfolioAngle ?? '展示系统性设计能力',
      missingMaterials: handoffAnalysis?.missingGaps ?? [],
      structure: [
        { pageNumber: 1, title: '项目概述', contentSuggestion: `基于"${project.background}"，简要介绍项目背景与意义。`, requiredMaterials: ['项目封面图', '效果图'], isComplete: false },
      ],
    });

    const portfolioResult = {
      projectId:        project.id,
      targetRole,
      highlights:       parsed.highlights        ?? [],
      overallSuggestion:parsed.overallSuggestion ?? '',
      missingMaterials: parsed.missingMaterials  ?? [],
      structure: (parsed.structure ?? []).map((p, i) => ({
        pageNumber:        p.pageNumber        ?? i + 1,
        title:             p.title             ?? `第 ${i + 1} 页`,
        contentSuggestion: p.contentSuggestion ?? '',
        requiredMaterials: p.requiredMaterials  ?? [],
        isComplete:        p.isComplete        ?? false,
      })),
      handoffAnalysis,
    };

    return { portfolioResult };
  }
}

export const portfolioStructureAgent = new PortfolioStructureAgent();
