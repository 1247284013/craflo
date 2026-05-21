import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { BaseAgent } from '../base.mjs';
import { learningLLM } from '../llms.mjs';

// ── Diff-based approach: LLM only returns week numbers to mark, not the full array ──
// This keeps output tiny and avoids JSON truncation from token limits.
const chain = RunnableSequence.from([
  PromptTemplate.fromTemplate(
    `你是学习路径助手。根据用户描述，判断哪些周的任务已经掌握，应标记为已完成。

当前任务列表（周号 + 标题）：
{taskSummary}

用户描述（已掌握 / 想跳过的内容）：
{userInput}

规则：
1. 找出与用户描述匹配的任务（按内容相关性判断，不一定是完全一致的文字）
2. 返回一个 JSON 对象，包含以下字段：
   - "completed": number[]  → 需要标记为 _autoCompleted 的周号数组
   - "reason": string       → 一句话解释你的判断逻辑（中文）

只返回 JSON 对象，不要任何解释性文字。例：
{{"completed": [1, 2, 3], "reason": "用户已掌握 Figma 基础操作和组件系统，对应第1-3周任务。"}}`,
  ),
  learningLLM,
  new StringOutputParser(),
]);

class PathAdjusterAgent extends BaseAgent {
  constructor() {
    super({
      id:          'path_adjuster',
      name:        'LearningPathAgent',
      group:       'learning',
      description: '学习路径调整。根据用户自述的已掌握内容，精确标记对应周任务为已完成或已跳过（_autoCompleted: true），自动更新任务列表，不改变总任务数量和顺序。',
      inputSchema: {
        tasks:     'WeeklyTask[] · 当前完整的学习路径任务列表',
        userInput: 'string · 用户描述的已掌握技能或希望跳过的内容',
      },
      outputSchema: {
        tasks: 'WeeklyTask[] · 调整后的任务列表，修改项含 _autoCompleted/_modified 标记',
      },
      connects_to: [],
    });
    this._chain = chain;
  }

  async execute(input) {
    const tasks = input.tasks ?? [];

    // Send only a compact summary to LLM — week number + title
    const taskSummary = tasks.map(t => `W${t.week}: ${t.title}`).join('\n');

    const raw = await this._chain.invoke(
      { taskSummary, userInput: input.userInput ?? '' },
      { runName: `AdjustLearningPath · "${(input.userInput ?? '').slice(0, 40)}"` },
    );

    // Parse the diff from LLM
    let completedWeeks = [];
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        completedWeeks = Array.isArray(parsed.completed) ? parsed.completed : [];
      }
    } catch {
      console.warn('[pathAdjuster] Failed to parse LLM diff, returning tasks unchanged.');
    }

    // Apply the diff locally — mark matching weeks as _autoCompleted
    const completedSet = new Set(completedWeeks);
    const adjusted = tasks.map(task => {
      if (!completedSet.has(task.week)) return task;
      return {
        ...task,
        completed:      true,
        _autoCompleted: true,
        _modified:      true,
      };
    });

    return { tasks: adjusted };
  }
}

export const pathAdjusterAgent = new PathAdjusterAgent();
