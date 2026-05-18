import type {
  SkillAssessment,
  SkillDimension,
  LearningPath,
  WeeklyTask,
  LearningPhase,
  Portfolio,
  PortfolioPage,
  ResumeItem,
  InterviewSession,
  InterviewQuestion,
  Project,
  ProjectArchive,
} from '../types';
import type { TargetRole, UserProfile } from '../types';
import { PROJECT_TEMPLATES } from './roleData';

const SKILL_DIMENSIONS = [
  { id: 'cad', name: '软件建模能力', description: 'CAD三维建模与曲面建模能力' },
  { id: 'drawing', name: '工程制图能力', description: '工程图纸输出与规范' },
  { id: 'structure', name: '结构设计能力', description: '塑胶件、钣金件、连接方式设计' },
  { id: 'materials', name: '材料工艺能力', description: '材料选型、加工工艺、表面处理' },
  { id: 'process', name: '产品开发流程', description: '从需求到量产的完整产品开发理解' },
  { id: 'project', name: '项目实践能力', description: '实际项目经验与问题解决能力' },
  { id: 'portfolio', name: '作品集表达能力', description: '项目逻辑整理与展示表达' },
  { id: 'interview', name: '面试表达能力', description: '工程逻辑表达与面试沟通能力' },
];

const TARGET_LEVELS: Record<TargetRole, number[]> = {
  'structural-design-engineer': [4, 4, 5, 4, 3, 4, 3, 3],
  'product-design-engineer': [3, 3, 3, 3, 4, 4, 4, 4],
  'smart-hardware-engineer': [4, 3, 4, 4, 4, 4, 3, 3],
  'industrial-design-engineer': [4, 2, 3, 3, 3, 3, 5, 4],
  'mechanical-design-engineer': [5, 5, 4, 4, 3, 4, 3, 3],
  'design-engineering-intern': [2, 2, 2, 2, 2, 2, 2, 2],
};

function generateCurrentLevels(profile: Partial<UserProfile>): number[] {
  const base = [
    Math.min(5, (profile.softwareSkills?.cad ?? 0) + (profile.projectCount ?? 0 > 2 ? 1 : 0)),
    Math.min(5, (profile.softwareSkills?.engineering_drawing ?? 0)),
    Math.min(5, Math.max(0, (profile.workYears ?? 0) - 1 + (profile.hasManufacturingExperience ? 1 : 0))),
    Math.min(5, Math.max(0, (profile.workYears ?? 0) + (profile.hasManufacturingExperience ? 2 : 0))),
    Math.min(5, Math.max(0, (profile.workYears ?? 0))),
    Math.min(5, Math.max(1, (profile.projectCount ?? 0))),
    Math.min(5, Math.max(0, (profile.projectCount ?? 0) - 1)),
    Math.min(5, Math.max(0, (profile.workYears ?? 0))),
  ];
  return base;
}

export function generateSkillAssessment(
  profile: Partial<UserProfile>,
  role: TargetRole
): SkillAssessment {
  const currentLevels = generateCurrentLevels(profile);
  const targetLevels = TARGET_LEVELS[role] ?? TARGET_LEVELS['design-engineering-intern'];

  const dimensions: SkillDimension[] = SKILL_DIMENSIONS.map((dim, i) => ({
    id: dim.id,
    name: dim.name,
    currentLevel: Math.min(5, currentLevels[i]) as 0|1|2|3|4|5,
    targetLevel: targetLevels[i] as 0|1|2|3|4|5,
    description: dim.description,
  }));

  const strengths = dimensions
    .filter((d) => d.currentLevel >= d.targetLevel - 1 && d.currentLevel >= 2)
    .map((d) => d.name);

  const weaknesses = dimensions
    .filter((d) => d.targetLevel - d.currentLevel >= 2)
    .sort((a, b) => (b.targetLevel - b.currentLevel) - (a.targetLevel - a.currentLevel))
    .map((d) => d.name);

  const priorityAreas = weaknesses.slice(0, 3);

  const gapText = weaknesses.length === 0
    ? '你的能力与目标岗位已十分接近，继续深化项目经验即可。'
    : `你距离目标岗位还有明显差距，建议优先补齐 ${priorityAreas.join('、')}。${
        profile.identity === 'student'
          ? '作为在校学生，你可以通过项目实战快速积累这些能力。'
          : '你已有一定工作经验，可以通过针对性项目来补强薄弱环节。'
      }`;

  return { dimensions, strengths, weaknesses, priorityAreas, gapSummary: gapText };
}

