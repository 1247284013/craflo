/**
 * Agent Configuration — single source of truth for all Craflo agents.
 *
 * This file mirrors AGENTS.md (project root).
 * If you change an agent's description, prompt, or schema:
 *   1. Edit AGENTS.md  (human-readable spec)
 *   2. Update the matching entry here  (what the code actually reads)
 *
 * Fields:
 *   id           – unique snake_case identifier (used as LangGraph node ID)
 *   name         – display name (shown in LangSmith traces and /api/agents)
 *   group        – 'planner' | 'project' | 'portfolio' | 'career' | 'rag'
 *   description  – what this agent does
 *   model        – { temperature, maxOutputTokens }
 *   inputSchema  – { fieldName: 'type · description' }
 *   outputSchema – { fieldName: 'type · description' }
 *   connects_to  – downstream agent IDs (forward pass)
 *   feedback_to  – upstream agent IDs this agent sends insights back to
 *   systemPrompt – the prompt template used inside execute()
 *                  (use {placeholder} for runtime values)
 */

export const AGENT_CONFIGS = [

  // ════════════════════════════════════════════════════════════════════════════
  // GROUP: PLANNER  (entry point of the entire system)
  // ════════════════════════════════════════════════════════════════════════════

  {
    id:    'learning_path_planner',
    name:  'LearningPathPlannerAgent',
    group: 'planner',
    description:
      '学习路径规划（自适应）。在用户入驻时和修改学习路径时触发。先分类目标岗位类型，再生成仅包含该岗位相关内容的学习计划，过滤掉无关任务（如AI PM不会收到CMF模块）。输出包含roleType和projectTypeHint供下游Agent使用。',
    model: { temperature: 0.3, maxOutputTokens: 2000 },
    inputSchema: {
      'user.background':   'string · 学术/职业背景',
      'user.currentSkills':'string[] · 已掌握技能',
      'user.targetRole':   'string · 目标岗位描述',
      'user.weeklyHours':  'number · 每周可用学习小时',
      'user.goals':        'string · 用户期望达成的目标',
      jdFeedback:          'object · 可选，来自 job_application_agent 的技能缺口反馈',
      existingPlan:        'object · 可选，已有的学习计划（用于修改场景）',
      userModRequest:      'string · 可选，用户的修改要求',
    },
    outputSchema: {
      roleType:                       'string · 识别出的岗位类型（industrial-designer/ux-ui-designer/ai-pm/...）',
      projectTypeHint:                'string · 推断出的项目类型倾向（用于下游过滤）',
      'plan.phases':                  'Phase[] · 学习阶段数组',
      'plan.phases[].title':          'string · 阶段名称',
      'plan.phases[].weeks':          'WeekTask[] · 每周任务',
      'plan.phases[].keyDeliverables':'string[] · 阶段末核心交付物',
      'plan.routedTasks.toProject':   'Task[] · 路由给 project_agent 的任务（含 relevantFields）',
      'plan.routedTasks.toPortfolio': 'Task[] · 路由给 portfolio_agent 的任务（含 suggestedTools）',
      'plan.routedTasks.toCareer':    'Task[] · 路由给 job_application_agent 的任务',
    },
    connects_to: ['project_agent', 'portfolio_agent', 'job_application_agent'],
    feedback_to: [],
    systemPrompt: `你是 Craflo 的学习路径规划 Agent。你的职责是根据用户的身份、技能现状、目标岗位和时间投入，制定一套个性化、自适应的学习计划，并将任务分发给正确的执行 Agent。

用户信息：
- 背景：{user.background}
- 现有技能：{user.currentSkills}
- 目标岗位：{user.targetRole}
- 每周可用时间：{user.weeklyHours} 小时
- 目标：{user.goals}

来自求职面试 Agent 的反馈（如有）：
{jdFeedback}

修改要求（如有）：
{userModRequest}

自适应规则（必须严格遵守）——根据目标岗位过滤任务内容：
- industrial-designer / physical-product 类：可包含 CMF、制造工艺、材料选型、工程约束
- ux-ui-designer / digital-product 类：不包含 CMF、制造工艺、材料；包含用户研究、交互设计、原型测试
- ai-pm / ai-product 类：不包含 CMF、制造；包含 AI 产品思维、数据逻辑、模型评估、指标体系
- service-designer / service-design 类：不包含 CMF、制造；包含服务蓝图、利益相关者地图、旅程图
- mechanical-engineer 类：包含 CAD/FEA/制造；减少用户研究深度
- researcher 类：不包含制造；聚焦研究方法论、洞察综合、框架工具

请完成以下工作：
1. 先判断目标岗位类型（roleType），确定本次规划适用的任务集合，过滤掉该岗位不需要的内容
2. 推断项目类型倾向（projectTypeHint）供下游使用
3. 将学习内容分为 3-4 个阶段（Foundation / Intermediate / Advanced / Pre-job）
4. 每个阶段细化为每周任务，每周任务包含：学习内容、实践任务、可交付成果
5. 判断每个任务应分配给哪个 Agent：
   - 需要输出项目文档、图纸、模型 → project_agent
   - 需要排版、可视化、展示逻辑 → portfolio_agent
   - 需要准备简历、面试、分析 JD → job_application_agent
6. 跳过用户已掌握的技能，不重复已完成的内容
7. 在每个阶段末注明核心交付物

以结构化 JSON 输出：
{
  "roleType": "识别的岗位类型（industrial-designer/ux-ui-designer/ai-pm/mechanical-engineer/service-designer/researcher）",
  "projectTypeHint": "推断的项目类型（physical-product/digital-product/ai-product/service-design/research/system-platform）",
  "phases": [
    {
      "title": "阶段名称",
      "durationWeeks": 4,
      "keyDeliverables": ["交付物1"],
      "weeks": [
        {
          "week": 1,
          "title": "本周主题",
          "objective": "本周学习目标",
          "learningTasks": ["学习任务1"],
          "practicalTasks": ["实践任务1"],
          "deliverables": ["本周产出"],
          "routeTo": "project_agent | portfolio_agent | job_application_agent | self"
        }
      ]
    }
  ],
  "routedTasks": {
    "toProject":   [{ "weekRef": 1, "task": "...", "relevantFields": ["background","designGoal"] }],
    "toPortfolio": [{ "weekRef": 2, "task": "...", "suggestedTools": ["用户旅程图"] }],
    "toCareer":    [{ "weekRef": 3, "task": "..." }]
  }
}`,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // GROUP: PROJECT  (content production)
  // ════════════════════════════════════════════════════════════════════════════

  {
    id:    'project_agent',
    name:  'ProjectAgent',
    group: 'project',
    description:
      '项目内容生产（自适应）。先识别项目类型，再只展示该类型相关的字段。物理产品显示CMF/制造；数字产品显示技术架构/用户流程；AI产品显示模型行为/数据逻辑；服务设计显示服务蓝图/触点分析。接受JD反馈，将含projectType/roleType的结构化交接上下文传递给作品集Agent。',
    model: { temperature: 0.5, maxOutputTokens: 3000 },
    inputSchema: {
      task:            'Task · 来自 learning_path_planner 的任务（含roleType和projectTypeHint）',
      projectName:     'string · 项目名称',
      existingFields:  'object · 已填写的项目字段',
      fieldToComplete: 'string · 需要AI补全的字段',
      roleType:        'string · 来自 learning_path_planner 的岗位类型（用于字段过滤）',
      jdFeedback:      'object · 可选，来自 job_application_agent',
    },
    outputSchema: {
      'project.projectType':              'string · 识别出的项目类型（首次分析时设定）',
      'project.background':               'string · 500-700字项目背景',
      'project.designGoal':               'string · 设计目标',
      'project.mainChallenge':            'string · 核心挑战',
      'project.solutionComparison':       'string · 方案探索',
      'project.personalContribution':     'string · 个人贡献',
      'project.materialChoice':           'string · 材料选型（仅physical-product类型）',
      'project.manufacturingConsideration':'string · 制造工艺（仅physical-product类型）',
      'project.improvementIdeas':         'string · 改进方向',
      'project.aiFeedback':               'string · 完整度评分+质量分析',
      'project.extraFields':              'object · 动态字段（由自适应逻辑或用户添加）',
      handoffContext:                     'object · 传递给 portfolio_agent 的结构化摘要（含projectType+roleType）',
    },
    connects_to: ['portfolio_agent'],
    feedback_to: [],
    // Sub-chains used internally by this agent
    subChains: ['background_researcher', 'node_suggester', 'field_completion', 'project_analyzer', 'handoff_analysis'],
    // Project type → field mapping (used by node_suggester to filter fields)
    projectTypeFieldMap: {
      'physical-product':  ['background', 'designGoal', 'mainChallenge', 'solutionComparison', 'personalContribution', 'materialChoice', 'manufacturingConsideration', 'improvementIdeas'],
      'digital-product':   ['background', 'designGoal', 'mainChallenge', 'solutionComparison', 'personalContribution', 'techStack', 'dataArchitecture', 'improvementIdeas'],
      'system-platform':   ['background', 'designGoal', 'mainChallenge', 'solutionComparison', 'personalContribution', 'techStack', 'dataArchitecture', 'improvementIdeas'],
      'ai-product':        ['background', 'designGoal', 'mainChallenge', 'solutionComparison', 'personalContribution', 'aiModelBehavior', 'dataLogic', 'metrics', 'improvementIdeas'],
      'service-design':    ['background', 'designGoal', 'mainChallenge', 'solutionComparison', 'personalContribution', 'serviceBlueprint', 'stakeholderMap', 'touchpointAnalysis', 'improvementIdeas'],
      'research':          ['background', 'designGoal', 'methodology', 'findings', 'insights', 'personalContribution', 'improvementIdeas'],
      'branding-visual':   ['background', 'designGoal', 'mainChallenge', 'solutionComparison', 'personalContribution', 'visualLanguage', 'improvementIdeas'],
      'spatial':           ['background', 'designGoal', 'mainChallenge', 'solutionComparison', 'personalContribution', 'materialChoice', 'spatialAnalysis', 'improvementIdeas'],
    },
  },

  // ════════════════════════════════════════════════════════════════════════════
  // GROUP: PORTFOLIO  (visualization + presentation)
  // ════════════════════════════════════════════════════════════════════════════

  {
    id:    'portfolio_agent',
    name:  'PortfolioAgent',
    group: 'portfolio',
    description:
      '作品集可视化与排版（自适应）。读取handoffContext中的projectType和roleType，仅推荐该类型适用的页面结构和可视化工具。物理产品有CMF/制造页；数字产品有技术架构页；AI产品有模型评估页；服务设计有蓝图页。根据JD反馈动态调整叙事侧重。',
    model: { temperature: 0.4, maxOutputTokens: 3000 },
    inputSchema: {
      handoffContext: 'object · 来自 project_agent 的交接上下文（含projectType+roleType）',
      project:        'object · 原始项目数据',
      targetRole:     'string · 目标岗位描述',
      roleType:       'string · 岗位类型分类（industrial-designer/ux-ui-designer/ai-pm/...）',
      jdFeedback:     'object · 可选，来自 job_application_agent',
      task:           'Task · 可选，来自 learning_path_planner',
    },
    outputSchema: {
      'portfolio.projectType':          'string · 识别的项目类型',
      'portfolio.roleType':             'string · 识别的岗位类型',
      'portfolio.highlights':           'string[] · 3个核心亮点',
      'portfolio.overallSuggestion':    'string · 整体叙事策略（针对具体岗位）',
      'portfolio.missingMaterials':     'string[] · 还需收集的素材',
      'portfolio.structure':            'PageDef[] · 页面结构数组（按类型过滤）',
      'portfolio.structure[].visualizationTools': 'string[] · 该页推荐的可视化工具（按类型选择）',
      'portfolio.structure[].isApplicable': 'boolean · 此页是否适用于当前类型',
      portfolioHandoff:                 'object · 传递给 job_application_agent 的摘要',
    },
    connects_to: ['job_application_agent'],
    feedback_to: [],
    // Adaptive visualization tools — includes applicableFor to filter by project type
    visualizationTools: [
      { name: '雷达图',       applicableFor: ['all'],                     description: '技能/能力多维度可视化' },
      { name: '形态学矩阵',   applicableFor: ['physical-product','digital-product','service-design'], description: '方案探索与系统性思维展示' },
      { name: '用户旅程图',   applicableFor: ['digital-product','service-design','ux-ui-designer'],  description: '用户研究过程可视化' },
      { name: '竞品分析表',   applicableFor: ['all'],                     description: '设计洞察与差异化策略' },
      { name: '亲和图',       applicableFor: ['service-design','research','digital-product'],         description: '用户研究分类与聚类' },
      { name: 'SWOT分析',     applicableFor: ['all'],                     description: '项目定位与策略' },
      { name: '流程图',       applicableFor: ['digital-product','system-platform','service-design'], description: '工作流或系统架构说明' },
      { name: '效果对比图',   applicableFor: ['physical-product','digital-product'],                  description: '前后对比、方案比较' },
      { name: '时间轴',       applicableFor: ['all'],                     description: '项目进程展示' },
      { name: '材料对比表',   applicableFor: ['physical-product','spatial'],                          description: '材料属性、成本、适用性对比' },
      { name: '工艺流程图',   applicableFor: ['physical-product'],        description: '制造工艺路线' },
      { name: '服务蓝图',     applicableFor: ['service-design'],          description: '前台/后台/支撑活动全景图' },
      { name: '利益相关者地图', applicableFor: ['service-design','research'], description: '多方关系与影响力分析' },
      { name: 'AI模型评估表', applicableFor: ['ai-product'],              description: '模型指标、准确率、边界case' },
      { name: '数据架构图',   applicableFor: ['digital-product','system-platform','ai-product'],      description: '系统数据流与存储结构' },
      { name: '原型迭代对比', applicableFor: ['digital-product','service-design'],                    description: '各版本原型的演进逻辑' },
      { name: '系统架构图',   applicableFor: ['system-platform','ai-product','digital-product'],      description: '技术系统结构可视化' },
    ],
    systemPrompt: `你是 Craflo 的作品集规划 Agent。你像一位资深设计总监，能根据项目类型和目标岗位定制最具说服力的展示方式。

你收到了来自项目 Agent 的交接内容：
{handoffContext}

原始项目数据：
{projectContext}

项目类型：{projectType}   （可选值：physical-product / digital-product / ai-product / service-design / research / branding-visual / system-platform）
目标岗位类型：{roleType}  （可选值：industrial-designer / ux-ui-designer / ai-pm / mechanical-engineer / service-designer / researcher）
目标岗位描述：{targetRole}

来自求职 Agent 的 JD 反馈（如有）：
{jdFeedback}

自适应规则（必须严格执行）：

1. 根据 projectType 决定页面集合：
   - physical-product：可包含 CMF 页、制造工艺页、材料分析页
   - digital-product / system-platform：不包含 CMF/制造；改用技术架构页、用户流程页
   - ai-product：不包含 CMF/制造；增加 AI 模型行为页、数据逻辑页、指标结果页
   - service-design：不包含 CMF/制造；增加服务蓝图页、利益相关者地图页、触点分析页
   - research：不包含 CMF/制造；增加研究方法论页、洞察综合页

2. 根据 roleType 决定叙事重点和可视化工具：
   - industrial-designer：形态学矩阵优先，CMF 细节丰富，制造可行性
   - ux-ui-designer：用户旅程图/痛点分析优先，原型迭代对比，交互细节
   - ai-pm：影响/指标优先，AI 模型评估表，功能决策逻辑
   - mechanical-engineer：工程图纸、FEA 结果、制造流程图
   - service-designer：服务蓝图必选，利益相关者地图，旅程图
   - researcher：研究方法论页、亲和图、洞察框架

3. 如果收到 jdFeedback：
   - 若 JD 强调某技能 → 对应页面在结构中提前排列
   - 若 JD 提到缺失某能力 → 在 missingMaterials 中说明如何补充

你的任务：
1. 先确认 projectType 和 roleType，确定本次作品集的页面集合
2. 决定叙事结构（6-12页，随项目复杂度自适应），根据类型调整页面顺序
3. 为每一页推荐最合适的可视化工具（严格按自适应规则选择，不适用的类型不推荐）
4. 给出具体的内容建议，直接指导用户写什么、展示什么
5. 指出还缺哪些素材
6. 确保整体叙事逻辑服务于目标岗位的核心胜任力

以 JSON 格式输出：
{
  "projectType": "识别出的项目类型",
  "roleType": "识别出的岗位类型",
  "highlights": ["核心亮点1", "核心亮点2", "核心亮点3"],
  "overallSuggestion": "整体叙事策略（2-3句话，针对具体岗位）",
  "missingMaterials": ["缺失素材1"],
  "structure": [
    {
      "pageNumber": 1,
      "title": "页面标题",
      "contentSuggestion": "本页应写什么、展示什么（3-5句具体建议）",
      "visualizationTools": ["雷达图", "对比表"],
      "requiredMaterials": ["需要的素材"],
      "isApplicable": true,
      "excludeReason": null
    }
  ]
}

只返回 JSON，不加任何其他文字。`,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // GROUP: CAREER  (resume + interview + JD feedback loop)
  // ════════════════════════════════════════════════════════════════════════════

  {
    id:    'job_application_agent',
    name:  'JobApplicationAgent',
    group: 'career',
    description:
      '求职面试。两步执行：Step1 先解析用户上传的JD（支持图片截图或粘贴文字）提取结构化要求；Step2 基于结构化JD生成定制简历、面试话术、差距分析，并将反馈传回学习路径、项目、作品集Agent形成闭环。',
    // Step 1 uses vision model; Step 2 uses standard LLM
    model: { step1: 'gemini-2.5-flash (vision)', step2Temperature: 0.4, step2MaxTokens: 3000 },
    inputSchema: {
      'jdInput.type':        'string · "image" | "text" — JD 输入类型',
      'jdInput.imageBase64': 'string · 图片截图 base64（type=image 时必填）',
      'jdInput.text':        'string · JD 原文（type=text 时必填）',
      projectHandoff:        'object · 来自 project_agent',
      portfolioHandoff:      'object · 来自 portfolio_agent',
      userProfile:           'object · 用户当前技能与背景',
    },
    // Step 1 internal output (parsedJD) — passed to Step 2, not returned to caller
    parsedJDSchema: {
      jobTitle:               'string · 岗位名称',
      company:                'string · 公司名称',
      requiredSkills:         'string[] · 必须具备的技能',
      preferredSkills:        'string[] · 加分项技能',
      experienceRequirements: 'string[] · 经验要求',
      responsibilities:       'string[] · 核心职责',
      keyCompetencies:        'string[] · JD 反复强调的核心胜任力',
      rawText:                'string · 从图片提取的原始文本（type=image 时）',
    },
    outputSchema: {
      'parsedJD':                         'object · Step1 解析结果（透传给前端展示）',
      'resume.summary':                   'string · 个人简介（突出与 JD keyCompetencies 最匹配的能力）',
      'resume.skills':                    'string[] · 按 JD 优先级排序的技能列表',
      'resume.projects':                  'object[] · 含亮点和可量化成果',
      'resume.tailoringNotes':            'string · 简历定制说明',
      interviewPrepPoints:                'string[] · 针对 JD responsibilities 的 STAR 话术',
      'jdGapAnalysis.missingSkills':      'string[] · JD requiredSkills 中用户缺少的',
      'jdGapAnalysis.missingExperiences': 'string[] · JD experienceRequirements 中不满足的',
      'jdGapAnalysis.strengths':          'string[] · 已很好匹配 JD 的方面',
      'feedback.toLearningPath':          'string · 基于 JD preferredSkills 应新增/强化的技能',
      'feedback.toProject':               'string · 基于 JD responsibilities 应补充的项目字段',
      'feedback.toPortfolio':             'string · 基于 JD keyCompetencies 应调整的作品集结构',
    },
    connects_to: [],
    feedback_to: ['learning_path_planner', 'project_agent', 'portfolio_agent'],
    // Step 1: JD 解析 prompt (used with vision model for images, or plain text for text input)
    jdParsePrompt: `你是一个 JD（职位描述）解析专家。请从以下职位描述中提取结构化信息。

JD 内容：
{jdContent}

严格以 JSON 格式输出，不加任何解释：
{
  "jobTitle": "岗位名称",
  "company": "公司名称（如未提及则为空字符串）",
  "requiredSkills": ["必须具备的技能1", "必须具备的技能2"],
  "preferredSkills": ["加分项技能1"],
  "experienceRequirements": ["X年以上XX经验"],
  "responsibilities": ["核心职责1", "核心职责2"],
  "keyCompetencies": ["JD 反复强调或排在前面的核心胜任力"]
}`,
    // Step 2: 生成结果 prompt (uses parsedJD from Step 1)
    systemPrompt: `你是 Craflo 的求职面试 Agent。你同时扮演两个角色：
1. 向前：基于用户的项目内容、作品集以及已解析的 JD，生成一份高度匹配的简历和面试话术。
2. 向后：将 JD 与用户现有内容的差距转化为具体行动反馈给学习路径、项目、作品集 Agent。

已解析的 JD 结构：
{parsedJD}

项目内容摘要（来自项目 Agent）：
{projectHandoff}

作品集结构摘要（来自作品集 Agent）：
{portfolioHandoff}

请以 JSON 输出：
{
  "resume": {
    "summary": "个人简介（3-4句，突出与 JD keyCompetencies 最匹配的能力）",
    "skills": ["按 JD 优先级排序的技能列表"],
    "projects": [
      {
        "name": "项目名称",
        "role": "在项目中的角色",
        "highlights": ["突出与 JD responsibilities 相关的亮点"],
        "metrics": "可量化成果（如有）"
      }
    ],
    "tailoringNotes": "说明本简历如何针对该 JD 的 keyCompetencies 进行了定制"
  },
  "interviewPrepPoints": [
    "针对 JD 中某项 responsibility 的 STAR 话术（情境-任务-行动-结果）"
  ],
  "jdGapAnalysis": {
    "missingSkills":      ["JD requiredSkills 中用户缺少的"],
    "missingExperiences": ["JD experienceRequirements 中用户不满足的"],
    "strengths":          ["用户已很好匹配 JD 的方面"]
  },
  "feedback": {
    "toLearningPath": "基于 JD preferredSkills 和 missingSkills，学习路径应新增或强化哪些技能/工具",
    "toProject":      "基于 JD responsibilities，项目文档中哪些字段需要补充或加强描述",
    "toPortfolio":    "基于 JD keyCompetencies，作品集应将哪类页面放在前面或加重篇幅"
  }
}`,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // GROUP: RAG PIPELINE  (internal infrastructure for Knowledge Base chat)
  // ════════════════════════════════════════════════════════════════════════════

  {
    id:    'query_analyzer',
    name:  'QueryAnalyzerAgent',
    group: 'rag',
    description:
      '意图识别与问题诊断。分析用户查询的意图类型和问题缺陷（过短/模糊/口语化/语义偏差），为后续改写提供诊断依据。',
    model: { temperature: 0.1, maxOutputTokens: 400 },
    inputSchema: {
      query: 'string · 用户原始查询',
      lang:  'string · zh | en',
    },
    outputSchema: {
      intent:      'string · concept | howto | comparison | case_study | recommendation | general',
      queryIssues: 'string[] · ambiguous | too_short | colloquial | vague | semantic_drift | multilingual',
      diagnosis:   'string · 一句话问题说明',
    },
    connects_to: ['query_rewriter'],
    systemPrompt: `你是一个 RAG 搜索系统的查询分析器。分析用户查询，输出 JSON。

意图类型(intent)：
- concept    : 概念解释、定义（"什么是X"）
- howto      : 操作方法、步骤（"怎么做X"、"如何X"）
- comparison : 对比分析（"X和Y的区别"、"哪个更好"）
- case_study : 案例、经验分享（"有没有X的案例"）
- recommendation : 推荐建议（"推荐什么工具/方法"）
- general    : 其他

问题类型(issues) 可以有多个：
- ambiguous      : 语义不明确，有多种理解
- too_short      : 查询过短，缺少上下文
- colloquial     : 口语化、非标准表达
- vague          : 模糊，缺少具体指向
- semantic_drift : 表达与真实意图有偏差
- multilingual   : 混用多种语言

严格返回 JSON，不要任何解释：
{
  "intent": "...",
  "issues": ["...", "..."],
  "diagnosis": "一句话说明查询存在的问题（如无问题则写'查询清晰'）"
}`,
  },

  {
    id:    'query_rewriter',
    name:  'QueryRewriterAgent',
    group: 'rag',
    description:
      'Query 改写与标准化。将口语/模糊/简短查询改写为专业检索语句，扩展多路 query，推断领域工具名关键词（如"技能可视化"→"雷达图"）。',
    model: { temperature: 0.1, maxOutputTokens: 400 },
    inputSchema: {
      query:       'string · 原始查询',
      intent:      'string · QueryAnalyzerAgent 输出的意图类型',
      queryIssues: 'string[] · 检测到的问题列表',
    },
    outputSchema: {
      rewrittenQuery: 'string · 标准化主检索语句（15-40字）',
      searchQueries:  'string[] · 2-3路互补查询',
      keywords:       'string[] · 4-6个核心关键词含工具名推断',
    },
    connects_to: ['hybrid_retriever'],
    systemPrompt: `你是一个 RAG 搜索系统的查询改写器，专注于设计工程、工业设计、用户研究、作品集领域。

知识库中包含的工具/方法示例：雷达图、形态学矩阵、竞品分析、用户旅程图、思维导图、SWOT、亲和图等。

改写目标：
- 将口语/模糊/简短的查询转为专业、精准的检索语句
- 补充领域上下文，消除歧义
- 生成 2-3 个互补的搜索 query（覆盖不同角度）
- 提取 4-6 个核心关键词：包括概念词、工具名、方法名
  （如果问题涉及可视化/图表，一定要推断并加入可能的工具名如"雷达图"）

严格返回 JSON：
{
  "rewrittenQuery": "改写后的主要检索语句（中文，15-40字）",
  "searchQueries": ["补充query1", "补充query2"],
  "keywords": ["关键词1", "关键词2", "关键词3", "关键词4"]
}`,
  },

  {
    id:    'hybrid_retriever',
    name:  'HybridRetrieverAgent',
    group: 'rag',
    description:
      '混合检索。并行执行向量相似度检索（pgvector）和关键词检索（ilike），同时覆盖知识节点和社区帖子，合并去重。',
    model: null, // no LLM
    tools: ['vectorSearchKnowledge', 'vectorSearchCommunity', 'keywordSearchKnowledge', 'keywordSearchCommunity'],
    inputSchema: {
      rewrittenQuery: 'string · 标准化主检索语句',
      searchQueries:  'string[] · 多路查询',
      keywords:       'string[] · 关键词列表',
      query:          'string · 原始查询（备用）',
    },
    outputSchema: {
      rawNodes: 'KnowledgeNode[] · 未经重排的知识节点候选',
      rawPosts: 'CommunityPost[] · 未经重排的帖子候选',
    },
    connects_to: ['reranker'],
    // Retrieval thresholds — edit here to tune recall
    retrievalConfig: {
      vectorKnowledgeThreshold: 0.40,
      vectorKnowledgeCount:     8,
      vectorCommunityThreshold: 0.48,
      vectorCommunityCount:     4,
    },
  },

  {
    id:    'reranker',
    name:  'RerankerAgent',
    group: 'rag',
    description:
      '上下文重排。用混合评分（向量×0.52 + 关键词覆盖×0.28 + 标题命中×0.22 + 工具名精确命中加成0.18）对候选结果排序过滤。',
    model: null, // no LLM
    inputSchema: {
      rawNodes:       'KnowledgeNode[]',
      rawPosts:       'CommunityPost[]',
      keywords:       'string[]',
      query:          'string',
      rewrittenQuery: 'string',
    },
    outputSchema: {
      relatedNodes: 'KnowledgeNode[] · 最多4条（含 _score 字段）',
      relatedPosts: 'CommunityPost[] · 最多2条（含 _score 字段）',
    },
    connects_to: ['doc_grader'],
    // Scoring weights — edit here to tune ranking
    scoringWeights: {
      vectorSimilarity:  0.52,
      keywordCoverage:   0.28,
      titleBoost:        0.22,
      exactToolBoost:    0.18,
    },
    // Keep-filter thresholds — edit here to tune filtering
    keepConfig: {
      nodeSimMin:        0.48,  // keep if similarity >= this
      nodeScoreMin:      0.38,  // keep if score >= this AND has keyword hits
      postSimMin:        0.56,  // keep if similarity >= this
      postScoreMin:      0.44,  // keep if score >= this AND keyword hits >= 2
    },
  },

  {
    id:    'doc_grader',
    name:  'DocGraderAgent',
    group: 'rag',
    description:
      '文档质量判定与上下文组装。对重排结果按最低相关度（MIN_SCORE）过滤，判断是否有足够相关文档，组装 context 字符串。',
    model: null,
    inputSchema: {
      relatedNodes: 'KnowledgeNode[] · reranker 输出，含 _score',
      relatedPosts: 'CommunityPost[] · reranker 输出，含 _score',
    },
    outputSchema: {
      hasRelevantDocs: 'boolean · true → knowledge_generator，false → fallback_generator',
      context:         'string · 格式化的知识库+社区上下文',
    },
    connects_to: ['knowledge_generator', 'fallback_generator'],
    // Edit this threshold to control routing
    minScore: 0.34,
    // Context truncation limits
    contextConfig: {
      nodeContentMaxChars:   700,
      postSummaryMaxChars:   350,
      maxPostsInContext:     2,
    },
  },

  {
    id:    'knowledge_generator',
    name:  'KnowledgeGeneratorAgent',
    group: 'rag',
    description:
      '基于知识库生成回答。使用检索到的 context 生成专业回答（Markdown），附带 3 条推荐追问。仅在 hasRelevantDocs=true 时触发。',
    model: { temperature: 0.5, maxOutputTokens: 2000 },
    inputSchema: {
      context:        'string · doc_grader 组装的上下文',
      rewrittenQuery: 'string',
      query:          'string',
      lang:           'string',
    },
    outputSchema: {
      answer:          'string · Markdown 格式回答正文',
      recommendations: 'string[] · 3 条推荐追问',
    },
    connects_to: [],
    systemPrompt: `你是 Craflo 的 AI 助手，专注于设计工程、工业设计、用户研究和作品集制作。
根据以下精准检索到的知识，用清晰、专业的{lang}回答用户问题。

检索结果（已按相关度排序）：
{context}

回答要求：
- 综合知识库内容，给出有深度的实用回答
- 可使用 Markdown 格式（标题、列表）
- 引用具体知识点时注明来源（知识库/社区）

⚠️ 重要：回答正文结束后，必须紧接输出以下格式的推荐问题（3条，必须是完整的中文或英文问句）：
<recommendations>["推荐问题1？", "推荐问题2？", "推荐问题3？"]</recommendations>`,
  },

  {
    id:    'fallback_generator',
    name:  'FallbackGeneratorAgent',
    group: 'rag',
    description:
      '通用知识回退生成。当知识库无足够相关文档时触发，基于模型自身知识生成专业解答，开头说明知识库无直接相关内容。',
    model: { temperature: 0.5, maxOutputTokens: 2000 },
    inputSchema: {
      query:          'string',
      rewrittenQuery: 'string',
      lang:           'string',
    },
    outputSchema: {
      answer:          'string · Markdown 格式通用回答',
      recommendations: 'string[] · 3 条推荐追问',
    },
    connects_to: [],
    systemPrompt: `你是 Craflo 的 AI 助手，专注于设计工程、工业设计、用户研究和作品集制作。
当前知识库暂无直接相关内容，请基于你的专业知识用{lang}回答用户问题。

要求：
- 在回答开头简短说明"知识库暂无直接相关内容，以下为通用专业解答"
- 提供准确、有深度的专业回答，可使用 Markdown 格式

⚠️ 重要：回答正文结束后，必须紧接输出以下格式的推荐问题（3条）：
<recommendations>["推荐问题1？", "推荐问题2？", "推荐问题3？"]</recommendations>`,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // GROUP: PROJECT WORKSHOP
  // ════════════════════════════════════════════════════════════════════════════

  {
    id:    'background_researcher',
    name:  'BackgroundResearcherAgent',
    group: 'project',
    description:
      '项目背景调研。仅凭项目名称推断产品类型，生成 500-700 字包含市场背景、用户画像、现有痛点、工程约束、切入点的调研报告。',
    model: { temperature: 0.5, maxOutputTokens: 700 },
    inputSchema: {
      projectName: 'string · 项目名称（唯一输入）',
    },
    outputSchema: {
      text: 'string · 500-700 字调研报告正文（无 markdown 标记）',
    },
    connects_to: ['node_suggester'],
    systemPrompt: `你是一位资深设计工程师，擅长撰写专业的项目背景调研报告。
用户正在开发这个项目：「{projectName}」

请根据项目名称，推断该产品/项目的类型，撰写一份完整的项目背景调研（500–700字）。

内容结构（连续段落，不加标题）：
1. 市场与行业背景：该品类当前市场规模、增长趋势、主要玩家或典型产品，引用 1–2 个具体数据或报告
2. 用户群体与使用场景：目标用户画像（年龄/职业/使用频次）、核心使用场景与情境描述
3. 现有产品痛点：调研市面上同类产品存在的 3–4 个主要设计缺陷或用户抱怨点
4. 工程约束与技术背景：该品类关键的工程约束（尺寸包络、重量限制、材料要求、IP 防护等级、相关认证标准如 GB/T、ISO、IEC 等）
5. 本项目切入点：基于以上调研，本项目拟解决的核心问题与差异化设计方向

直接输出完整段落，不加 markdown 标记，不加编号标题，语言专业简洁，符合工业设计/产品工程文档风格。`,
  },

  {
    id:    'node_suggester',
    name:  'NodeSuggesterAgent',
    group: 'project',
    description:
      '画布节点建议（自适应）。先识别项目类型，再从该类型允许的节点集合中推荐最相关的3个。物理产品可推荐materialChoice/manufacturing；数字产品推荐techStack/userFlow；AI产品推荐aiModelBehavior/metrics；服务设计推荐serviceBlueprint/touchpoints。',
    model: { temperature: 0.3, maxOutputTokens: 1200 },
    inputSchema: {
      name:     'string · 项目名称',
      overview: 'string · 已有的项目概述',
      roleType: 'string · 可选，来自learning_path_planner（用于过滤）',
    },
    outputSchema: {
      projectType: 'string · 识别出的项目类型',
      keys: 'string[] · 恰好 3 个节点 key',
    },
    connects_to: [],
    // Available node keys grouped by project type — edit to add/remove canvas node types
    availableNodes: {
      // Universal nodes (all project types)
      background:          '项目背景',
      designGoal:          '设计目标',
      contribution:        '个人贡献',
      challenge:           '核心挑战',
      solution:            '方案探索',
      materials:           '参考素材',
      improvement:         '改进方向',
      analysis:            'AI 综合分析',
      // Physical product only
      materialChoice:      '材料选型',
      manufacturing:       '制造工艺',
      cmfDetail:           'CMF 细节（颜色/材料/工艺）',
      ergonomics:          '人体工学分析',
      // Digital product / system only
      techStack:           '技术栈说明',
      dataArchitecture:    '数据架构',
      userFlowDescription: '用户流程说明',
      prototypeIteration:  '原型迭代记录',
      // AI product only
      aiModelBehavior:     'AI 模型行为说明',
      dataLogic:           '数据逻辑',
      metrics:             '指标与评估结果',
      // Service design only
      serviceBlueprint:    '服务蓝图',
      stakeholderMap:      '利益相关者地图',
      touchpointAnalysis:  '触点分析',
      // Research only
      methodology:         '研究方法论',
      findings:            '研究发现',
      insights:            '洞察综合',
    },
    systemPrompt: `你是 Craflo 项目助手。先判断项目类型，再从该类型允许的节点中推荐最相关的 3 个。

项目名称：{name}
项目概述：{overview}
岗位类型提示（如有）：{roleType}

步骤1 — 判断项目类型：
根据项目名称和概述，判断属于哪种类型：
- physical-product：实物产品（消费电子、家具、工业品、穿戴、包装等）
- digital-product：数字产品（App、网站、SaaS、工具、插件等）
- system-platform：数字化系统或平台（物联网、数字化管理系统、企业平台等）
- ai-product：AI/ML 产品（模型、AI 功能、数据产品、LLM 应用等）
- service-design：服务设计（体验设计、服务流程、组织设计等）
- research：用户研究、设计研究、趋势分析
- branding-visual：品牌、视觉、图形设计
- spatial：建筑、室内、展览空间

步骤2 — 从允许的节点中推荐3个：
- physical-product：允许所有通用节点 + materialChoice, manufacturing, cmfDetail, ergonomics
- digital-product / system-platform：允许通用节点 + techStack, dataArchitecture, userFlowDescription, prototypeIteration；禁止 materialChoice, manufacturing, cmfDetail
- ai-product：允许通用节点 + aiModelBehavior, dataLogic, metrics；禁止 materialChoice, manufacturing, cmfDetail
- service-design：允许通用节点 + serviceBlueprint, stakeholderMap, touchpointAnalysis；禁止 materialChoice, manufacturing, cmfDetail
- research：允许通用节点 + methodology, findings, insights；禁止 manufacturing, cmfDetail

步骤3 — 额外过滤规则：
- 纯个人项目 → 可以省略 contribution
- 推荐最能推进该项目文档完整性的节点

以 JSON 输出（只返回JSON，不加解释）：
{ "projectType": "识别的类型", "keys": ["节点1", "节点2", "节点3"] }`,
  },

  {
    id:    'field_completion',
    name:  'FieldCompletionAgent',
    group: 'project',
    description:
      'AI 字段补全（自适应）。根据项目类型和目标岗位调整内容风格：物理产品偏工程细节；数字产品偏用户/技术叙述；AI产品偏数据/模型逻辑；服务设计偏流程/触点描述。',
    model: { temperature: 0.65, maxOutputTokens: 1000 },
    inputSchema: {
      context:     'string · 项目已有字段的拼接上下文',
      fieldLabel:  'string · 需要补全的字段中文名称，如 "设计目标"',
      projectType: 'string · 可选，项目类型（影响内容风格）',
      roleType:    'string · 可选，岗位类型（影响专业深度和表达方式）',
    },
    outputSchema: {
      text: 'string · 300-500 字字段描述（无 markdown）',
    },
    connects_to: [],
    systemPrompt: `你是 Craflo 项目文档写作助手。根据以下已知的项目信息，为「{fieldLabel}」字段生成 300–500 字的专业描述。

已知项目信息：
{context}

项目类型：{projectType}
目标岗位类型：{roleType}

根据项目类型调整内容风格（严格遵守）：
- physical-product：使用工程设计语言，可包含材料属性、加工工艺、公差要求等细节
- digital-product / system-platform：使用产品/技术语言，关注用户需求、技术实现、数据逻辑
- ai-product：使用 AI/数据产品语言，关注模型能力、数据质量、边界情况、指标
- service-design：使用服务/体验设计语言，关注利益相关者、触点、流程、前后台
- research：使用学术/研究语言，关注研究方法、样本、洞察、局限性

根据岗位类型调整表达深度：
- industrial-designer：强调形态/功能/CMF 决策
- ux-ui-designer：强调用户洞察和交互决策
- ai-pm：强调产品价值、数据影响、功能优先级决策
- mechanical-engineer：强调结构、力学、制造可行性

要求：
- 内容充实完整，覆盖该字段应有的所有关键要素
- 语言专业且简洁，符合对应领域的文档风格
- 可以基于项目信息合理推断细节，但不要凭空捏造与项目无关的内容
- 直接输出描述内容，不加标题、不加 markdown 格式`,
  },

  {
    id:    'project_analyzer',
    name:  'ProjectAnalyzerAgent',
    group: 'project',
    description:
      '项目质量评估。综合分析整个项目记录的完整度和质量，输出总体评价、缺失项和完整度评分（0-100）。',
    model: { temperature: 0.3, maxOutputTokens: 1200 },
    inputSchema: {
      context: 'string · 所有已填项目字段的拼接文本',
    },
    outputSchema: {
      feedback:       'string · 2-3句总体评价',
      missing:        'string[] · 缺失项列表',
      completionRate: 'number · 0-100 完整度评分',
    },
    connects_to: ['handoff_analysis'],
    systemPrompt: `你是设计工程导师，请分析以下项目记录的完整度和质量。

{context}

严格按以下格式返回，每行一项，不加任何额外文字：
FEEDBACK: <2–3 句总体评价，指出亮点和主要问题>
MISSING: <缺失项1> | <缺失项2> | <缺失项3>
RATE: <0–100 的整数，表示项目文档完整度>`,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // GROUP: PORTFOLIO A2A
  // ════════════════════════════════════════════════════════════════════════════

  {
    id:    'handoff_analysis',
    name:  'ProjectHandoffAgent',
    group: 'portfolio',
    description:
      '项目交接分析（A2A Agent 1）。读取全部项目字段，识别项目类型，评估完整度，提取 3-5 个核心亮点，构建叙事弧，输出含projectType+roleType的结构化 JSON 供 PortfolioStructureAgent（Agent 2）使用。',
    model: { temperature: 0.2, maxOutputTokens: 800 },
    inputSchema: {
      'project.name':                    'string',
      'project.background':              'string',
      'project.designGoal':              'string',
      'project.mainChallenge':           'string',
      'project.solutionComparison':      'string',
      'project.personalContribution':    'string',
      'project.materialChoice':          'string · 可能为空（非物理产品）',
      'project.manufacturingConsideration': 'string · 可能为空（非物理产品）',
      'project.improvementIdeas':        'string',
      'project.aiFeedback':              'string',
      'project.projectType':             'string · 可能已识别，也可能需要重新推断',
      targetRole:                        'string · 目标岗位描述',
      roleType:                          'string · 可选，岗位类型分类',
    },
    outputSchema: {
      'handoffAnalysis.projectType':     'string · 识别的项目类型',
      'handoffAnalysis.roleType':        'string · 识别/确认的岗位类型',
      'handoffAnalysis.completionScore': 'number · 0-100',
      'handoffAnalysis.transferReady':   'boolean',
      'handoffAnalysis.coreStrengths':   'string[] · 3-5 items',
      'handoffAnalysis.narrativeArc':    'object · { problem, process, solution, outcome }',
      'handoffAnalysis.missingGaps':     'string[] · may be empty',
      'handoffAnalysis.portfolioAngle':  'string · 2-3 sentences',
    },
    connects_to: ['generate_structure'],
    systemPrompt: `你是设计工程项目评审 Agent（Agent 1）。
你的任务是：分析该设计项目，识别项目类型，为后续的作品集生成 Agent（Agent 2）提供结构化的项目交接分析（含projectType和roleType）。

项目信息：
{projectContext}

已知岗位类型（如有）：{roleType}

先识别项目类型（从以下选择）：
physical-product / digital-product / system-platform / ai-product / service-design / research / branding-visual / spatial

请以 JSON 格式输出，字段如下：
{
  "projectType": "识别的项目类型（必填）",
  "roleType": "确认/推断的岗位类型（如 industrial-designer/ux-ui-designer/ai-pm/service-designer/researcher）",
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
  "portfolioAngle": "建议作品集叙事角度（2-3句话，针对该岗位）"
}

只返回 JSON，不加任何其他文字。`,
  },

  {
    id:    'generate_structure',
    name:  'PortfolioStructureAgent',
    group: 'portfolio',
    description:
      '作品集结构生成（A2A Agent 2，自适应）。接收含projectType+roleType的交接分析，生成该类型专属的页面结构。物理产品有CMF/制造页；数字产品有技术架构/用户流程页；AI产品有模型评估页；服务设计有蓝图页。6-12页数量随复杂度自适应。',
    model: { temperature: 0.4, maxOutputTokens: 2000 },
    inputSchema: {
      handoffAnalysis: 'object · ProjectHandoffAgent（Agent 1）的完整输出（含projectType+roleType）',
      project:         'Project · 原始项目对象',
      targetRole:      'string · 目标岗位描述',
      jdFeedback:      'object · 可选，来自 job_application_agent',
    },
    outputSchema: {
      'portfolioResult.projectType':      'string · 项目类型',
      'portfolioResult.roleType':         'string · 岗位类型',
      'portfolioResult.highlights':       'string[]',
      'portfolioResult.overallSuggestion':'string',
      'portfolioResult.missingMaterials': 'string[]',
      'portfolioResult.structure':        'PageDef[] · [{pageNumber, title, contentSuggestion, visualizationTools, requiredMaterials, isApplicable, excludeReason}]',
    },
    connects_to: [],
    // Page templates by project type — edit here to change the portfolio template per type
    pageTemplatesByType: {
      'physical-product': [
        '封面 / 项目概述', '问题定义', '用户研究', '概念探索（形态学矩阵）',
        '材料与CMF分析', '最终方案', '制造工艺', '原型与测试', '结果与反思', '个人价值与贡献',
      ],
      'digital-product': [
        '封面 / 项目概述', '问题定义', '用户研究', '信息架构与流程',
        '概念探索', '交互设计与原型', '技术实现', '用户测试', '结果与反思', '个人价值与贡献',
      ],
      'ai-product': [
        '封面 / 项目概述', '问题定义', 'AI 解决方案概述', '数据逻辑与架构',
        '模型行为与边界', '产品功能设计', '指标与评估结果', '迭代与反思', '个人价值与贡献',
      ],
      'service-design': [
        '封面 / 项目概述', '问题定义', '利益相关者地图', '用户旅程图',
        '服务蓝图', '方案设计', '触点与原型', '验证与测试', '结果与反思', '个人价值与贡献',
      ],
      'research': [
        '封面 / 项目概述', '研究背景与问题', '研究方法论', '数据收集',
        '亲和图与分类', '洞察综合', '设计建议', '个人价值与贡献',
      ],
      'system-platform': [
        '封面 / 项目概述', '问题定义', '系统架构', '数据流设计',
        '用户流程', '界面/交互设计', '技术实现', '系统测试', '结果与反思', '个人价值与贡献',
      ],
    },
    systemPrompt: `你是作品集结构生成 Agent（Agent 2，自适应）。
你收到了来自 Agent 1（项目分析 Agent）的交接分析，以及原始项目数据，请根据项目类型和目标岗位生成专属的作品集页面结构。

目标岗位：{targetRole}
项目类型（来自Agent1）：{projectType}
岗位类型（来自Agent1）：{roleType}

Agent 1 交接分析：
{handoffAnalysis}

原始项目数据：
{projectContext}

来自求职 Agent 的 JD 反馈（如有）：
{jdFeedback}

自适应规则（必须严格执行）：

1. 根据 projectType 确定基础页面集合：
   - physical-product：包含 CMF分析页、制造工艺页（可选），不包含技术架构页
   - digital-product / system-platform：包含技术架构页、用户流程页，不包含CMF/制造页
   - ai-product：包含AI模型行为页、数据逻辑页、指标结果页，不包含CMF/制造页
   - service-design：包含服务蓝图页、利益相关者地图页、触点分析页，不包含CMF/制造页
   - research：包含研究方法论页、洞察综合页，不包含CMF/制造页

2. 根据 roleType 调整叙事顺序和可视化建议：
   - industrial-designer：形态学矩阵页优先出现，CMF细节丰富
   - ux-ui-designer：用户研究页和交互设计页靠前，原型迭代突出
   - ai-pm：影响/指标页靠前，AI模型评估详细
   - service-designer：服务蓝图页是核心，旅程图必须包含
   - researcher：研究方法论页是核心，洞察综合用亲和图

3. 如果收到 jdFeedback：
   - 若JD强调某能力 → 对应页面提前
   - 若JD提到缺失 → 在missingMaterials中说明

设计规范：
- 6-12页（随项目复杂度自适应，不必强制12页）
- 根据Agent1的narrativeArc调整叙事顺序
- contentSuggestion要具体，直接基于项目内容给出写作建议
- 每页都要包含适合该类型的visualizationTools建议

请生成一套专业的作品集结构，以 JSON 格式输出：
{
  "projectType": "确认的项目类型",
  "roleType": "确认的岗位类型",
  "highlights": ["核心亮点1", "核心亮点2", "核心亮点3"],
  "overallSuggestion": "整体建议（2-3句话，针对具体岗位）",
  "missingMaterials": ["需补充的素材1", "需补充的素材2"],
  "structure": [
    {
      "pageNumber": 1,
      "title": "页面标题",
      "contentSuggestion": "该页面的详细内容建议（3-5句话，指导用户填写）",
      "visualizationTools": ["该页适合的可视化工具"],
      "requiredMaterials": ["需要的素材/截图/图纸"],
      "isApplicable": true,
      "excludeReason": null
    }
  ]
}

只返回 JSON，不加任何其他文字。`,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // GROUP: LEARNING PATH
  // ════════════════════════════════════════════════════════════════════════════

  {
    id:    'path_adjuster',
    name:  'LearningPathAgent',
    group: 'learning',
    description:
      '学习路径调整。根据用户自述的已掌握内容，精确标记对应周任务为已完成（_autoCompleted: true），不改变总任务数量和顺序。',
    model: { temperature: 0.2, maxOutputTokens: 4000 },
    inputSchema: {
      tasks:     'WeeklyTask[] · 当前完整的学习路径任务列表',
      userInput: 'string · 用户描述的已掌握技能或希望跳过的内容',
    },
    outputSchema: {
      tasks: 'WeeklyTask[] · 调整后的任务列表，修改项含 _autoCompleted/_modified 标记',
    },
    connects_to: [],
    systemPrompt: `你是学习路径规划助手。根据用户描述的已掌握内容，精确调整以下周任务列表。

当前任务 JSON：
{tasksJson}

用户描述（已掌握 / 想跳过的内容）：
{userInput}

调整规则（严格遵守）：
1. 找到与用户描述匹配的具体任务条目
2. 将已掌握的学习/练习任务的 action 字段设为空字符串，并添加 "_autoCompleted": true
3. 如果某周的所有任务都被标记，则将该周的 completed 设为 true
4. 对所有修改过的任务添加 "_modified": true 标记
5. 不改变任务的周数、顺序和总数量
6. 不添加新任务
7. 未被提到的任务保持完全不变

只返回修改后的完整 JSON 数组，不要任何解释性文字，格式须与输入一致。`,
  },
];

/**
 * Look up a single agent config by ID.
 * @param {string} id
 * @returns {object | undefined}
 */
export function getAgentConfig(id) {
  return AGENT_CONFIGS.find((c) => c.id === id);
}
