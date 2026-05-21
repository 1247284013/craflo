import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { BaseAgent } from '../base.mjs';
import { fastLLM } from '../llms.mjs';
import { extractJSON, getLLMText } from './helpers.mjs';
import { getAgentConfig } from '../config.mjs';

const CFG = getAgentConfig('query_analyzer');

class QueryAnalyzerAgent extends BaseAgent {
  constructor() {
    super(CFG);
  }

  async execute(state) {
    const res = await fastLLM.invoke([
      new SystemMessage(CFG.systemPrompt),
      new HumanMessage(`用户查询：${state.query}`),
    ]);

    const parsed = extractJSON(getLLMText(res), {
      intent: 'general', issues: [], diagnosis: '查询清晰',
    });

    return {
      intent:      parsed.intent    ?? 'general',
      queryIssues: parsed.issues    ?? [],
      diagnosis:   parsed.diagnosis ?? '查询清晰',
    };
  }
}

export const queryAnalyzerAgent = new QueryAnalyzerAgent();