function createWeeklyTask(week: number, role: TargetRole, totalWeeks: number): WeeklyTask {
  const progress = week / totalWeeks;

  type PhaseKey = 'early' | 'mid' | 'late';
  const phase: PhaseKey = progress < 0.33 ? 'early' : progress < 0.67 ? 'mid' : 'late';

  const roleTaskMap: Record<TargetRole, Record<PhaseKey, Partial<WeeklyTask>>> = {
    'structural-design-engineer': {
      early: {
        title: '工程基础与结构认知',
        objective: '建立结构设计的基础认知，了解材料与工艺',
        learningContent: ['塑胶件设计原则（壁厚、加强筋、卡扣）', '注塑工艺基础', '工程图规范入门'],
        practicalTasks: ['分析一款消费电子产品的外壳结构', '绘制一个上下壳连接草图'],
        deliverables: ['结构分析报告', '连接方案草图'],
        resources: ['SolidWorks官方教程', '《工业产品设计》相关章节', 'B站结构设计拆解视频'],
      },
      mid: {
        title: '结构设计实战',
        objective: '完成核心结构方案设计，掌握DFM分析',
        learningContent: ['DFM/DFA分析方法', '钣金件设计基础', '公差与配合'],
        practicalTasks: ['完成项目主体结构3D建模', '输出工程图（关键件）'],
        deliverables: ['3D结构模型', '工程图草图', 'DFM检查列表'],
        resources: ['DFM设计指南', 'SolidWorks装配体教程'],
      },
      late: {
        title: '作品集与面试准备',
        objective: '整理项目成果，形成可投递的作品集和简历',
        learningContent: ['作品集逻辑构建', '简历项目描述写法', '结构面试常见问题'],
        practicalTasks: ['制作项目作品集页面', '撰写简历项目描述', '进行模拟面试'],
        deliverables: ['作品集初稿', '简历项目描述', '面试问题回答稿'],
        resources: ['优秀结构工程师作品集案例', '面试题库'],
      },
    },
    'product-design-engineer': {
      early: {
        title: '产品思维与用户研究',
        objective: '建立以用户为中心的产品设计思维',
        learningContent: ['用户研究方法', '产品功能定义', '竞品分析'],
        practicalTasks: ['完成目标用户访谈或调研', '输出产品功能需求列表'],
        deliverables: ['用户需求分析报告', '功能优先级矩阵'],
        resources: ['《用户体验要素》', 'IDEO设计方法工具包'],
      },
      mid: {
        title: '方案设计与工程实现',
        objective: '输出完整设计方案，验证工程可行性',
        learningContent: ['概念方案比较方法', '结构可行性分析', 'CMF设计'],
        practicalTasks: ['完成2-3个概念方案', '与结构工程师确认可行性'],
        deliverables: ['概念方案PPT', '最终方案3D模型', 'CMF说明'],
        resources: ['产品设计案例库', 'Behance设计参考'],
      },
      late: {
        title: '原型测试与成果整理',
        objective: '验证设计，整理完整项目材料',
        learningContent: ['原型测试方法', '设计迭代逻辑', '项目复盘'],
        practicalTasks: ['制作简单原型验证核心功能', '整理完整项目文档'],
        deliverables: ['原型测试报告', '完整项目作品集'],
        resources: ['原型工具教程', '作品集排版参考'],
      },
    },
    'smart-hardware-engineer': {
      early: {
        title: '智能硬件认知与结构基础',
        objective: '了解智能硬件产品特点，建立结构设计基础',
        learningContent: ['智能硬件产品构成', '电子堆叠基础概念', '基本结构设计原则'],
        practicalTasks: ['拆解分析一款智能硬件产品', '识别内部各功能模块'],
        deliverables: ['产品拆解分析报告', '内部结构示意图'],
        resources: ['智能硬件产品拆解视频', '《嵌入式产品设计》'],
      },
      mid: {
        title: '结构方案与电子协同设计',
        objective: '完成结构与电子堆叠协同设计',
        learningContent: ['PCB布局了解', '天线结构设计', '散热与防水方案'],
        practicalTasks: ['完成产品内部结构布局设计', '完成防水密封方案'],
        deliverables: ['内部结构3D模型', '电子堆叠说明', '密封方案图'],
        resources: ['防水等级标准介绍', '散热设计基础'],
      },
      late: {
        title: '整体方案完善与作品集',
        objective: '完成完整产品设计，整理作品集',
        learningContent: ['CMF设计与外观表达', '作品集结构逻辑', '智能硬件面试重点'],
        practicalTasks: ['完成整体设计方案', '制作项目作品集'],
        deliverables: ['完整产品设计方案', '作品集', '简历描述'],
        resources: ['智能硬件作品集案例', 'CMF设计趋势'],
      },
    },
    'industrial-design-engineer': {
      early: {
        title: '工程基础认知',
        objective: '补充工程基础知识，理解材料与制造',
        learningContent: ['常用材料认知（塑料、金属、玻璃）', '注塑/冲压/压铸工艺基础', '公差基础'],
        practicalTasks: ['分析一款产品的材料选择逻辑', '了解注塑件设计限制'],
        deliverables: ['材料工艺分析报告'],
        resources: ['《材料与工业设计》', '制造工艺视频教程'],
      },
      mid: {
        title: '工程化造型设计',
        objective: '将造型方案与工程实现结合',
        learningContent: ['造型可制造性分析', '结构与外观协同设计', 'Rhino参数化建模'],
        practicalTasks: ['对现有造型方案进行工程化改良', '与SolidWorks建立对应结构'],
        deliverables: ['工程化改良造型文件', '改良说明文档'],
        resources: ['Rhino工程建模教程', 'SolidWorks基础'],
      },
      late: {
        title: '作品集工程深度提升',
        objective: '提升作品集工程表达能力',
        learningContent: ['工程作品集呈现方式', '材料工艺说明写法', '面试工程问题准备'],
        practicalTasks: ['为每个作品集项目补充工程说明', '准备材料工艺问题回答'],
        deliverables: ['工程强化版作品集', '材料工艺说明文档'],
        resources: ['工程方向ID作品集案例'],
      },
    },
    'mechanical-design-engineer': {
      early: {
        title: '机构分析与设计基础',
        objective: '掌握常用机构原理与分析方法',
        learningContent: ['连杆机构、凸轮机构基础', '传动系统选型', '机构自由度分析'],
        practicalTasks: ['分析一个现有产品的运动机构', '绘制机构运动简图'],
        deliverables: ['机构分析报告', '运动简图'],
        resources: ['《机械原理》教材', 'SolidWorks Motion教程'],
      },
      mid: {
        title: '机构设计与仿真验证',
        objective: '完成机构设计并通过仿真验证',
        learningContent: ['SolidWorks Motion仿真', '强度计算基础', '公差与配合设计'],
        practicalTasks: ['完成核心机构3D设计', '进行运动仿真验证'],
        deliverables: ['机构3D模型', '仿真结果截图', '强度计算书'],
        resources: ['SolidWorks仿真教程', '《机械设计手册》'],
      },
      late: {
        title: '工程图与项目整理',
        objective: '输出规范工程图，整理机构设计作品集',
        learningContent: ['工程图规范（GB标准）', '机构设计作品集逻辑', '技术面试准备'],
        practicalTasks: ['输出关键件工程图', '制作机构设计作品集'],
        deliverables: ['工程图', '作品集', '技术面试问答准备'],
        resources: ['GB制图标准', '机械工程师面试题库'],
      },
    },
    'design-engineering-intern': {
      early: {
        title: '基础软件与工程认知',
        objective: '掌握核心软件工具，建立工程认知',
        learningContent: ['SolidWorks基础建模', '工程图基础', '常用材料与工艺入门'],
        practicalTasks: ['完成10个SolidWorks基础练习', '临摹一个简单产品的工程图'],
        deliverables: ['建模练习文件', '工程图临摹'],
        resources: ['SolidWorks官方教程', 'B站工程图教程'],
      },
      mid: {
        title: '项目实战训练',
        objective: '完成一个完整的产品设计项目',
        learningContent: ['产品结构设计流程', '设计说明书写法', '作品集基本逻辑'],
        practicalTasks: ['选择一个项目模板开始设计', '完成主体建模'],
        deliverables: ['项目3D模型', '项目说明文档'],
        resources: ['项目模板参考', '优秀实习作品集案例'],
      },
      late: {
        title: '作品集整理与求职准备',
        objective: '形成初步作品集，准备求职材料',
        learningContent: ['作品集排版基础', '简历写法', '实习面试常见问题'],
        practicalTasks: ['制作作品集初稿', '完成简历', '模拟面试练习'],
        deliverables: ['作品集初稿', '简历', '面试准备清单'],
        resources: ['作品集模板', '实习面试题库'],
      },
    },
  };

  const roleData = roleTaskMap[role] ?? roleTaskMap['design-engineering-intern'];
  const phaseData = roleData[phase];

  return {
    week,
    title: phaseData.title ?? `第${week}周任务`,
    objective: phaseData.objective ?? '',
    learningContent: phaseData.learningContent ?? [],
    practicalTasks: phaseData.practicalTasks ?? [],
    deliverables: phaseData.deliverables ?? [],
    checkCriteria: [`完成所有实操任务`, `产出物已上传`, `完成本周学习内容`],
    resources: phaseData.resources ?? [],
    completed: false,
  };
}

