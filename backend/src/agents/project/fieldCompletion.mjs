import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { BaseAgent } from '../base.mjs';
import { completeLLM } from '../llms.mjs';

const chain = RunnableSequence.from([
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
  completeLLM,
  new StringOutputParser(),
]);

class FieldCompletionAgent extends BaseAgent {
  constructor() {
    super({
      id:          'field_completion',
      name:        'FieldCompletionAgent',
      group:       'project',
      description: 'AI 字段补全。基于项目已知字段上下文，为指定字段生成 300-500 字的专业描述，符合工程文档风格。',
      inputSchema: {
        context:    'string · 项目已有字段的拼接上下文',
        fieldLabel: 'string · 需要补全的字段中文名称',
      },
      outputSchema: {
        text: 'string · 300-500 字的字段描述',
      },
      connects_to: [],
    });
    this._chain = chain;
  }

  async execute(input) {
    const text = await this._chain.invoke(
      { context: input.context ?? '', fieldLabel: input.fieldLabel ?? '' },
      { runName: `FieldCompletion · ${input.fieldLabel ?? ''}` },
    );
    return { text };
  }
}

export const fieldCompletionAgent = new FieldCompletionAgent();
