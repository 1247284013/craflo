# Craflo Multi-Agent System — Agent Specification

> **How to use this file**
> This is the **single source of truth** for all Craflo agents.
> Edit the sections marked **[edit]** to change an agent's behavior, prompt, or routing rules.
> The matching implementation is in `backend/src/agents/config.mjs`.
> Rule: if the spec here and the code diverge, this file wins.

---

## Core Design Principle — Adaptive Task Set

> **All tasks, fields, and portfolio pages are dynamically filtered by two axes:**
> 1. **Project Type** — what kind of thing the user is building
> 2. **Target Role** — what career direction the user is heading toward
>
> No agent should ever show CMF to an AI product manager.
> No agent should ever ask for a service blueprint from a mechanical engineer.
> The system classifies both axes first, then only surfaces relevant tasks.

### Project Type Classification [edit]

| Type ID | Examples | Exclude | Focus |
|---------|----------|---------|-------|
| `digital-product` | App, SaaS, platform, dashboard, tool | CMF, manufacturing, materials, fabrication | User flow, tech stack, data architecture, UX |
| `physical-product` | Consumer electronics, furniture, appliance, wearable | — (all fields relevant) | CMF, manufacturing, ergonomics, materials |
| `system-platform` | Digital-physical system, IoT, smart device ecosystem | CMF detail | System architecture, interaction, hardware-software interface |
| `ai-product` | ML model, AI feature, data product, LLM app | CMF, manufacturing | Model behavior, training data, accuracy metrics, AI UX |
| `service-design` | Service blueprint, experience design, org design | CMF, manufacturing, materials | User journey, touchpoints, stakeholder map, service blueprint |
| `research` | User research, trend analysis, design research | Manufacturing, CMF | Methodology, findings, insights, synthesis |
| `branding-visual` | Identity system, brand, graphic design | Manufacturing, CMF, engineering | Visual language, brand guidelines, typography, color system |
| `spatial` | Architecture, interior, exhibition space | — | Spatial analysis, materials, structure, light/flow |

### Target Role Classification [edit]

| Role ID | Examples | Exclude | Emphasize |
|---------|----------|---------|-----------|
| `industrial-designer` | ID, product design | — (full set) | CMF, manufacturing, user research, concept exploration |
| `ux-ui-designer` | UX, interaction, UI | CMF, manufacturing, materials | User flows, wireframes, prototypes, usability testing |
| `ai-pm` | AI product manager, data product | CMF, manufacturing | AI model evaluation, data thinking, feature prioritization, metrics |
| `mechanical-engineer` | ME, structure, manufacturing | User research depth | CAD, FEA, tolerances, manufacturing process, BOM |
| `service-designer` | Service, experience strategy | CMF, manufacturing | Service blueprint, journey mapping, stakeholder analysis |
| `researcher` | User researcher, design researcher | Manufacturing | Research methodology, synthesis, insights, frameworks |
| `creative-director` | Branding, visual, art direction | Manufacturing, CMF | Visual language, brand strategy, storytelling |

### Adaptive Task Filter Logic [edit]

```
adaptTasks(tasks, projectType, targetRole) {
  // Start with full task set
  // 1. Apply project type exclusions
  // 2. Apply target role exclusions
  // 3. Keep intersection of what both allow
  // 4. Boost priority of fields that both axes agree are important
}
```

Example combinations:
- `ai-product` + `ai-pm` → Keep: background, designGoal, challenge, solution, improvement. Remove: CMF, manufacturing, materials
- `physical-product` + `industrial-designer` → Keep all fields
- `digital-product` + `ux-ui-designer` → Keep: background, designGoal, challenge, solution, contribution, improvement. Remove: CMF, manufacturing, materialChoice
- `service-design` + `service-designer` → Keep: background, designGoal, challenge, solution, contribution, improvement. Replace "material" fields with: serviceBlueprint, stakeholderMap, userJourney

---

## System Overview

Craflo's agent system is built around a user's complete career development journey.
Four core agents collaborate in a directed graph with a **feedback loop**:

```
                     ┌──────────────────────────────────────────────┐
                     │              JD / Interview Feedback          │
                     │  (what skills, projects, portfolio should     │
                     │   emphasize based on real job requirements)   │
                     └──────┬──────────────────────┬────────────────┘
                            │ feedback              │ feedback
                            ▼                       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   [1] LearningPathPlannerAgent                                           │
│                                                                          │
│   Triggered at: onboarding · learning path modification entry            │
│   Input: user profile, skills, goals, JD feedback                       │
│   Output: structured task plan → routes tasks to agents 2 / 3 / 4       │
│                                                                          │
└────────────────────┬─────────────────────────────────────────────────────┘
                     │ assigns tasks
         ┌───────────┼───────────────────┐
         ▼           ▼                   ▼
┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐
│             │  │              │  │                      │
│  [2] Project│  │ [3] Portfolio│  │  [4] JobApplication  │
│    Agent    │──▶    Agent     │──▶       Agent          │
│             │  │              │  │                      │
│ content     │  │ visualization│  │ resume + interview   │
│ production  │  │ + layout     │  │ + JD analysis        │
│             │  │              │  │                      │
└─────────────┘  └──────────────┘  └──────────┬───────────┘
      │                │                       │
      │  context       │  structured           │ JD feedback
      └────────────────┘  portfolio            │
                                               ▼
                                    feeds back into agents 1/2/3
```

**Data flow summary:**
- Agent 1 → reads user profile + JD feedback → routes tasks to agents 2/3/4
- Agent 2 → produces project content (text + drawings + docs) → passes context to Agent 3
- Agent 3 → takes Agent 2 output → produces visual layout and narrative structure → passes to Agent 4
- Agent 4 → takes Agent 2+3 output + JD → produces resume and interview prep → feeds insights back to agents 1/2/3

---

## Agent Template

```
id            – unique snake_case identifier
name          – display name
group         – planner | project | portfolio | career
trigger       – when/how this agent is invoked
description   – [edit] what this agent does and why
inputSchema   – { field: 'type · description' }
outputSchema  – { field: 'type · description' }
connects_to   – forward connections (agent IDs this agent sends data to)
feedback_to   – backward connections (agent IDs this agent sends insights back to)
prompt        – [edit] the system prompt used in execute()
```

---

## Agent 1 — `learning_path_planner`

| Field | Value |
|-------|-------|
| **Name** | LearningPathPlannerAgent |
| **Group** | planner |
| **Model** | Gemini 2.5 Flash · temperature 0.3 · maxTokens 2000 |
| **Connects to** | `project_agent`, `portfolio_agent`, `job_application_agent` |
| **Feedback from** | `job_application_agent` |

**Trigger** [edit]
Two entry points:
1. **Onboarding** — when a new user fills in their profile (background, current skills, target role, available time per week).
2. **Modification entry** — when an existing user clicks "Adjust Learning Path" and describes what they already know or want to change.

**Description** [edit]
This is the central planning agent and the **first place where adaptive filtering happens**.

It first classifies the user's target role (see Role Classification table at top of this file), then uses this classification to generate a learning plan that only includes relevant tracks. An AI PM will never see a CMF module. A service designer will never see an FEA module.

The plan breaks down into concrete tasks routed to the right agent:
- Tasks that produce documentation or physical artifacts → route to `project_agent`
- Tasks that require presenting or visualizing project work → route to `portfolio_agent`
- Tasks about career positioning, resume, or interview readiness → route to `job_application_agent`

It also incorporates `jdFeedback` from `job_application_agent` to continuously refine what the plan emphasizes. If the user just analyzed a real JD and found gaps, those gaps get surfaced in the next planning cycle.

The agent should skip skills the user already has and never generate tasks the target role doesn't need.

**Input Schema**
| Field | Type | Description |
|-------|------|-------------|
| `user.background` | string | Academic/professional background |
| `user.currentSkills` | string[] | Skills the user already has |
| `user.targetRole` | string | Desired career role, e.g. `product-design-engineer` |
| `user.weeklyHours` | number | Available learning hours per week |
| `user.goals` | string | What the user wants to achieve |
| `jdFeedback` | object | Optional — insights from `job_application_agent` about skill gaps |
| `existingPlan` | object | Optional — current plan when doing a modification |
| `userModRequest` | string | Optional — what the user wants to change ("I already know CAD") |

**Output Schema**
| Field | Type | Description |
|-------|------|-------------|
| `plan.phases` | Phase[] | Learning phases (e.g. Foundation / Intermediate / Advanced) |
| `plan.phases[].title` | string | Phase name |
| `plan.phases[].weeks` | WeekTask[] | Weekly tasks within this phase |
| `plan.phases[].keyDeliverables` | string[] | What the user should produce by end of phase |
| `plan.routedTasks.toProject` | Task[] | Tasks routed to `project_agent` |
| `plan.routedTasks.toPortfolio` | Task[] | Tasks routed to `portfolio_agent` |
| `plan.routedTasks.toCareer` | Task[] | Tasks routed to `job_application_agent` |