export function generateLearningPath(
  profile: Partial<UserProfile>,
  role: TargetRole,
  assessment: SkillAssessment
): LearningPath {
  const weaknessCount = assessment.weaknesses.length;
  const totalWeeks =
    weaknessCount <= 2 ? 8 : weaknessCount <= 4 ? 12 : 16;

  const phases: LearningPhase[] = [
    {
      title: '认知建立阶段',
      weeks: `第1-${Math.floor(totalWeeks * 0.25)}周`,
      description: '了解目标岗位要求，补充基础知识，完成工具熟悉',
      keyDeliverables: ['岗位认知报告', '基础技能练习'],
    },
    {
      title: '技能提升阶段',
      weeks: `第${Math.floor(totalWeeks * 0.25) + 1}-${Math.floor(totalWeeks * 0.6)}周`,
      description: '通过项目实战，系统提升核心能力短板',
      keyDeliverables: ['项目主体方案', '核心能力产出物'],
    },
    {
      title: '项目深化阶段',
      weeks: `第${Math.floor(totalWeeks * 0.6) + 1}-${Math.floor(totalWeeks * 0.85)}周`,
      description: '完善项目细节，补充工程深度，准备作品集素材',
      keyDeliverables: ['完整项目方案', '工程说明文档', '作品集素材'],
    },
    {
      title: '求职冲刺阶段',
      weeks: `第${Math.floor(totalWeeks * 0.85) + 1}-${totalWeeks}周`,
      description: '整理作品集，优化简历，进行模拟面试',
      keyDeliverables: ['作品集初稿', '简历项目描述', '面试问题准备'],
    },
  ];

  const weeklyTasks: WeeklyTask[] = Array.from({ length: totalWeeks }, (_, i) =>
    createWeeklyTask(i + 1, role, totalWeeks)
  );

  const suitableTemplates = PROJECT_TEMPLATES.filter((t) =>
    t.suitableFor.includes(role)
  );
  const recommendedProject =
    suitableTemplates[0] ?? PROJECT_TEMPLATES[0];

  const goalText: Record<string, string> = {
    internship: '3个月内获得设计工程实习机会',
    fulltime: '找到理想的设计工程全职岗位',
    'job-change': '成功跳槽到目标岗位',
    'career-switch': '完成职业转型',
    portfolio: '构建高质量设计工程作品集',
    interview: '提升面试表现与技术表达',
    promotion: '获得内部晋升所需的能力提升',
  };

  const goal = goalText[profile.careerGoal ?? 'internship'] ?? '完成职业成长';

  return {
    totalWeeks,
    phases,
    weeklyTasks,
    recommendedProject,
    summary: `你的目标是「${goal}」。系统根据你的能力差距，为你生成了一条 ${totalWeeks} 周的个性化学习路径。建议每周投入 ${profile.weeklyHours ?? 8} 小时，完成项目「${recommendedProject.name}」作为核心实战训练，最终输出完整作品集和简历。`,
  };
}

