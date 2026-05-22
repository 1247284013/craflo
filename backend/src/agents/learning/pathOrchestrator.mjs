/**
 * LearningPathOrchestratorAgent
 *
 * The central orchestrator for the learning / career journey.
 *
 * Flow:
 *   1. Receive user goals + profile
 *   2. Generate a full weekly task plan (plannerLLM)
 *   3. Automatically call TargetMatcherAgent → get company/school list
 *   4. Return aggregated result: { weeklyTasks, targets, agentCallLog }
 *
 * Connects to: TargetMatcherAgent, ProjectAgent, PortfolioAgent, KnowledgeBaseAgent
 */
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { BaseAgent }          from '../base.mjs';
import { orchestratorLLM as plannerLLM } from '../llms.mjs';
import { extractJSON, getLLMText } from '../rag/helpers.mjs';
import { targetMatcherAgent } from '../career/targetMatcher.mjs';

// ── System prompt for the orchestrator planner step ──────────────────────────
const ORCHESTRATOR_PROMPT = `你是一位设计/产品领域的职业规划 AI。根据用户信息生成个性化学习路径。

用户信息：
- 背景：{profile}
- 现有技能：{currentSkills}
- 目标模式：{mode}（job=求职，school=申请学校）
- 目标方向：{direction}
- JD/专业关键词：{jdContext}
- 偏好：{preferences}

生成 12-16 周的学习路径。每周包含以下字段（严格 JSON 数组，不要任何解释）：

[
  {
    "week": 1,
    "title": "周标题（10字以内）",
    "phase": "基础|进阶|实战|冲刺",
    "objective": "本周核心目标（1句话）",
    "learningContent": ["知识点1", "知识点2"],
    "practicalTasks": ["实践任务"],
    "deliverables": ["交付物"],
    "checkCriteria": ["验收标准"],
    "resources": ["推荐资源"],
    "completed": false
  }
]

只返回 JSON 数组，不要任何其他内容。`;

class LearningPathOrchestratorAgent extends BaseAgent {
  constructor() {
    super({
      id:          'learning_path_orchestrator',
      name:        'LearningPathOrchestratorAgent',
      group:       'learning',
      description:
        '学习路径编排器。根据用户目标自动规划完整学习路径，并按需调用 TargetMatcherAgent 筛选目标公司/院校、ProjectAgent 初始化项目任务、PortfolioAgent 规划作品集结构。是整个职业成长系统的核心调度 Agent。',
      inputSchema: {
        mode:          "'job' | 'school' · 求职或申请学校",
        profile:       'string · 用户背景描述',
        currentSkills: 'string[] · 当前技能',
        direction:     'string · 目标方向/目标专业',
        jdContext:     'string · JD 内容或专业关键词（可选）',
        preferences:   'string · 偏好（城市/规模/国家等）',
      },
      outputSchema: {
        weeklyTasks:   'WeeklyTask[] · 完整学习路径',
        targets:       'Target[] · 匹配的目标公司或院校',
        tiers:         '{ reach, target, safety } · 按难度分档',
        resumeTips:    'string · 简历调整建议',
        portfolioTips: 'string · 作品集调整建议',
        agentCallLog:  '{ agent, status }[] · 编排过程中调用的 Agent 记录',
        orchestration: '{ suggestProjects, portfolioFocus } · 给其他 Agent 的上下文',
      },
      connects_to: ['target_matcher', 'project_agent', 'portfolio_agent', 'knowledge_base'],
    });
  }

  async execute(input) {
    const {
      mode          = 'job',
      profile       = '',
      currentSkills = [],
      direction     = '',
      jdContext     = '',
      preferences   = '',
    } = input;

    const agentCallLog = [];

    // ── Step 1: Generate plan via LLM ────────────────────────────────────────
    const planPrompt = ORCHESTRATOR_PROMPT
      .replace('{profile}',       profile)
      .replace('{currentSkills}', Array.isArray(currentSkills) ? currentSkills.join('、') : currentSkills)
      .replace('{mode}',          mode)
      .replace('{direction}',     direction)
      .replace('{jdContext}',     jdContext || '暂无')
      .replace('{preferences}',   preferences || '无特殊偏好');

    const planRes = await plannerLLM.invoke([
      new SystemMessage(planPrompt),
      new HumanMessage('请开始生成'),
    ]);

    const planRaw = getLLMText(planRes);
    // LLM returns a bare array now
    const parsed = extractJSON(planRaw, []);
    const weeklyTasks = Array.isArray(parsed) ? parsed : [];
    const orchestration = {};

    agentCallLog.push({ agent: 'planner_llm', status: 'done', output: `${weeklyTasks.length} weeks` });

    // ── Step 2: Call TargetMatcherAgent if orchestrator says so ──────────────
    let targets      = [];
    let tiers        = { reach: [], target: [], safety: [] };
    let resumeTips   = '';
    let portfolioTips= '';

    if (orchestration.callTargetMatcher !== false) {
      try {
        agentCallLog.push({ agent: 'target_matcher', status: 'calling' });
        const matchResult = await targetMatcherAgent.execute({
          mode,
          profile,
          skills:      currentSkills,
          direction:   orchestration.targetMatcherHint || direction,
          preferences,
        });
        targets       = matchResult.targets;
        tiers         = matchResult.tiers;
        resumeTips    = matchResult.resumeTips;
        portfolioTips = matchResult.portfolioTips;
        agentCallLog[agentCallLog.length - 1].status = 'done';
        agentCallLog[agentCallLog.length - 1].output = `${targets.length} targets`;
      } catch (err) {
        agentCallLog[agentCallLog.length - 1].status = 'error';
        agentCallLog[agentCallLog.length - 1].error  = err.message;
      }
    }

    return {
      weeklyTasks,
      targets,
      tiers,
      resumeTips,
      portfolioTips,
      agentCallLog,
      orchestration: {
        suggestProjects: orchestration.suggestProjects ?? [],
        portfolioFocus:  orchestration.portfolioFocus  ?? '',
      },
    };
  }
}

export const learningPathOrchestratorAgent = new LearningPathOrchestratorAgent();