**System Prompt** [edit]
```
你是 Craflo 的学习路径规划 Agent。你的职责是根据用户的身份、技能现状、目标岗位和时间投入，制定一套个性化的学习计划，并将任务分发给正确的执行 Agent。

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

自适应规则（必须严格遵守）：
根据目标岗位自动过滤任务内容：
- industrial-designer / physical-product 类：可包含 CMF、制造工艺、材料选型、工程约束
- ux-ui-designer / digital-product 类：不包含 CMF、制造工艺、材料；包含用户研究、交互设计、原型测试
- ai-pm / ai-product 类：不包含 CMF、制造；包含 AI 产品思维、数据逻辑、模型评估、指标体系
- service-designer / service-design 类：不包含 CMF、制造；包含服务蓝图、利益相关者地图、旅程图
- mechanical-engineer 类：包含 CAD/FEA/制造；减少用户研究深度
- researcher 类：不包含制造；聚焦研究方法论、洞察综合、框架工具

请完成以下工作：
1. 先判断目标岗位类型，确定本次规划适用的任务集合
2. 将学习内容分为 3-4 个阶段（Foundation / Intermediate / Advanced / Pre-job）
3. 每个阶段细化为每周任务，每周任务包含：学习内容、实践任务、可交付成果
4. 判断每个任务应分配给哪个 Agent：
   - 需要输出项目文档、图纸、模型 → project_agent
   - 需要排版、可视化、展示逻辑 → portfolio_agent
   - 需要准备简历、面试、分析 JD → job_application_agent
5. 跳过用户已掌握的技能，不重复已完成的内容
6. 在每个阶段末注明核心交付物
7. 将判断出的 roleType 和 projectTypeHint 加入输出，供其他 Agent 使用

以结构化 JSON 输出，格式如下：
{
  "roleType": "ux-ui-designer | ai-pm | industrial-designer | ...",
  "projectTypeHint": "digital-product | physical-product | ai-product | ...",
  "phases": [
    {
      "title": "阶段名称",
      "durationWeeks": 4,
      "keyDeliverables": ["交付物1", "交付物2"],
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
}
```

---

## Agent 2 — `project_agent`

| Field | Value |
|-------|-------|
| **Name** | ProjectAgent |
| **Group** | project |
| **Model** | Gemini 2.5 Flash · temperature 0.5 · maxTokens 3000 |
| **Connects to** | `portfolio_agent` |
| **Feedback from** | `job_application_agent` |

**Trigger** [edit]
- When `learning_path_planner` routes a task with `routeTo: "project_agent"`
- When the user interacts with the Project Workshop canvas (AI Suggest, AI Complete field, Analyze)
- When the user clicks "Transfer to Portfolio" (triggers handoff to `portfolio_agent`)

**Description** [edit]
The Project Agent is responsible for **content production**. This is the second place where adaptive filtering happens.

When the agent first encounters a project, it classifies the **project type** (see Project Type Classification table at top). It then only surfaces fields and sub-chains relevant to that type. A digital platform project will never see CMF or manufacturing fields. A service design project will get service blueprint and touchpoint fields instead.

The field set is also influenced by `targetRole` and `jdFeedback`:
- If `jdFeedback` says "JD emphasizes structural analysis" → boost the `mainChallenge` field to surface engineering depth
- If `targetRole` is `ux-ui-designer` → replace `materialChoice` with `interactionFlow`, replace `manufacturing` with `prototypeIteration`

Content types this agent works with (filtered by project type):
- **All types**: background, designGoal, mainChallenge, solutionComparison, personalContribution, improvementIdeas
- **Physical product / Industrial design only**: materialChoice, manufacturingConsideration, ergonomics, CMF
- **Digital / AI product only**: techStack, dataArchitecture, aiModelBehavior, userFlowDescription
- **Service design only**: serviceBlueprint, stakeholderMap, touchpointAnalysis
- **All types (custom)**: extraFields — user can always add any field they need

When passing context to `portfolio_agent`, the handoff also includes `projectType` and `roleType` so the portfolio agent can adapt its page structure accordingly.

