import { BaseAgent } from '../base.mjs';
import { analysisLLM } from '../llms.mjs';

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

class ProjectHandoffAgent extends BaseAgent {
  constructor() {
    super({
      id:          'handoff_analysis',
      name:        'ProjectHandoffAgent',
      group:       'portfolio',
      description: '项目交接分析（A2A Agent 1）。读取全部项目字段，评估完整度，提取 3-5 个核心亮点，构建问题-过程-方案-结果叙事弧，输出结构化 JSON 供 PortfolioStructureAgent（Agent 2）使用。',
      inputSchema: {
        project:    'Project · 包含所有字段的项目对象',
        targetRole: 'string · 目标岗位，如 product-design-engineer',
      },
      outputSchema: {
        handoffAnalysis: `{
  completionScore: number,     // 0-100 完整度
  transferReady:   boolean,    // 是否可生成作品集
  coreStrengths:   string[],   // 3-5 个核心亮点
  narrativeArc:    { problem, process, solution, outcome },
  missingGaps:     string[],   // 缺失项（可为空）
  portfolioAngle:  string      // 建议叙事角度
}`,
      },
      connects_to: ['generate_structure'],
    });
  }

  async execute(state) {
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
    const text   = getLLMText(result);
    const parsed = extractJSON(text, {
      completionScore: 50,
      transferReady:   true,
      coreStrengths:   ['设计思维清晰', '有明确目标'],
      narrativeArc:    { problem: project.background ?? '', process: '', solution: project.designGoal ?? '', outcome: '' },
      missingGaps:     [],
      portfolioAngle:  '展示系统性设计思维与工程落地能力',
    });

    return { handoffAnalysis: parsed };
  }
}

export const projectHandoffAgent = new ProjectHandoffAgent();
