import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { BaseAgent } from '../base.mjs';
import { researchLLM } from '../llms.mjs';

const chain = RunnableSequence.from([
  PromptTemplate.fromTemplate(
    `你是一位资深设计工程师，擅长撰写专业的项目背景调研报告。
用户正在开发这个项目：「{projectName}」

请根据项目名称，推断该产品/项目的类型，撰写一份完整的项目背景调研（800–1000字）。

内容结构（连续段落，不加标题和编号）：
1. 市场与行业背景：该品类当前市场规模（引用具体数字/年份）、增长趋势、主要竞品品牌与代表产品，列举 1-2 个可信数据来源或行业报告名称
2. 用户群体与使用场景：目标用户画像（年龄段、职业类型、使用频率、消费能力），核心使用场景（地点、时间、动机）的具体情境描述，附 1 个典型用户故事
3. 现有产品痛点：针对市面主流同类产品，列举 4-5 个主要设计缺陷或用户高频抱怨点，结合真实用户评价或媒体测评中出现的典型问题
4. 工程约束与技术背景：该品类在尺寸包络、重量/便携性、材料工艺、能耗/续航、IP 防护、相关标准（如 GB/T、ISO、IEC、CE、RoHS）等方面的关键限制，以及近年相关技术演进趋势
5. 本项目切入点：基于以上调研，明确本项目拟优先解决的 2-3 个核心问题，以及差异化设计方向与可能的竞争优势

直接输出完整段落，不加 markdown 标记，不加编号标题，语言专业准确，符合工业设计/产品工程文档风格。`,
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
      description: '项目背景调研。仅凭项目名称推断产品类型，生成包含市场背景、用户画像、现有痛点、工程约束、本项目切入点的 800-1000 字深度调研报告。',
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