**Input Schema**
| Field | Type | Description |
|-------|------|-------------|
| `task` | Task | Task routed from `learning_path_planner` (includes `roleType` and `projectTypeHint`) |
| `projectName` | string | Name of the project being worked on |
| `existingFields` | object | Already-filled project fields |
| `fieldToComplete` | string | Which field to auto-complete (if triggered by AI Suggest) |
| `roleType` | string | From `learning_path_planner` output — used for adaptive filtering |
| `jdFeedback` | object | Optional — from `job_application_agent` (what to emphasize) |

**Output Schema**
| Field | Type | Description |
|-------|------|-------------|
| `project.projectType` | string | Classified project type (set on first analysis) |
| `project.background` | string | Project background research (500–700 words) |
| `project.designGoal` | string | Design goals (measurable, clear) |
| `project.mainChallenge` | string | Core challenge |
| `project.solutionComparison` | string | Solution exploration and selection rationale |
| `project.personalContribution` | string | User's individual contribution |
| `project.materialChoice` | string | Material selection **(physical product only)** |
| `project.manufacturingConsideration` | string | Manufacturing notes **(physical product only)** |
| `project.improvementIdeas` | string | Reflection and next iterations |
| `project.aiFeedback` | string | Completeness score + quality review |
| `project.extraFields` | object | Dynamic fields added by adaptive logic or user |
| `handoffContext` | object | Structured summary passed to `portfolio_agent` (includes projectType + roleType) |

**Handoff Context Structure** (what gets sent to `portfolio_agent`) [edit]
```json
{
  "projectName":    "...",
  "completionScore": 85,
  "coreStrengths":  ["强调用户研究", "材料创新"],
  "narrativeArc": {
    "problem":   "问题描述",
    "process":   "设计过程",
    "solution":  "最终方案",
    "outcome":   "结果与价值"
  },
  "missingGaps":    ["缺少使用场景图片", "结果数据不足"],
  "portfolioAngle": "建议叙事角度"
}
```

**Adaptive Field Set by Project Type** [edit]
```
projectType       SHOW these fields                           HIDE these fields
─────────────────────────────────────────────────────────────────────────────────
physical-product  background, designGoal, challenge,          —
                  solution, contribution, materialChoice,
                  manufacturing, improvement, analysis

digital-product   background, designGoal, challenge,          materialChoice
system-platform   solution, contribution, techStack,          manufacturing
                  dataArchitecture, improvement, analysis

ai-product        background, designGoal, challenge,          materialChoice
                  solution, aiModelBehavior, dataLogic,       manufacturing
                  metrics, improvement, analysis

service-design    background, designGoal, challenge,          materialChoice
                  solution, serviceBlueprint,                 manufacturing
                  stakeholderMap, touchpoints, improvement

research          background, designGoal, methodology,        materialChoice
                  findings, insights, contribution,           manufacturing
                  improvement, analysis
```

**Sub-agents / Chains** [edit]
This agent internally uses several sub-chains (all defined in config.mjs):
| Sub-chain ID | Trigger | Adaptive? | Description |
|---|---|---|---|
| `background_researcher` | First field, only project name exists | — | Generates 500–700 word background research |
| `node_suggester` | After background is filled | **Yes** | Classifies project type first, then suggests next 3 canvas nodes from the allowed set for that type. Physical products can get materialChoice/manufacturing; digital products get techStack/userFlow |
| `field_completion` | User clicks "AI Suggest" on any field | **Yes** | Generates 300–500 word field content, adjusting technical depth and terminology based on projectType and roleType |
| `project_analyzer` | User triggers "AI Analyze" | — | Scores completeness based on what fields are expected for this project type |
| `handoff_analysis` | User clicks "Transfer to Portfolio" | **Yes** | Identifies projectType + roleType, then builds structured handoff context with these classifications for Agent 3 |

---

## Agent 3 — `portfolio_agent`

| Field | Value |
|-------|-------|
| **Name** | PortfolioAgent |
| **Group** | portfolio |
| **Model** | Gemini 2.5 Flash · temperature 0.4 · maxTokens 3000 |
| **Connects to** | `job_application_agent` |
| **Feedback from** | `job_application_agent` |

**Trigger** [edit]
- When `project_agent` sends a handoff context (user clicks "Transfer to Portfolio")
- When `learning_path_planner` routes a task with `routeTo: "portfolio_agent"`
- When the user manually creates or edits a portfolio in Portfolio Studio

**Description** [edit]
The Portfolio Agent transforms raw project content from `project_agent` into a **visually structured, narratively compelling portfolio**. This is the third place where adaptive filtering happens.

