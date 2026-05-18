/**
 * Learning Path chain (LCEL):
 *   • adjustLearningPathChain — rewrites weekly tasks based on user's
 *     prior knowledge, marking mastered items as completed/removed.
 *
 * Traced automatically by LangSmith (tool name: adjustLearningPath).
 */
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';

const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-2.5-flash',
  apiKey: process.env.GOOGLE_API_KEY,
  temperature: 0.2,
  maxOutputTokens: 4000,
});

export const adjustLearningPathChain = RunnableSequence.from([
  PromptTemplate.fromTemplate(
    `你是学习路径规划助手。根据用户描述的已掌握内容，精确调整以下周任务列表。

当前任务 JSON：
{tasksJson}

用户描述（已掌握 / 想跳过的内容）：
{userInput}

调整规则（严格遵守）：
1. 找到与用户描述匹配的具体任务条目
2. 将已掌握的学习/练习任务的 action 字段设为空字符串，并添加 "_autoCompleted": true
3. 如果某周的所有任务都被标记，则将该周的 completed 设为 true
4. 对所有修改过的任务添加 "_modified": true 标记
5. 不改变任务的周数、顺序和总数量
6. 不添加新任务
7. 未被提到的任务保持完全不变

只返回修改后的完整 JSON 数组，不要任何解释性文字，格式须与输入一致。`,
  ),
  llm,
  new StringOutputParser(),
]);
