export interface Comment {
  id: string;
  author: string;
  avatarInitial: string;
  content: string;
  likes: number;
  createdAt: string;
  isBestAnswer?: boolean;
  isLiked?: boolean;
}

export interface Post {
  id: string;
  author: string;
  avatarInitial: string;
  board: BoardId;
  title: string;
  content: string;
  tags: string[];
  likes: number;
  comments: number;
  views: number;
  createdAt: string;
  isSolved?: boolean;
  isOfficial?: boolean;
  isPinned?: boolean;
  hasAISummary?: boolean;
  aiSummary?: string;
  commentList?: Comment[];
  isLiked?: boolean;
  isBookmarked?: boolean;
  isAnonymous?: boolean;
}

export type BoardId =
  | 'learning-path'
  | 'project-help'
  | 'portfolio-review'
  | 'engineering-exp'
  | 'jobs'
  | 'tools-resources'
  | 'ai-workflow'
  | 'announcements';

export const BOARDS: { id: BoardId; emoji: string; count: number }[] = [
  { id: 'learning-path',    emoji: '🗺️', count: 128 },
  { id: 'project-help',     emoji: '🔧', count: 94 },
  { id: 'portfolio-review', emoji: '🎨', count: 76 },
  { id: 'engineering-exp',  emoji: '⚙️', count: 213 },
  { id: 'jobs',             emoji: '💼', count: 55 },
  { id: 'tools-resources',  emoji: '🛠️', count: 41 },
  { id: 'ai-workflow',      emoji: '🤖', count: 38 },
  { id: 'announcements',    emoji: '📢', count: 12 },
];

export const HOT_TAGS = [
  '#结构设计', '#DFM', '#SolidWorks', '#作品集',
  '#转岗', '#材料工艺', '#实习', '#Rhino',
  '#爆炸图', '#注塑', '#装配逻辑', '#KeyShot',
];

