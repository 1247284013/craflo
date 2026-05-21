import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { BaseAgent } from '../base.mjs';
import { researchLLM } from '../llms.mjs';

const chain = RunnableSequence.from([
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

直接输出完整段落，不加 markdown 标记，不加编号标题，语言专业简洁，符合工业设计/产品工程文档风格。`,
  ),
  researchLLM,
  new StringOutputParser(),
]);

class BackgroundResearcherAgent extends BaseAgent {
  constructor() {
    super({
      id:          'background_researcher',
      name:        'BackgroundResearcherAgent',
      group:       'project',
      description: '项目背景调研。仅凭项目名称推断产品类型，生成包含市场背景、用户画像、现有痛点、工程约束、本项目切入点的 500-700 字调研报告。',
      inputSchema: {
        projectName: 'string · 项目名称（唯一输入）',
      },
      outputSchema: {
        text: 'string · 500-700 字的项目背景调研正文',
      },
      connects_to: ['node_suggester'],
    });
    this._chain = chain;
  }

  async execute(input) {
    const text = await this._chain.invoke(
      { projectName: input.projectName ?? '' },
      { runName: `BackgroundResearch · ${(input.projectName ?? '').slice(0, 30)}` },
    );
    return { text: text.trim() };
  }
}

export const backgroundResearcherAgent = new BackgroundResearcherAgent();