export function generatePortfolio(
  project: Project,
  role: TargetRole
): Portfolio {
  const rolePortfolioMap: Record<TargetRole, string[]> = {
    'structural-design-engineer': [
      '项目封面与背景介绍',
      '用户需求与设计目标',
      '结构方案探索与比较',
      '最终结构设计（3D模型与爆炸图）',
      '材料选择与加工工艺',
      '装配逻辑与顺序说明',
      'DFM分析与量产建议',
      '项目总结与个人贡献',
    ],
    'product-design-engineer': [
      '项目封面与产品概述',
      '用户研究与需求分析',
      '功能定义与设计规格',
      '概念方案探索',
      '最终设计方案',
      '结构与工艺可行性',
      '原型测试与迭代',
      '项目总结与个人贡献',
    ],
    'smart-hardware-engineer': [
      '产品封面与背景',
      '用户场景与功能需求',
      '外观造型与CMF设计',
      '内部结构与电子堆叠',
      '天线/散热/防水方案',
      '装配与量产考量',
      '项目总结',
    ],
    'industrial-design-engineer': [
      '封面与设计概述',
      '用户洞察与设计机会',
      '概念创意与造型演化',
      'CMF设计方案',
      '结构可行性说明',
      '最终渲染与场景展示',
      '工程说明（材料工艺）',
    ],
    'mechanical-design-engineer': [
      '封面与机构概述',
      '功能需求与设计目标',
      '机构方案比较',
      '最终机构设计',
      '运动仿真与验证',
      '关键件工程图',
      '项目总结',
    ],
    'design-engineering-intern': [
      '项目封面',
      '项目背景与目标',
      '设计过程',
      '最终方案展示',
      '项目总结',
    ],
  };

  const pageNames = rolePortfolioMap[role] ?? rolePortfolioMap['design-engineering-intern'];

  const missingKeywords = ['爆炸图', '材料', '结构', '工艺', '装配'];
  const presentKeywords = [
    project.background && '项目背景',
    project.designGoal && '设计目标',
    project.materialChoice && '材料选择',
    project.manufacturingConsideration && '工艺考量',
    project.materials.length > 0 && '项目素材',
  ].filter(Boolean) as string[];

  const missingMaterials = missingKeywords.filter(
    (k) => !presentKeywords.some((p) => p.includes(k))
      && !project.background?.includes(k)
      && !project.materialChoice?.includes(k)
  );

  const structure: PortfolioPage[] = pageNames.map((title, i) => ({
    pageNumber: i + 1,
    title,
    contentSuggestion: generatePageSuggestion(title, project),
    requiredMaterials: generateRequiredMaterials(title),
    isComplete: i < Math.floor(presentKeywords.length * 0.6),
  }));

  const highlights = [
    project.designGoal && `设计目标明确：${project.designGoal.slice(0, 30)}...`,
    project.mainChallenge && `重点问题解决：${project.mainChallenge.slice(0, 30)}...`,
    project.personalContribution && `个人贡献清晰：${project.personalContribution.slice(0, 30)}...`,
    project.materialChoice && `材料选型有据：${project.materialChoice.slice(0, 30)}...`,
  ].filter(Boolean) as string[];

  return {
    projectId: project.id,
    targetRole: role,
    structure,
    highlights: highlights.length > 0 ? highlights : ['请完善项目信息以生成亮点'],
    missingMaterials: missingMaterials.length > 0 ? missingMaterials : [],
    overallSuggestion:
      missingMaterials.length > 2
        ? `你的项目材料还需要补充：${missingMaterials.join('、')}。建议重点补充爆炸图和材料工艺说明，以提升作品集的工程说服力。`
        : '项目材料较为完整！建议进一步打磨每页的文字描述，让作品集逻辑更清晰。',
  };
}