export const MOCK_POSTS: Post[] = [
  {
    id: 'p1',
    author: '张明宇',
    avatarInitial: 'Z',
    board: 'portfolio-review',
    title: '结构设计实习作品集，请大家帮忙看看还缺什么？',
    content: `我是工业设计背景，准备转结构设计方向，做了一个消费电子外壳的作品集项目。

里面包含：
- 产品外观草图 × 10
- SolidWorks 结构建模（外壳 + 内件）
- 爆炸图展示
- 材料工艺说明（ABS 注塑 + 油漆工艺）

但是感觉 DFM 分析这块做得很浅，工程性不足。请问有经验的朋友，结构设计实习岗位的作品集，还需要补充哪些内容才更有说服力？`,
    tags: ['作品集', '结构设计', 'DFM', '实习'],
    likes: 47,
    comments: 12,
    views: 389,
    createdAt: '2小时前',
    isSolved: true,
    hasAISummary: true,
    aiSummary: '该帖主要讨论结构设计实习作品集的完善方向。核心建议包括：补充完整的 DFM 分析（脱模方向、壁厚、开模方式）、添加装配逻辑拆解图、标注关键公差与配合、展示迭代过程而非只有最终结果。',
    commentList: [
      {
        id: 'c1',
        author: '李工程师',
        avatarInitial: 'L',
        content: '建议重点补充 DFM 分析章节：脱模方向分析、壁厚分布图、开模方式说明。很多 HR 和技术面试官会直接看这块来判断你是否理解可制造性。另外如果有装配逻辑图（exploded view + assembly sequence）会更加分。',
        likes: 23,
        createdAt: '1小时前',
        isBestAnswer: true,
      },
      {
        id: 'c2',
        author: '陈设计',
        avatarInitial: 'C',
        content: '同意楼上的，另外建议加上迭代过程。很多公司不只看最终结果，他们想看你是怎么发现问题、怎么改进的。可以简单做一个"问题 → 改进方案 → 最终结果"的对比页。',
        likes: 15,
        createdAt: '45分钟前',
      },
      {
        id: 'c3',
        author: '匿名用户',
        avatarInitial: '?',
        content: '我当时转结构设计的时候作品集里加了一个完整的注塑件从草图到开模的全流程，面试官很感兴趣。重点是要展示你理解整个工程链，不只是建模。',
        likes: 8,
        createdAt: '30分钟前',
        isLiked: false,
      },
    ],
    isLiked: false,
    isBookmarked: true,
  },
  {
    id: 'p2',
    author: '周小航',
    avatarInitial: 'Z',
    board: 'project-help',
    title: '便携式产品内部结构散热怎么做？新手求助',
    content: `在做一个便携式充电宝的结构项目，产品尺寸比较紧凑（150×80×20mm），内部有升压模块和电芯，发热比较严重。

请问结构设计上有哪些常用的散热方式？是用导热硅脂+铝板导热，还是有其他方案？需要考虑防水等级的话又有什么注意事项？

SolidWorks 建模还行，但工程散热这块完全不懂，请大佬指路！`,
    tags: ['散热', '便携产品', '结构设计', '新手'],
    likes: 31,
    comments: 8,
    views: 256,
    createdAt: '5小时前',
    hasAISummary: true,
    aiSummary: '便携产品散热的主流方案：导热硅脂 + 铝制导热片导热至外壳，外壳采用铝合金强化散热效率。防水设计需注意密封圈配合间隙（推荐 0.15-0.25mm）及内部气压平衡。',
    commentList: [
      {
        id: 'c4',
        author: '热设计工程师 Wang',
        avatarInitial: 'W',
        content: '便携产品散热常用方案：\n1. 导热硅脂 + 铝导热板 → 铝合金外壳散热\n2. 铜柱导热（用于点热源）\n3. 石墨烯散热贴（轻薄，适合电芯）\n\n防水和散热通常是矛盾的，需要牺牲部分散热能力来保证密封。建议先确定产品最高功耗，再做热仿真（ANSYS 或 FloEFD）估算温升。',
        likes: 18,
        createdAt: '4小时前',
        isBestAnswer: true,
      },
      {
        id: 'c5',
        author: '结构老鸟',
        avatarInitial: 'J',
        content: '如果你的产品不追求极致防水（IPX3-4 就够），可以在外壳上设计散热槽，配合内部导热模块，效果更好。要 IPX7 以上才需要完全密封，那就只能靠壳体传导了。',
        likes: 11,
        createdAt: '3小时前',
      },
    ],
    isLiked: true,
    isBookmarked: false,
  },
  {
    id: 'p3',
    author: 'Craflo 官方',
    avatarInitial: 'C',
    board: 'announcements',
    title: '【公告】Craflo 社区正式上线！欢迎大家交流分享',
    content: `Craflo 社区今日正式上线 🎉

这里是专为设计工程人群打造的交流平台，你可以在这里：
- 分享学习路径经验
- 求助项目技术问题  
- 点评作品集，互相成长
- 分享求职、实习经验
- 交流工程工具与 AI 工作流

**发帖须知**：
请保持专业、友善的交流氛围。涉及具体公司项目请注意保密义务。招聘信息请在「求职招聘」板块发布，避免泄露个人隐私。

欢迎大家积极分享，共同沉淀设计工程领域的实战知识！`,
    tags: ['公告', '社区'],
    likes: 156,
    comments: 34,
    views: 1204,
    createdAt: '1天前',
    isOfficial: true,
    isPinned: true,
    commentList: [],
    isLiked: false,
    isBookmarked: false,
  },
  {
    id: 'p4',
    author: '孙悦迪',
    avatarInitial: 'S',
    board: 'engineering-exp',
    title: '工业设计转结构设计 3 个月复盘：什么最重要？',
    content: `我是工业设计本科，去年开始备战结构设计方向，经历了 3 个月的系统学习，现在已经拿到了一家消费电子公司的结构工程师实习 offer，做个经验复盘。

**最重要的三件事：**

1. **DFM 思维的建立** — 不再只想"好不好看"，而是想"这个结构能不能量产、怎么开模"。推荐直接找真实产品拆解，观察每个零件的分型线、出模方向、壁厚。

2. **SolidWorks 建模能力** — 不需要很复杂的功能，但核心功能要熟练：零件建模、装配、工程图出图、公差标注。建议做 3-5 个完整项目（从草图到工程图）。

3. **作品集的"工程性"** — 纯外观渲染没用，面试官想看到你理解结构。每个项目要有：结构拆解、材料选型理由、DFM 分析、装配顺序。

希望对同样在转型的朋友有帮助！`,
    tags: ['转岗经验', '结构设计', 'DFM', '工业设计', '学习路径'],
    likes: 203,
    comments: 28,
    views: 1567,
    createdAt: '3天前',
    hasAISummary: true,
    aiSummary: '工设转结构设计的核心路径：① 建立 DFM 可制造性思维（拆解真实产品）② 掌握 SolidWorks 核心工作流（建模→装配→工程图）③ 作品集强调工程性（结构拆解、材料选型、DFM 分析）。作者 3 个月备战后成功拿到实习 offer。',
    commentList: [
      {
        id: 'c6',
        author: '同路人',
        avatarInitial: 'T',
        content: '太有用了！请问 3 个月里你是怎么安排时间的？每天大概学多少小时？',
        likes: 12,
        createdAt: '2天前',
      },
      {
        id: 'c7',
        author: '孙悦迪',
        avatarInitial: 'S',
        content: '我大概每天 4-5 小时，周末会多一些。前 6 周主要是学 SolidWorks + 基础结构知识，后 6 周做项目 + 打磨作品集。关键是要有完整项目，不要只做练习题。',
        likes: 8,
        createdAt: '2天前',
      },
    ],
    isLiked: false,
    isBookmarked: false,
  },
  {
    id: 'p5',
    author: '匿名用户',
    avatarInitial: '?',
    board: 'jobs',
    title: '【实习】某消费电子公司结构设计实习生招募（深圳）',
    content: `**岗位：结构设计实习生**
公司：消费电子领域（保密，面试后可透露）
地点：深圳南山
薪资：200元/天
周期：3个月起

**要求：**
- 熟练使用 SolidWorks / Creo
- 了解塑料件 DFM 基础
- 有作品集者优先

**加分项：**
- 有拆机分析经历
- 了解注塑工艺
- 工业设计/机械/产品设计相关专业

感兴趣的同学私信我，附上作品集链接。招聘信息属实，非中介。`,
    tags: ['实习', '结构设计', '深圳', '消费电子'],
    likes: 18,
    comments: 7,
    views: 412,
    createdAt: '2天前',
    commentList: [],
    isLiked: false,
    isBookmarked: false,
    isAnonymous: true,
  },
  {
    id: 'p6',
    author: '陈一帆',
    avatarInitial: 'C',
    board: 'tools-resources',
    title: '分享我常用的 AI 工具组合：Claude + Midjourney + Craflo',
    content: `整理了一下我在结构设计学习过程中常用的 AI 工具组合，供大家参考：

**Claude（Anthropic）**
- 用来解答 DFM、材料选型、工艺问题
- 分析竞品结构、生成项目分析框架
- 帮助写作品集项目描述

**Midjourney**
- 快速生成产品外观概念图（概念验证用）
- 不用于最终交付物

**Craflo**
- 生成系统化的学习路径
- 项目工作台做结构项目的节点整理
- 面试题练习

**注意事项：**
AI 生成的工程内容需要人工核验，特别是涉及公差、强度、安全规范的内容，不能直接用于设计文件。`,
    tags: ['AI工具', 'Claude', '工具推荐', '学习方法'],
    likes: 89,
    comments: 15,
    views: 734,
    createdAt: '4天前',
    hasAISummary: false,
    commentList: [
      {
        id: 'c8',
        author: '工具控',
        avatarInitial: 'G',
        content: '加一个：Thingiverse 上有很多真实产品的 3D 文件，可以用来学习拆解分析，比自己凭空建模更有参考价值。',
        likes: 21,
        createdAt: '3天前',
      },
    ],
    isLiked: false,
    isBookmarked: true,
  },
  {
    id: 'p7',
    author: '王佳怡',
    avatarInitial: 'W',
    board: 'learning-path',
    title: '零基础到结构设计实习，需要多久？路径怎么规划？',
    content: `我是产品设计本科大三，完全没有结构设计基础，想在毕业前做好转型准备。

想请问：
1. 从零基础到能投结构设计实习简历，大概需要多长时间？
2. 学习路径怎么规划比较合理？
3. SolidWorks 和 Creo 选哪个？

我现在会 Rhino、Keyshot，有一些工业设计作品，但完全没有做过工程图和结构项目。`,
    tags: ['学习路径', '结构设计', '转岗', '零基础'],
    likes: 67,
    comments: 19,
    views: 890,
    createdAt: '6天前',
    isSolved: true,
    commentList: [
      {
        id: 'c9',
        author: '资深结构工程师',
        avatarInitial: 'Z',
        content: '基于你的背景（有工设基础），3-4 个月认真学可以达到投实习的水平。\n\n推荐路径：\n① SW 基础（2周）→ ② 结构知识（塑料件 DFM，4周）→ ③ 完整项目（6周）→ ④ 作品集整理（2周）\n\nSolidWorks 优先，消费电子领域更常用，求职面要求也更多。',
        likes: 45,
        createdAt: '5天前',
        isBestAnswer: true,
      },
    ],
    isLiked: true,
    isBookmarked: false,
  },
  {
    id: 'p8',
    author: '林峰',
    avatarInitial: 'L',
    board: 'ai-workflow',
    title: '用 AI 生成结构设计项目大纲，效率翻倍！分享提示词',
    content: `分享一个我优化过的提示词，用于让 AI 生成结构设计项目的完整大纲：

\`\`\`
你是一位资深结构设计工程师，请为以下项目生成一个完整的结构设计大纲：

产品：[产品名称]
应用场景：[使用场景]
关键约束：[尺寸/重量/防护等级等]

请包含：
1. 结构方案分析（2-3个方案对比）
2. 关键结构件清单
3. 材料选型建议（含理由）
4. DFM 注意事项
5. 装配顺序
6. 作品集展示建议
\`\`\`

用 Claude 3.5 Sonnet 效果最好，生成的内容质量很高，可以直接用来作为项目框架。当然专业内容还是要自己核验。`,
    tags: ['AI工作流', '提示词', 'Claude', '结构设计'],
    likes: 134,
    comments: 22,
    views: 1123,
    createdAt: '1周前',
    hasAISummary: false,
    commentList: [],
    isLiked: false,
    isBookmarked: false,
  },
];
