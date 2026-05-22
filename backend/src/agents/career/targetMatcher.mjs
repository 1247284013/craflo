/**
 * TargetMatcherAgent
 *
 * Matches target companies (job mode) or schools (school mode) based on the
 * user's profile, skills, and JD/target direction.
 *
 * Called by LearningPathOrchestratorAgent as a sub-task.
 *
 * Input:  { mode, profile, skills, jd?, preferences? }
 * Output: { targets, tiers, resumeTips, portfolioTips }
 */
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { BaseAgent }  from '../base.mjs';
import { careerLLM }  from '../llms.mjs';
import { extractJSON, getLLMText } from '../rag/helpers.mjs';

const JOB_PROMPT = `你是一位资深职业规划顾问。根据用户的背景和目标，推荐最匹配的目标公司。

用户背景：
{profile}

技能标签：{skills}

目标方向 / JD 关键词：{direction}

偏好（城市/规模/行业）：{preferences}

请推荐 10-15 家目标公司，按匹配度分三档：
- reach（冲刺）：知名度高、竞争激烈，有一定难度但值得尝试
- target（目标）：匹配度高、最合理的核心目标
- safety（保底）：基本确定能拿到面试的公司

每家公司返回：
{
  "name": "公司名",
  "industry": "行业",
  "size": "规模（大厂/中型/独角兽/初创）",
  "tier": "reach|target|safety",
  "matchScore": 0-100,
  "roles": ["适合岗位1", "适合岗位2"],
  "highlights": "公司特点一句话",
  "resumeTip": "针对这家公司，简历/作品集需要重点突出什么",
  "city": "主要城市"
}

只返回 JSON 数组，不要任何解释文字。`;

const SCHOOL_PROMPT = `你是一位留学申请顾问。根据用户的背景和目标，推荐最匹配的目标院校。

用户背景：
{profile}

技能 / 作品集方向：{skills}

目标专业：{direction}

偏好（国家/地区/课程类型）：{preferences}

请推荐 10-15 所目标院校，按录取难度分三档：
- reach（冲刺）：录取率低、排名高，有一定难度但值得冲刺
- target（目标）：匹配度高、最合理的核心选择
- safety（保底）：基本确定能拿到 offer 的院校

每所院校返回：
{
  "name": "院校名（中英文）",
  "country": "国家",
  "program": "具体项目名",
  "tier": "reach|target|safety",
  "offerChance": 0-100,
  "deadline": "申请截止（如 12月1日）",
  "highlights": "项目特点一句话",
  "portfolioTip": "作品集需要重点体现什么以匹配这所学校的偏好",
  "tuition": "学费范围（如 $50k/年）"
}

只返回 JSON 数组，不要任何解释文字。`;

class TargetMatcherAgent extends BaseAgent {
  constructor() {
    super({
      id:          'target_matcher',
      name:        'TargetMatcherAgent',
      group:       'career',
      description: '目标匹配。根据用户背景和目标方向，推荐目标公司（求职模式）或目标院校（申请模式），分冲刺/目标/保底三档，并给出简历和作品集微调建议。',
      inputSchema: {
        mode:        "'job' | 'school' · 求职或申请学校模式",
        profile:     'string · 用户背景描述（学历、经历、技能）',
        skills:      'string[] · 技能标签',
        direction:   'string · 目标方向/JD关键词/目标专业',
        preferences: 'string · 偏好（城市、规模、国家等）',
      },
      outputSchema: {
        targets:      'Target[] · 推荐目标列表（含 tier、matchScore/offerChance）',
        tiers:        '{ reach: Target[], target: Target[], safety: Target[] } · 按档位分组',
        resumeTips:   'string · 通用简历调整建议',
        portfolioTips:'string · 通用作品集调整建议',
      },
      connects_to: ['learning_path_orchestrator'],
    });
  }

  async execute(input) {
    const { mode = 'job', profile = '', skills = [], direction = '', preferences = '' } = input;

    const template = mode === 'school' ? SCHOOL_PROMPT : JOB_PROMPT;
    const prompt = template
      .replace('{profile}',     profile)
      .replace('{skills}',      Array.isArray(skills) ? skills.join('、') : skills)
      .replace('{direction}',   direction)
      .replace('{preferences}', preferences || '无特殊偏好');

    const res = await careerLLM.invoke([
      new SystemMessage(prompt),
      new HumanMessage('请开始推荐'),
    ]);

    const raw = getLLMText(res);
    const targets = extractJSON(raw, []);
    const validTargets = Array.isArray(targets) ? targets : [];

    // Group by tier
    const tiers = {
      reach:  validTargets.filter(t => t.tier === 'reach'),
      target: validTargets.filter(t => t.tier === 'target'),
      safety: validTargets.filter(t => t.tier === 'safety'),
    };

    // Generic tips
    const resumeTips  = mode === 'job'
      ? '根据目标公司特点，突出与其业务最相关的项目经历，量化成果数据。'
      : '结合目标院校的研究方向，在作品集 statement 中体现你对该方向的理解与热情。';
    const portfolioTips = mode === 'job'
      ? '冲刺公司通常看重端对端的完整项目，不只是视觉稿；目标/保底公司看重执行质量和细节。'
      : '冲刺院校偏好有独立研究/批判性思维的作品；保底院校更看重执行技术完整度。';

    return { targets: validTargets, tiers, resumeTips, portfolioTips };
  }
}

export const targetMatcherAgent = new TargetMatcherAgent();