function generatePageSuggestion(title: string, project: Project): string {
  if (title.includes('封面')) return `展示「${project.name || '你的项目'}」的核心视觉，一句话说明项目价值。`;
  if (title.includes('背景') || title.includes('概述')) return project.background || '介绍项目背景、设计背景与市场机会。';
  if (title.includes('需求') || title.includes('用户')) return '展示用户研究方法、关键需求洞察和设计机会点。';
  if (title.includes('方案') || title.includes('探索')) return '展示2-3个方案比较，说明最终选择的依据。';
  if (title.includes('材料') || title.includes('工艺')) return project.materialChoice || '说明材料选择依据、加工工艺选型和成本考量。';
  if (title.includes('装配')) return '用分步示意图说明装配顺序和关键配合关系。';
  if (title.includes('DFM') || title.includes('量产')) return '说明DFM检查要点、模具风险和量产改善建议。';
  if (title.includes('总结') || title.includes('贡献')) return project.personalContribution || '总结项目学习收获和个人核心贡献，点明未来优化方向。';
  return '请根据项目材料完善此页内容。';
}

function generateRequiredMaterials(title: string): string[] {
  if (title.includes('封面')) return ['产品渲染图', '项目标题', '一句话描述'];
  if (title.includes('背景') || title.includes('概述')) return ['项目背景文字', '市场背景图'];
  if (title.includes('需求') || title.includes('用户')) return ['用户画像', '需求分析图', '调研说明'];
  if (title.includes('方案') || title.includes('探索')) return ['草图', '方案比较图', '选择依据'];
  if (title.includes('结构') || title.includes('爆炸')) return ['3D模型截图', '爆炸图', '关键尺寸'];
  if (title.includes('材料') || title.includes('工艺')) return ['材料选型对比', '工艺说明', '供应商信息'];
  if (title.includes('装配')) return ['装配顺序图', '连接方式说明'];
  if (title.includes('DFM')) return ['DFM分析报告', '改善建议'];
  if (title.includes('测试') || title.includes('原型')) return ['原型照片', '测试报告', '迭代说明'];
  return ['相关说明文字', '支撑图片'];
}

