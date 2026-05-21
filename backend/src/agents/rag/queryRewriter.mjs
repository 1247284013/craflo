import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { BaseAgent } from '../base.mjs';
import { fastLLM } from '../llms.mjs';
import { extractJSON, getLLMText, inferToolTerms } from './helpers.mjs';
import { getAgentConfig } from '../config.mjs';

const CFG = getAgentConfig('query_rewriter');

class QueryRewriterAgent extends BaseAgent {
  constructor() {
    super(CFG);
  }

  async execute(state) {
    const issueDesc = state.queryIssues?.length > 0
      ? `检测到的问题：${state.queryIssues.join('、')}`
      : '查询无明显问题';

    const res = await fastLLM.invoke([
      new SystemMessage(CFG.systemPrompt),
      new HumanMessage(`原始查询：${state.query}\n意图：${state.intent}\n${issueDesc}`),
    ]);

    const parsed = extractJSON(getLLMText(res), {
      rewrittenQuery: state.query,
      searchQueries:  [state.query],
      keywords:       [state.query],
    });

    const inferred = inferToolTerms(state.query, parsed.keywords ?? []);

    return {
      rewrittenQuery: parsed.rewrittenQuery ?? state.query,
      searchQueries:  [...(parsed.searchQueries ?? [state.query]), ...inferred],
      keywords:       [...new Set([...(parsed.keywords ?? [state.query]), ...inferred])],
    };
  }
}

export const queryRewriterAgent = new QueryRewriterAgent();
