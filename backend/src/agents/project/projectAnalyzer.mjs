import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { BaseAgent } from '../base.mjs';
import { projectLLM } from '../llms.mjs';

const chain = RunnableSequence.from([
  PromptTemplate.fromTemplate(
    `你是设计工程导师，请分析以下项目记录的完整度和质量。

{context}

严格按以下格式返回，每行一项，不加任何额外文字：
FEEDBACK: <2–3 句总体评价，指出亮点和主要问题>
MISSING: <缺失项1> | <缺失项2> | <缺失项3>
RATE: <0–100 的整数，表示项目文档完整度>`,
  ),
  projectLLM,
  new StringOutputParser(),
]);

class ProjectAnalyzerAgent extends BaseAgent {
  constructor() {
    super({
      id:          'project_analyzer',
      name:        'ProjectAnalyzerAgent',
      group:       'project',
      description: '项目质量评估。综合分析整个项目记录的完整度和质量，输出总体评价、缺失项和完整度评分（0-100）。结果传递给 ProjectHandoffAgent 触发 A2A 作品集生成。',
      inputSchema: {
        context: 'string · 所有已填项目字段的拼接文本',
      },
      outputSchema: {
        feedback:       'string · 2-3句总体评价',
        missing:        'string[] · 缺失项列表',
        completionRate: 'number · 0-100 完整度评分',
      },
      connects_to: ['handoff_analysis'],
    });
    this._chain = chain;
  }

  async execute(input) {
    const raw = await this._chain.invoke(
      { context: input.context ?? '' },
      { runName: 'ProjectAnalyzer' },
    );
    const feedbackMatch = raw.match(/FEEDBACK:\s*(.+?)(?=\nMISSING:|$)/s);
    const missingMatch  = raw.match(/MISSING:\s*(.+?)(?=\nRATE:|$)/s);
    const rateMatch     = raw.match(/RATE:\s*(\d+)/);

    return {
      feedback:       feedbackMatch?.[1]?.trim() ?? '',
      missing:        (missingMatch?.[1] ?? '').split('|').map((s) => s.trim()).filter(Boolean),
      completionRate: Math.min(100, Math.max(0, parseInt(rateMatch?.[1] ?? '50', 10))),
    };
  }
}

export const projectAnalyzerAgent = new ProjectAnalyzerAgent();
