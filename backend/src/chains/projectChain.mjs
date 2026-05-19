/**
 * Project Workshop chains (LCEL):
 *   • suggestNodesChain   — AI picks relevant next canvas nodes
 *   • completeFieldChain  — AI fills in a single project field
 *   • analyzeProjectChain — AI scores & critiques the whole project
 *
 * All chains are automatically traced to LangSmith when
 * LANGCHAIN_TRACING_V2=true is set in the environment.
 */
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';

const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-2.5-flash',
  apiKey: process.env.GOOGLE_API_KEY,
  temperature: 0.3,
  maxOutputTokens: 1200,
});

// ── Available node descriptions (used in prompt) ──────────────────────────────
const NODE_OPTIONS = `
- background:     项目背景（描述项目起源、应用场景与意义）
- designGoal:     设计目标（量化或明确的效果标准）
- contribution:   个人贡献（团队协作中自己的角色与工作）
- challenge:      核心挑战（主要技术/资源/时间限制）
- solution:       方案探索（2+备选方案及最终选择理由）
- materials:      参考素材（图片、PDF 等外部参考库）
- materialChoice: 材料选型（材料物理特性、成本、适用性对比）
- manufacturing:  制造工艺（加工方式、精度要求、生产注意事项）
- improvement:    改进方向（迭代反思、未来优化路径）
- analysis:       AI 综合分析（项目完整度与质量评估报告）
`;

// ── Chain 1: Suggest next canvas nodes ───────────────────────────────────────
export const suggestNodesChain = RunnableSequence.from([
  PromptTemplate.fromTemplate(
    `你是设计工程项目助手。根据项目信息，推荐接下来最相关的 3 个节点。

项目名称：{name}
项目概述：{overview}

可选节点：
${NODE_OPTIONS}
判断规则（请严格遵守）：
- 数字产品 / UX / 软件项目 → 不推荐 materialChoice 和 manufacturing
- 纯研究 / 分析类项目 → 不推荐 manufacturing
- 纯个人项目 → 可以省略 contribution
- 推荐最能推进该项目文档完整性的节点

只返回 JSON 数组，不要任何解释，例如：["designGoal","challenge","solution"]`,
  ),
  llm,
  new StringOutputParser(),
]);

// ── Chain 2: Complete a single field ─────────────────────────────────────────
const completeLlm = new ChatGoogleGenerativeAI({
  model: 'gemini-2.5-flash',
  apiKey: process.env.GOOGLE_API_KEY,
  temperature: 0.65,
  maxOutputTokens: 1000,
});

export const completeFieldChain = RunnableSequence.from([
  PromptTemplate.fromTemplate(
    `你是设计工程项目记录助手。根据以下已知的项目信息，为「{fieldLabel}」字段生成 300–500 字的专业描述。

已知项目信息：
{context}

要求：
- 内容充实完整，覆盖该字段应有的所有关键要素
- 语言专业且简洁，符合工程报告风格
- 可以基于项目信息合理推断细节，但不要凭空捏造与项目无关的内容
- 直接输出描述内容，不加标题、不加 markdown 格式`,
  ),
  completeLlm,
  new StringOutputParser(),
]);

// ── Chain 3b: Research & generate project background from name only ───────────
// Used when only the project name exists (first step in workshop)
const researchLLM = new ChatGoogleGenerativeAI({
  model: 'gemini-2.5-flash',
  apiKey: process.env.GOOGLE_API_KEY,
  temperature: 0.5,
  maxOutputTokens: 700,
});

export const researchBackgroundChain = RunnableSequence.from([
  PromptTemplate.fromTemplate(
    `你是一位资深设计工程师，擅长撰写专业的项目背景调研报告。
用户正在开发这个项目：「{projectName}」

请根据项目名称，推断该产品/项目的类型，撰写一份完整的项目背景调研（500–700字）。

内容结构（连续段落，不加标题）：
1. **市场与行业背景**：该品类当前市场规模、增长趋势、主要玩家或典型产品，引用 1–2 个具体数据或报告
2. **用户群体与使用场景**：目标用户画像（年龄/职业/使用频次）、核心使用场景与情境描述
3. **现有产品痛点**：调研市面上同类产品存在的 3–4 个主要设计缺陷或用户抱怨点，可参考真实用户反馈
4. **工程约束与技术背景**：该品类关键的工程约束（尺寸包络、重量限制、材料要求、IP 防护等级、相关认证标准如 GB/T、ISO、IEC 等）
5. **本项目切入点**：基于以上调研，本项目拟解决的核心问题与差异化设计方向

直接输出完整段落，不加 markdown 标记，不加编号标题，语言专业简洁，符合工业设计/产品工程文档风格。`
  ),
  researchLLM,
  new StringOutputParser(),
]);

// ── Chain 3: Analyze & score the whole project ───────────────────────────────
export const analyzeProjectChain = RunnableSequence.from([
  PromptTemplate.fromTemplate(
    `你是设计工程导师，请分析以下项目记录的完整度和质量。

{context}

严格按以下格式返回，每行一项，不加任何额外文字：
FEEDBACK: <2–3 句总体评价，指出亮点和主要问题>
MISSING: <缺失项1> | <缺失项2> | <缺失项3>
RATE: <0–100 的整数，表示项目文档完整度>`,
  ),
  llm,
  new StringOutputParser(),
]);