export function generateResumeItem(project: Project, role: TargetRole): ResumeItem {
  const roleKeywords: Record<TargetRole, string[]> = {
    'structural-design-engineer': ['SolidWorks', '结构设计', 'DFM', '塑胶件', '注塑', '装配', '工程图'],
    'product-design-engineer': ['产品设计', '用户研究', '概念设计', '原型', 'CMF', '跨职能协作'],
    'smart-hardware-engineer': ['智能硬件', '电子堆叠', 'PCB', '防水', 'IoT', '结构设计'],
    'industrial-design-engineer': ['工业设计', 'CMF', 'Rhino', 'KeyShot', '造型设计', '可制造性'],
    'mechanical-design-engineer': ['机械设计', '机构分析', '传动系统', '公差设计', 'SolidWorks', '仿真'],
    'design-engineering-intern': ['SolidWorks', '3D建模', '结构设计', '工程图'],
  };

  const keywords = roleKeywords[role] ?? roleKeywords['design-engineering-intern'];

  const bullets = [
    project.designGoal && `基于${project.background?.slice(0, 20) || '项目背景'}，完成${project.name}的${role.includes('structural') ? '结构设计方案' : '完整设计方案'}`,
    project.personalContribution && `个人负责：${project.personalContribution.slice(0, 60)}`,
    project.mainChallenge && `重点解决${project.mainChallenge.slice(0, 40)}问题，${project.solutionComparison ? '通过方案比较' : ''}最终确定最优方案`,
    project.materialChoice && `材料选型：${project.materialChoice.slice(0, 50)}`,
    project.manufacturingConsideration && `工艺考量：${project.manufacturingConsideration.slice(0, 50)}`,
  ].filter(Boolean) as string[];

  if (bullets.length < 3) {
    bullets.push('使用' + keywords.slice(0, 2).join('、') + '完成项目主要工作');
    bullets.push('输出完整项目文档与作品集展示页面');
  }

  return {
    id: `resume-${project.id}-${Date.now()}`,
    projectName: project.name,
    originalDescription: project.personalContribution || '参与产品设计，完成建模工作。',
    optimizedTitle: `${project.name}—${role === 'structural-design-engineer' ? '结构设计' : '产品设计'}专项`,
    oneLiner: `完成「${project.name}」的${role === 'structural-design-engineer' ? '结构方案设计与DFM分析' : '完整产品设计方案'}，涵盖从需求分析到设计落地的全流程。`,
    bulletPoints: bullets.slice(0, 5),
    keywords: keywords.slice(0, 5),
    quantifiableResults: [
      '输出完整3D结构模型及工程图',
      '完成作品集展示页面',
      project.hasPrototypeTesting ? '完成原型测试验证' : '完成设计评审',
    ],
    interviewExpandPoints: [
      '可以详细讲述材料选型依据',
      '可以说明结构连接方式的设计逻辑',
      '可以讨论项目中遇到的主要技术问题',
    ],
  };
}