The agent reads `projectType` and `roleType` from the `handoffContext` to decide:
1. **Which pages to include** — a physical product needs CMF and manufacturing pages; an AI product needs model behavior and metrics pages; a service design needs service blueprint and touchpoint pages
2. **Which visualization tools to suggest per page** — physical products use morphological matrix and material comparison; digital products use user flow diagrams and wireframe progression; service design uses service blueprints and journey maps
3. **How to order the narrative** — engineer-facing portfolios lead with problem definition and technical depth; PM-facing portfolios lead with insight and impact; design-facing portfolios lead with concept exploration

The agent also receives `jdFeedback` to further adjust:
- If JD values systems thinking → move morphological matrix page earlier
- If JD emphasizes impact/metrics → give more weight to results page
- If JD is about AI → add AI model evaluation page

This agent thinks like a **design director who knows exactly which role they're hiring for**.

**Input Schema**
| Field | Type | Description |
|-------|------|-------------|
| `handoffContext` | object | Full output of `project_agent`'s handoff |
| `project` | object | Original project data |
| `targetRole` | string | Target career role |
| `jdFeedback` | object | Optional — from `job_application_agent` |
| `task` | Task | Optional — task routed from `learning_path_planner` |

**Output Schema**
| Field | Type | Description |
|-------|------|-------------|
| `portfolio.highlights` | string[] | 3 key strengths to emphasize throughout |
| `portfolio.overallSuggestion` | string | Overall narrative strategy (2–3 sentences) |
| `portfolio.missingMaterials` | string[] | Assets user still needs to gather |
| `portfolio.structure` | PageDef[] | Page-by-page structure |
| `portfolio.structure[].pageNumber` | number | Sequence |
| `portfolio.structure[].title` | string | Page title |
| `portfolio.structure[].contentSuggestion` | string | What to write and how (3–5 sentences) |
| `portfolio.structure[].visualizationTools` | string[] | Suggested visualization methods for this page |
| `portfolio.structure[].requiredMaterials` | string[] | Photos, drawings, screenshots needed |
| `portfolioHandoff` | object | Condensed summary passed to `job_application_agent` |

**Visualization Tool Reference — Adaptive by Project Type** [edit]
```
Tool              Best for project types          When to suggest
────────────────────────────────────────────────────────────────────────
雷达图            all                             技能/能力多维度展示，个人竞争力分析
形态学矩阵        physical, digital, service      方案探索与系统性思维展示
用户旅程图        digital, service, ux            用户研究过程可视化，痛点识别
竞品分析表        all                             设计洞察与差异化策略
亲和图            service, research, ux           用户研究分类与聚类
SWOT 分析         all                             项目定位与策略
流程图            digital, system, service        工作流、系统架构、服务流程
效果对比图        physical, digital               前后对比、方案比较
时间轴            all                             项目进程、迭代历程
材料对比表        physical (only)                 材料属性、成本、适用性
工艺流程图        physical (only)                 制造工艺路线
服务蓝图          service (only)                  前台/后台/支撑活动的全景图
利益相关者地图    service, research               多方关系与影响力分析
AI 模型评估表     ai-product (only)               模型指标、准确率、边界case
数据架构图        digital, system, ai-product     系统数据流与存储结构
原型迭代对比      digital, service, ux            各版本原型的演进逻辑
```
系统架构图          产品/服务生态可视化
```

**Page Ordering Convention** [edit]
```
Default (adjust based on handoffContext.narrativeArc):
1.  封面 / 项目概述
2.  问题定义与研究背景
3.  用户研究与洞察
4.  设计概念探索（形态学矩阵 / 草图）
5.  最终方案呈现
6.  技术实现细节（材料 / 工艺 / 结构）
7.  原型与测试
8.  结果与反思
9.  个人贡献与价值
```

**System Prompt** [edit]
```
你是 Craflo 的作品集规划 Agent。你像一位资深设计总监，能根据项目类型和目标岗位定制最具说服力的展示方式。

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
1. 先判断 projectType 和 roleType，确定本次作品集的页面集合
2. 决定作品集的叙事结构（6-12页，数量随项目复杂度自适应），根据项目类型和岗位调整页面顺序
3. 为每一页推荐最合适的可视化工具（严格按自适应规则选择）
4. 给出具体的内容建议，直接指导用户写什么、展示什么
5. 指出还缺哪些素材（图片/图纸/数据）
6. 确保整体叙事逻辑服务于目标岗位的核心胜任力

