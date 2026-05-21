import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { BaseAgent } from '../base.mjs';
import { projectLLM } from '../llms.mjs';

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

const chain = RunnableSequence.from([
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
  projectLLM,
  new StringOutputParser(),
]);

class NodeSuggesterAgent extends BaseAgent {
  constructor() {
    super({
      id:          'node_suggester',
      name:        'NodeSuggesterAgent',
      group:       'project',
      description: '画布节点建议。根据项目名称和已填内容，推荐接下来最相关的 3 个画布节点，排除与项目类型不符的选项（如数字产品不推荐制造工艺）。',
      inputSchema: {
        name:     'string · 项目名称',
        overview: 'string · 已有的项目概述',
      },
      outputSchema: {
        keys: 'string[] · 推荐的节点 key 列表，如 ["designGoal","challenge","solution"]',
      },
      connects_to: [],
    });
    this._chain = chain;
  }

  async execute(input) {
    const raw = await this._chain.invoke(
      { name: input.name ?? '', overview: input.overview ?? '' },
      { runName: `NodeSuggester · ${(input.name ?? '').slice(0, 30)}` },
    );
    const match = raw.match(/\[[\s\S]*?\]/);
    const keys = match ? JSON.parse(match[0]) : ['designGoal', 'challenge', 'contribution'];
    return { keys };
  }
}

export const nodeSuggesterAgent = new NodeSuggesterAgent();
