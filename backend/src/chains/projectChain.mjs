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
  maxOutputTokens: 600,
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
  maxOutputTokens: 400,
});

export const completeFieldChain = RunnableSequence.from([
  PromptTemplate.fromTemplate(
    `你是设计工程项目记录助手。根据以下已知的项目信息，为「{fieldLabel}」字段生成 100–200 字的专业描述。

已知项目信息：
{context}

要求：
- 直接输出描述内容，不要标题或解释
- 语言专业且简洁，符合工程报告风格
- 不要编造项目中未提及的细节`,
  ),
  completeLlm,
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