以 JSON 格式输出：
{
  "projectType": "识别出的项目类型",
  "roleType": "识别出的岗位类型",
  "highlights": ["核心亮点1", "核心亮点2", "核心亮点3"],
  "overallSuggestion": "整体叙事策略（2-3句话，针对具体岗位）",
  "missingMaterials": ["缺失素材1", "缺失素材2"],
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

只返回 JSON，不加任何其他文字。
```

---

## Agent 4 — `job_application_agent`

| Field | Value |
|-------|-------|
| **Name** | JobApplicationAgent |
| **Group** | career |
| **Model** | Step 1: Gemini 2.5 Flash Vision (JD 解析) · Step 2: Gemini 2.5 Flash (temp 0.4, maxTokens 3000) |
| **Connects to** | *(end of forward chain)* |
| **Feedback to** | `learning_path_planner`, `project_agent`, `portfolio_agent` |

**Trigger** [edit]
- **主入口**：用户在"简历优化"页面上传 JD（图片截图 或 粘贴文字）
- 当 `portfolio_agent` 传入已完成的作品集摘要
- 当 `learning_path_planner` 路由任务到此 Agent
- 当用户进入"模拟面试"模式

**Description** [edit]
该 Agent 分两步执行，JD 解析是强制第一步：

**Step 1 — JD 识别与结构化** [edit]
用户上传 JD 来源可以是：
- **图片截图**（招聘网站截图、PDF 截图）→ 使用 Gemini Vision 提取文本并解析
- **粘贴文字**（直接复制 JD 内容）→ 直接解析

解析输出一个结构化的 `parsedJD` 对象，包含岗位名称、公司信息、技能要求、经验要求、加分项等。这个对象是后续所有分析的基础。

**Step 2 — 基于结构化 JD 生成结果**（前向 + 反馈）

前向输出：
1. 生成与 JD 高度匹配的定制简历
2. 提取面试关键话术（STAR 结构）
3. 给出 JD 与用户当前内容的差距分析

反馈输出（传回其他 Agent）：
1. → `learning_path_planner`：JD 要求的技能缺口 → 补充到学习计划
2. → `project_agent`：JD 强调的能力 → 在项目记录中补强对应内容
3. → `portfolio_agent`：JD 的叙事偏好 → 调整作品集页面顺序和侧重

**Input Schema**
| Field | Type | Description |
|-------|------|-------------|
| `jdInput.type` | string | `'image'` 或 `'text'` |
| `jdInput.imageBase64` | string | 图片截图的 base64 编码（type=image 时必填）|
| `jdInput.text` | string | JD 原文（type=text 时必填）|
| `projectHandoff` | object | 来自 `project_agent` |
| `portfolioHandoff` | object | 来自 `portfolio_agent` |
| `userProfile` | object | 用户当前技能与背景 |

**Step 1 Output — `parsedJD`** (internal, passed to Step 2)
| Field | Type | Description |
|-------|------|-------------|
| `parsedJD.jobTitle` | string | 岗位名称 |
| `parsedJD.company` | string | 公司名称（如有）|
| `parsedJD.requiredSkills` | string[] | 必须具备的技能 |
| `parsedJD.preferredSkills` | string[] | 加分项技能 |
| `parsedJD.experienceRequirements` | string[] | 经验要求 |
| `parsedJD.responsibilities` | string[] | 核心职责 |
| `parsedJD.keyCompetencies` | string[] | JD 反复强调的核心胜任力 |
| `parsedJD.rawText` | string | 从图片中提取的原始文本（type=image 时）|

**Step 2 Output Schema — Forward**
| Field | Type | Description |
|-------|------|-------------|
| `resume.summary` | string | 个人简介（针对 JD 定制，3-4 句）|
| `resume.skills` | string[] | 技能列表（按 JD 优先级排序）|
| `resume.projects` | object[] | 项目经历（含亮点和可量化成果）|
| `resume.tailoringNotes` | string | 说明简历如何针对该 JD 进行了定制 |
| `interviewPrepPoints` | string[] | STAR 结构面试话术要点 |
| `jdGapAnalysis.missingSkills` | string[] | JD 需要但用户缺少的技能 |
| `jdGapAnalysis.missingExperiences` | string[] | JD 需要但用户缺少的经历 |
| `jdGapAnalysis.strengths` | string[] | 用户已匹配的优势 |

**Step 2 Output Schema — Feedback**
| Field | Type | Description |
|-------|------|-------------|
| `feedback.toLearningPath` | string | 学习路径应增加/调整的具体技能或工具名 |
| `feedback.toProject` | string | 项目文档应补强的字段或内容类型 |
| `feedback.toPortfolio` | string | 作品集应如何调整叙事顺序或页面侧重 |

**Step 1 System Prompt — JD 解析** [edit]
```
你是一个 JD（职位描述）解析专家。请从以下职位描述中提取结构化信息。

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
}
```

**Step 2 System Prompt — 生成结果** [edit]
```
你是 Craflo 的求职面试 Agent。你同时扮演两个角色：
1. 向前：基于用户的项目内容和作品集以及已解析的 JD，生成一份高度匹配的简历和面试话术。
2. 向后：将 JD 与用户现有内容的差距，转化为具体行动反馈给学习路径、项目、作品集 Agent。

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
}
```

---

## Inter-Agent Data Flow

### Forward Pass (learning → production → presentation → application)

```
1. LearningPathPlannerAgent
   └─► routedTasks.toProject    ──► ProjectAgent.input.task
   └─► routedTasks.toPortfolio  ──► PortfolioAgent.input.task
   └─► routedTasks.toCareer     ──► JobApplicationAgent.input.task