export function generateInterviewSession(
  role: TargetRole,
  mode: 'portfolio' | 'technical' | 'deep-dive'
): InterviewSession {
  const questionBank: Record<TargetRole, InterviewQuestion[]> = {
    'structural-design-engineer': [
      { id: '1', question: '请介绍一下你的项目，重点说明结构设计的核心挑战是什么？', type: 'structural', userAnswer: '', },
      { id: '2', question: '这个产品的上下壳连接方式是什么？你为什么选择这种方案？', type: 'structural', userAnswer: '', },
      { id: '3', question: '外壳材料为什么选择这种材料？它的优缺点是什么？', type: 'materials', userAnswer: '', },
      { id: '4', question: '你在设计时有没有考虑DFM（可制造性）？具体如何体现？', type: 'process', userAnswer: '', },
      { id: '5', question: '如果这个产品要量产10万台，你会做哪些优化？', type: 'structural', userAnswer: '', },
      { id: '6', question: '塑胶件卡扣设计时你会考虑哪些因素？', type: 'structural', userAnswer: '', },
      { id: '7', question: '你这个项目中最大的设计取舍是什么？', type: 'personal', userAnswer: '', },
    ],
    'product-design-engineer': [
      { id: '1', question: '请介绍你做的一个完整产品设计项目，从用户需求到最终设计。', type: 'design-logic', userAnswer: '', },
      { id: '2', question: '你是如何从用户需求转化为具体的功能定义的？', type: 'design-logic', userAnswer: '', },
      { id: '3', question: '你在这个项目中做了哪些方案比较？最终选择的依据是什么？', type: 'design-logic', userAnswer: '', },
      { id: '4', question: '如何平衡造型美感与结构/成本的约束？', type: 'design-logic', userAnswer: '', },
      { id: '5', question: '你在这个项目中的个人贡献具体是什么？', type: 'personal', userAnswer: '', },
      { id: '6', question: '产品在测试中发现了什么问题？你如何解决的？', type: 'process', userAnswer: '', },
    ],
    'smart-hardware-engineer': [
      { id: '1', question: '请介绍这款智能硬件产品的整体设计思路。', type: 'design-logic', userAnswer: '', },
      { id: '2', question: '内部电子堆叠是如何设计的？有哪些空间约束？', type: 'structural', userAnswer: '', },
      { id: '3', question: '这款产品的防水方案是什么？选择依据是什么？', type: 'structural', userAnswer: '', },
      { id: '4', question: '天线布局时你考虑了哪些因素？', type: 'structural', userAnswer: '', },
      { id: '5', question: '你如何与硬件工程师协调结构与电子的设计冲突？', type: 'process', userAnswer: '', },
    ],
    'industrial-design-engineer': [
      { id: '1', question: '请介绍你的一个代表作品，设计语言和灵感来源是什么？', type: 'design-logic', userAnswer: '', },
      { id: '2', question: '这个CMF方案的选材依据是什么？', type: 'materials', userAnswer: '', },
      { id: '3', question: '你如何确保这个外观造型在结构上是可以实现的？', type: 'structural', userAnswer: '', },
      { id: '4', question: '这个设计的制造成本你有没有评估？', type: 'process', userAnswer: '', },
      { id: '5', question: '你和结构工程师之间是如何协作的？', type: 'personal', userAnswer: '', },
    ],
    'mechanical-design-engineer': [
      { id: '1', question: '请介绍你设计的机构，运动原理是什么？', type: 'structural', userAnswer: '', },
      { id: '2', question: '关键配合尺寸的公差是如何确定的？', type: 'structural', userAnswer: '', },
      { id: '3', question: '你有没有做过机构仿真验证？结果如何？', type: 'process', userAnswer: '', },
      { id: '4', question: '这个机构的失效模式有哪些？如何预防？', type: 'structural', userAnswer: '', },
    ],
    'design-engineering-intern': [
      { id: '1', question: '请介绍你做过的一个设计项目，最让你有成就感的地方是什么？', type: 'personal', userAnswer: '', },
      { id: '2', question: '你使用什么软件做3D建模？可以介绍你的建模流程吗？', type: 'structural', userAnswer: '', },
      { id: '3', question: '你对设计工程实习岗位的理解是什么？', type: 'personal', userAnswer: '', },
      { id: '4', question: '你在项目中遇到的最大困难是什么？如何解决？', type: 'personal', userAnswer: '', },
    ],
  };

  const allQuestions = questionBank[role] ?? questionBank['design-engineering-intern'];
  const count = mode === 'deep-dive' ? Math.min(5, allQuestions.length) : Math.min(4, allQuestions.length);
  const questions = allQuestions.slice(0, count).map((q) => ({ ...q }));

  return {
    id: `session-${Date.now()}`,
    mode,
    targetRole: role,
    questions,
    currentQuestionIndex: 0,
    isComplete: false,
  };
}

