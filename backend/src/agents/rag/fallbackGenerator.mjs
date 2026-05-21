import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { BaseAgent } from '../base.mjs';
import { genLLM } from '../llms.mjs';
import { getLLMText, parseAnswer } from './helpers.mjs';
import { getAgentConfig } from '../config.mjs';

const CFG = getAgentConfig('fallback_generator');

class FallbackGeneratorAgent extends BaseAgent {
  constructor() {
    super(CFG);
  }

  async execute(state) {
    const lang = state.lang === 'en' ? '英文' : '中文';
    const prompt = CFG.systemPrompt.replace('{lang}', lang);
    const res = await genLLM.invoke([
      new SystemMessage(prompt),
      new HumanMessage(state.rewrittenQuery || state.query),
    ]);

    return parseAnswer(getLLMText(res));
  }
}

export const fallbackGeneratorAgent = new FallbackGeneratorAgent();