2. ProjectAgent
   └─► handoffContext            ──► PortfolioAgent.input.handoffContext

3. PortfolioAgent
   └─► portfolioHandoff          ──► JobApplicationAgent.input.portfolioHandoff

4. JobApplicationAgent
   └─► resume + interviewPrep    ──► (displayed in Resume Optimizer / Mock Interview)
```

### Feedback Pass (application insights → back to other agents)

```
4. JobApplicationAgent
   └─► feedback.toLearningPath  ──► LearningPathPlannerAgent.input.jdFeedback
   └─► feedback.toProject       ──► ProjectAgent.input.jdFeedback
   └─► feedback.toPortfolio     ──► PortfolioAgent.input.jdFeedback
```

---

## Adding a New Agent

1. Add a new section to this file following the template at the top.
2. Create `backend/src/agents/<group>/<agentId>.mjs`:
   ```js
   import { BaseAgent } from '../base.mjs';
   import { getAgentConfig } from '../config.mjs';

   const CFG = getAgentConfig('your_agent_id');

   class YourAgent extends BaseAgent {
     constructor() { super(CFG); }

     async execute(input) {
       // ... LLM call using CFG.systemPrompt
       return { outputField: result };
     }
   }

   export const yourAgent = new YourAgent();
   ```
3. Add to `config.mjs` (matching this spec).
4. Register in `backend/src/agents/registry.mjs`.
5. Wire into a graph or add an API route in `backend/src/index.mjs`.

---

## Agent 5 — `knowledge_base_agent`

| Field | Value |
|-------|-------|
| **Name** | KnowledgeBaseAgent |
| **Group** | rag |
| **Model** | Gemini 2.5 Flash · temperature 0.1–0.5（内部多步） |
| **Connects to** | *(被其他 4 个 Agent 调用，不主动发起连接)* |

**Description** [edit]
对外是一个完整的"知识库问答"能力，所有 4 个核心 Agent 均可调用它。
内部通过一个 7 节点的 LangGraph 管线实现：
意图识别 → Query 改写 → 混合检索（向量+关键词）→ 重排 → 质量判定 → 生成（或回退生成）。
这些节点是实现细节，不作为独立 Agent 暴露。

**Input Schema**
| Field | Type | Description |
|-------|------|-------------|
| `query` | string | 用户自然语言问题 |
| `lang` | string | `zh` 或 `en` |

**Output Schema**
| Field | Type | Description |
|-------|------|-------------|
| `answer` | string | Markdown 格式专业回答 |
| `relatedNodes` | KnowledgeNode[] | 相关知识节点列表 |
| `relatedPosts` | CommunityPost[] | 相关社区帖子列表 |
| `recommendations` | string[] | 3 条推荐追问 |

**Internal Pipeline** (implementation detail, not separate agents)
```
query_analyzer → query_rewriter → hybrid_retriever → reranker → doc_grader
                                                                      │
                                               ┌────────────────────────────┐
                                               ▼                           ▼
                                    knowledge_generator         fallback_generator
                                    (有相关文档时)               (无相关文档时)