export function generateInterviewFeedback(
  _question: InterviewQuestion,
  answer: string
): InterviewQuestion['aiFeedback'] {
  const wordCount = answer.trim().split(/\s+/).length;
  const hasEngineeringTerms = /结构|材料|工艺|设计|方案|DFM|模具|公差|装配|制造/i.test(answer);
  const hasPersonalPronoun = /我|本人|负责|完成/i.test(answer);
  const hasNumbers = /\d/.test(answer);
  const isStructured = answer.includes('，') && answer.includes('。') && wordCount > 20;

  const score = Math.min(10, Math.max(1,
    (wordCount > 30 ? 2 : 1) +
    (hasEngineeringTerms ? 2 : 0) +
    (hasPersonalPronoun ? 2 : 0) +
    (hasNumbers ? 1 : 0) +
    (isStructured ? 2 : 0) +
    (wordCount > 80 ? 1 : 0)
  ));

  const suggestions: string[] = [];
  if (wordCount < 30) suggestions.push('回答内容较少，建议展开讲述更多细节');
  if (!hasEngineeringTerms) suggestions.push('缺少工程术语，建议加入具体的技术要素');
  if (!hasPersonalPronoun) suggestions.push('个人贡献不够清晰，建议明确说明"我"做了什么');
  if (!hasNumbers) suggestions.push('缺少量化数据，如尺寸、时间、数量等，会让回答更有说服力');
  if (!isStructured) suggestions.push('回答结构可以更清晰，建议使用"首先...然后...最后..."的表达方式');

  const improvedAnswer = `${answer.slice(0, 30)}...（建议按照"背景-目标-方案-结果"的逻辑补充完整回答，加入具体的工程参数和个人贡献说明）`;

  return {
    score,
    isClear: wordCount > 30,
    showsPersonalContribution: hasPersonalPronoun,
    showsEngineeringLogic: hasEngineeringTerms,
    hasDataSupport: hasNumbers,
    isStructured,
    avoidedKeyIssues: wordCount < 20,
    suggestions,
    improvedAnswer,
  };
}

export function generateProjectAIFeedback(project: Project): { feedback: string; missing: string[] } {
  const missing: string[] = [];

  if (!project.background || project.background.length < 20) missing.push('项目背景（需说明设计场景和问题）');
  if (!project.designGoal || project.designGoal.length < 10) missing.push('设计目标');
  if (!project.personalContribution || project.personalContribution.length < 10) missing.push('个人贡献说明');
  if (!project.mainChallenge || project.mainChallenge.length < 10) missing.push('核心挑战与解决方案');
  if (!project.materialChoice || project.materialChoice.length < 5) missing.push('材料选择依据');
  if (!project.manufacturingConsideration || project.manufacturingConsideration.length < 5) missing.push('制造工艺考量');
  if (project.materials.length === 0) missing.push('项目图片或文件素材');

  let feedback = '';
  if (missing.length === 0) {
    feedback = '项目材料非常完整！你的项目背景、设计目标、个人贡献和工程考量都已清晰说明，可以进入作品集生成阶段。建议在可能的情况下补充爆炸图和工程图截图以增强工程说服力。';
  } else if (missing.length <= 2) {
    feedback = `项目材料基本完整，还需要补充：${missing.join('、')}。完善后即可生成高质量作品集。`;
  } else {
    feedback = `项目目前缺少关键信息：${missing.slice(0, 3).join('、')}等。作品集的工程说服力不足，建议先完善这些信息，否则面试官可能难以判断你的工程能力。重点补充：1）材料选型理由；2）结构方案逻辑；3）你在项目中的具体角色。`;
  }

  return { feedback, missing };
}

export function generateProjectArchive(project: Project): ProjectArchive {
  return {
    projectName: project.name || '未命名项目',
    background: project.background || '暂无项目背景描述',
    userNeeds: '基于项目背景分析的用户核心需求',
    designGoal: project.designGoal || '未填写设计目标',
    designConstraints: [
      '满足基本功能要求',
      '材料成本合理',
      '符合加工工艺限制',
    ],
    processSummary: project.solutionComparison || '经过方案比较，确定最优设计方案',
    engineeringImplementation: `采用${project.materialChoice || '合适材料'}，${project.manufacturingConsideration || '考虑制造工艺'}进行工程实现`,
    results: project.hasPrototypeTesting ? '完成原型验证，设计方案可行' : '完成设计方案，待原型验证',
    personalContribution: project.personalContribution || '未填写个人贡献',
    improvementPoints: [
      project.improvementIdeas || '进一步优化结构细节',
      '补充完整工程图纸',
      '进行更多用户测试验证',
    ],
  };
}
