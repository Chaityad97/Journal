import { Idea } from '../useAppStore';
import { 
  generateQueryEmbedding, 
  getCachedEmbeddings, 
  cosineSimilarity,
  IdeaEmbedding 
} from './embeddingService';

export interface SearchResult {
  idea: Idea;
  similarity: number;
  matchedText: string;
}

/**
 * Get relevant ideas based on semantic search
 */
export async function getRelevantIdeas(
  query: string, 
  ideas: Idea[], 
  k: number = 5,
  threshold: number = 0.3
): Promise<SearchResult[]> {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateQueryEmbedding(query);
    
    // Get cached embeddings
    const embeddings = await getCachedEmbeddings();
    
    // Calculate similarities
    const results: SearchResult[] = [];
    
    for (const embedding of embeddings) {
      const idea = ideas.find(i => i.id === embedding.id);
      if (!idea) continue;
      
      const similarity = cosineSimilarity(queryEmbedding, embedding.embedding);
      
      if (similarity >= threshold) {
        results.push({
          idea,
          similarity,
          matchedText: embedding.text
        });
      }
    }
    
    // Sort by similarity and return top K
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k);
      
  } catch (error) {
    console.error('Error in semantic search:', error);
    return [];
  }
}

/**
 * Find similar ideas to a given idea
 */
export async function findSimilarIdeas(
  targetIdea: Idea, 
  ideas: Idea[], 
  k: number = 3,
  threshold: number = 0.5
): Promise<SearchResult[]> {
  try {
    const embeddings = await getCachedEmbeddings();
    const targetEmbedding = embeddings.find(e => e.id === targetIdea.id);
    
    if (!targetEmbedding) return [];
    
    const results: SearchResult[] = [];
    
    for (const embedding of embeddings) {
      if (embedding.id === targetIdea.id) continue;
      
      const idea = ideas.find(i => i.id === embedding.id);
      if (!idea) continue;
      
      const similarity = cosineSimilarity(targetEmbedding.embedding, embedding.embedding);
      
      if (similarity >= threshold) {
        results.push({
          idea,
          similarity,
          matchedText: embedding.text
        });
      }
    }
    
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k);
      
  } catch (error) {
    console.error('Error finding similar ideas:', error);
    return [];
  }
}

/**
 * Search ideas by keyword fallback (when embeddings fail)
 */
export function keywordSearch(query: string, ideas: Idea[]): SearchResult[] {
  const queryLower = query.toLowerCase();
  const results: SearchResult[] = [];
  
  for (const idea of ideas) {
    let score = 0;
    let matchedText = '';
    
    // Check title
    if (idea.title?.toLowerCase().includes(queryLower)) {
      score += 3;
      matchedText = idea.title;
    }
    
    // Check content
    if (idea.content.toLowerCase().includes(queryLower)) {
      score += 2;
      if (!matchedText) matchedText = idea.content.substring(0, 100) + '...';
    }
    
    // Check tags
    const matchingTags = idea.tags.filter(tag => 
      tag.toLowerCase().includes(queryLower)
    );
    score += matchingTags.length;
    
    // Check source
    if (idea.source?.toLowerCase().includes(queryLower)) {
      score += 1;
    }
    
    if (score > 0) {
      results.push({
        idea,
        similarity: Math.min(score / 5, 1), // Normalize to 0-1
        matchedText: matchedText || idea.content.substring(0, 100) + '...'
      });
    }
  }
  
  return results.sort((a, b) => b.similarity - a.similarity);
}