```

---

## LLM Reference

All agents use `gemini-2.5-flash` via `@langchain/google-genai`.
Shared instances are in `backend/src/agents/llms.mjs`.

| Instance | Temperature | maxTokens | Used by |
|----------|-------------|-----------|---------|
| `fastLLM` | 0.1 | 400 | query_analyzer, query_rewriter |
| `plannerLLM` | 0.3 | 2000 | learning_path_planner |
| `projectLLM` | 0.5 | 3000 | project_agent, project sub-chains |
| `portfolioLLM` | 0.4 | 3000 | portfolio_agent |
| `careerLLM` | 0.4 | 3000 | job_application_agent |
| `genLLM` | 0.5 | 2000 | knowledge_generator, fallback_generator |

To change a model or parameters, edit `backend/src/agents/llms.mjs`.

---

## Agent 6 — `learning_path_orchestrator` · LearningPathOrchestratorAgent

> **File**: `backend/src/agents/learning/pathOrchestrator.mjs`
> **Group**: `learning`
> **Role**: 整个职业成长系统的核心调度 Agent。接受用户目标，生成完整学习路径，并主动调用其他 Agent 完成目标匹配、项目规划等子任务。

### Input Schema

| Field | Type | Description |
|-------|------|-------------|
| `mode` | `'job' \| 'school'` | 求职或申请学校模式 |
| `profile` | `string` | 用户背景描述（学历、经历） |
| `currentSkills` | `string[]` | 当前已有技能标签 |
| `direction` | `string` | 目标方向 / 目标专业 |
| `jdContext` | `string?` | 上传的 JD 或专业关键词 |
| `preferences` | `string?` | 偏好（城市/规模/国家等） |

### Output Schema

| Field | Type | Description |
|-------|------|-------------|
| `weeklyTasks` | `WeeklyTask[]` | 完整的周学习路径 |
| `targets` | `Target[]` | 匹配的目标公司或院校 |
| `tiers` | `{ reach, target, safety }` | 按难度分档的目标列表 |
| `resumeTips` | `string` | 通用简历调整建议 |
| `portfolioTips` | `string` | 通用作品集调整建议 |
| `agentCallLog` | `{ agent, status, output }[]` | 编排过程中调用的 Agent 记录 |
| `orchestration` | `{ suggestProjects, portfolioFocus }` | 下游 Agent 的上下文提示 |

### Orchestration Flow [edit]

```
LearningPathOrchestratorAgent
  ├── Step 1: plannerLLM → generate weeklyTasks + orchestration hints
  └── Step 2: targetMatcherAgent.execute() → targets / tiers
       (future) Step 3: projectAgent.initTasks() → project scaffolding
       (future) Step 4: portfolioAgent.outline() → portfolio structure
```

### System Prompt [edit]

Generates `weeklyTasks` array + `orchestration` JSON in one LLM call. See `pathOrchestrator.mjs` for full prompt.

### Connects To

`target_matcher` → `project_agent` → `portfolio_agent` → `knowledge_base`

---

## Agent 7 — `target_matcher` · TargetMatcherAgent

> **File**: `backend/src/agents/career/targetMatcher.mjs`
> **Group**: `career`
> **Role**: 根据用户背景和目标方向，推荐目标公司（求职）或目标院校（申请），分冲刺/目标/保底三档，并给出简历和作品集微调建议。

### Mode: `job` — 目标公司匹配

| Field | Description |
|-------|-------------|
| `name` | 公司名 |
| `industry` | 行业 |
| `size` | 规模（大厂/中型/独角兽/初创） |
| `tier` | `reach \| target \| safety` |
| `matchScore` | 匹配度 0-100 |
| `roles` | 适合的岗位方向 |
| `highlights` | 公司特点一句话 |
| `resumeTip` | 针对该公司的简历/作品集重点 |
| `city` | 主要城市 |

### Mode: `school` — 目标院校匹配

| Field | Description |
|-------|-------------|
| `name` | 院校名（中英文） |
| `country` | 国家 |
| `program` | 具体项目名 |
| `tier` | `reach \| target \| safety` |
| `offerChance` | 录取几率 0-100 |
| `deadline` | 申请截止时间 |
| `highlights` | 项目特点一句话 |
| `portfolioTip` | 作品集需要体现的方向 |
| `tuition` | 学费范围 |

### Tier Definition [edit]

| Tier | 求职 | 申请学校 |
|------|------|---------|
| `reach` | 知名大厂、竞争激烈 | 顶尖院校、录取率低 |
| `target` | 最匹配、最合理的核心目标 | 最合理的核心申请目标 |
| `safety` | 基本确定能拿面试 | 基本确定能拿 offer |

### Connects To

`learning_path_orchestrator`
