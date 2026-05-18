import { Idea } from '../useAppStore';
import { batchGenerateEmbeddings, getCachedEmbeddings, saveEmbeddings, updateIdeaEmbedding } from './embeddingService';
import { generateInsights as generateRawInsights, InsightResult } from './insightEngine';
import { generateInsights as generateLLMInsights, LLMInsight } from './llmIntegration';
import { findSimilarIdeas, getRelevantIdeas, keywordSearch, SearchResult } from './semanticSearch';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface AISearchResult {
  query: string;
  results: SearchResult[];
  totalResults: number;
  searchType: 'semantic' | 'keyword';
}

export interface AIInsightResult {
  insights: LLMInsight[];
  rawInsights: InsightResult;
  generatedAt: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hasOpenAIKey(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_OPENAI_API_KEY);
}

// ─── AI Service ───────────────────────────────────────────────────────────────

export class AIService {
  /** Ensure embeddings exist for all ideas (only generates what is missing/stale) */
  static async initializeEmbeddings(ideas: Idea[]): Promise<void> {
    if (!hasOpenAIKey() || ideas.length === 0) return;
    try {
      const cached = await getCachedEmbeddings();
      const stale = ideas.filter(idea => {
        const c = cached.find(e => e.id === idea.id);
        return !c || c.updatedAt < idea.updatedAt;
      });
      if (stale.length === 0) return;
      const fresh = await batchGenerateEmbeddings(stale);
      // Merge: keep unchanged cached entries, replace/add fresh
      const freshIds = new Set(fresh.map(e => e.id));
      const merged = [...cached.filter(e => !freshIds.has(e.id)), ...fresh];
      await saveEmbeddings(merged);
    } catch (e) {
      console.error('initializeEmbeddings', e);
    }
  }

  /** Re-embed a single idea after it changes */
  static async updateIdeaEmbedding(idea: Idea): Promise<void> {
    if (!hasOpenAIKey()) return;
    try { await updateIdeaEmbedding(idea); } catch (e) { console.error('updateIdeaEmbedding', e); }
  }

  /** Semantic search, falls back to keyword search if no OpenAI key */
  static async searchIdeas(query: string, ideas: Idea[], k = 5): Promise<AISearchResult> {
    if (!hasOpenAIKey()) {
      const kw = keywordSearch(query, ideas).slice(0, k);
      return { query, results: kw, totalResults: kw.length, searchType: 'keyword' };
    }

    try {
      const sem = await getRelevantIdeas(query, ideas, k);
      if (sem.length > 0) return { query, results: sem, totalResults: sem.length, searchType: 'semantic' };
    } catch { /* fall through */ }

    const kw = keywordSearch(query, ideas).slice(0, k);
    return { query, results: kw, totalResults: kw.length, searchType: 'keyword' };
  }

  /** Find ideas similar to a given idea */
  static async findSimilarIdeas(target: Idea, ideas: Idea[], k = 5): Promise<SearchResult[]> {
    try { return await findSimilarIdeas(target, ideas, k); } catch { return []; }
  }

  /** Full insight pipeline: graph analysis + optional LLM narration */
  static async generateInsights(ideas: Idea[]): Promise<AIInsightResult> {
    const EMPTY_RAW: InsightResult = {
      missingConnections: [], clusters: [], isolatedIdeas: [], crossDomainPatterns: [],
      summary: { totalIdeas: ideas.length, connectedIdeas: 0, isolatedIdeas: 0, totalConnections: 0, averageConnections: 0 },
    };
    try {
      const rawInsights = await generateRawInsights(ideas);
      const insights = hasOpenAIKey() ? await generateLLMInsights(rawInsights) : [];
      return { insights, rawInsights, generatedAt: Date.now() };
    } catch (e) {
      console.error('generateInsights', e);
      return { insights: [], rawInsights: EMPTY_RAW, generatedAt: Date.now() };
    }
  }

  static async clearEmbeddingCache(): Promise<void> {
    try { await saveEmbeddings([]); } catch { /* ignore */ }
  }
}

// Re-export everything consumers might need
export * from './embeddingService';
export { generateInsights as generateRawInsights } from './insightEngine';
export * from './llmIntegration';
export * from './semanticSearch';

