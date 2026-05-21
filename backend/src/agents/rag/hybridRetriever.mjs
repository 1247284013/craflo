import { BaseAgent } from '../base.mjs';
import { dedup, inferToolTerms } from './helpers.mjs';
import { getAgentConfig } from '../config.mjs';

const CFG = getAgentConfig('hybrid_retriever');
import {
  vectorSearchKnowledge,
  vectorSearchCommunity,
  keywordSearchKnowledge,
  keywordSearchCommunity,
} from '../../tools/supabaseSearch.mjs';

class HybridRetrieverAgent extends BaseAgent {
  constructor() {
    super(CFG);
  }

  async execute(state) {
    const inferredTerms = inferToolTerms(state.query, state.keywords);
    const allQueries = [
      state.query,
      state.rewrittenQuery,
      ...state.searchQueries,
      inferredTerms.join(' '),
    ].filter(Boolean);
    const allKeywords = [...new Set([...(state.keywords ?? []), ...inferredTerms])];

    const [vectorNodeResults, vectorPostResults, kwNodeResults, kwPostResults] =
      await Promise.allSettled([
        (async () => {
          const results = await Promise.all(
            allQueries.slice(0, 4).map((q) => vectorSearchKnowledge(q, {
              threshold: CFG.retrievalConfig.vectorKnowledgeThreshold,
              count:     CFG.retrievalConfig.vectorKnowledgeCount,
            })),
          );
          return dedup(results.flat());
        })(),
        vectorSearchCommunity(state.rewrittenQuery, {
          threshold: CFG.retrievalConfig.vectorCommunityThreshold,
          count:     CFG.retrievalConfig.vectorCommunityCount,
        }),
        keywordSearchKnowledge(allKeywords),
        keywordSearchCommunity(allKeywords),
      ]);

    return {
      rawNodes: dedup([
        ...(vectorNodeResults.status === 'fulfilled' ? vectorNodeResults.value : []),
        ...(kwNodeResults.status    === 'fulfilled' ? kwNodeResults.value    : []),
      ]),
      rawPosts: dedup([
        ...(vectorPostResults.status === 'fulfilled' ? vectorPostResults.value : []),
        ...(kwPostResults.status     === 'fulfilled' ? kwPostResults.value     : []),
      ]),
    };
  }
}

export const hybridRetrieverAgent = new HybridRetrieverAgent();
