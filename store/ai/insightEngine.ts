import { Idea } from '../useAppStore';
import { getCachedEmbeddings, cosineSimilarity, IdeaEmbedding } from './embeddingService';

export interface MissingConnection {
  idea1: Idea;
  idea2: Idea;
  similarity: number;
  reason: string;
}

export interface Cluster {
  id: string;
  name: string;
  ideas: Idea[];
  theme: string;
  confidence: number;
  tags: string[];
}

export interface CrossDomainPattern {
  domains: string[];
  ideas: Idea[];
  pattern: string;
  confidence: number;
}

export interface InsightResult {
  missingConnections: MissingConnection[];
  clusters: Cluster[];
  isolatedIdeas: Idea[];
  crossDomainPatterns: CrossDomainPattern[];
  summary: {
    totalIdeas: number;
    connectedIdeas: number;
    isolatedIdeas: number;
    totalConnections: number;
    averageConnections: number;
  };
}

/**
 * Find similar ideas that are not connected
 */
export async function findMissingConnections(
  ideas: Idea[], 
  threshold: number = 0.7
): Promise<MissingConnection[]> {
  const embeddings = await getCachedEmbeddings();
  const missing: MissingConnection[] = [];
  
  for (let i = 0; i < ideas.length; i++) {
    for (let j = i + 1; j < ideas.length; j++) {
      const idea1 = ideas[i];
      const idea2 = ideas[j];
      
      // Skip if already connected
      if (idea1.connections.includes(idea2.id)) continue;
      
      // Get embeddings
      const emb1 = embeddings.find(e => e.id === idea1.id);
      const emb2 = embeddings.find(e => e.id === idea2.id);
      
      if (!emb1 || !emb2) continue;
      
      // Calculate semantic similarity
      const similarity = cosineSimilarity(emb1.embedding, emb2.embedding);
      
      if (similarity >= threshold) {
        const reason = generateConnectionReason(idea1, idea2, similarity);
        missing.push({
          idea1,
          idea2,
          similarity,
          reason
        });
      }
    }
  }
  
  return missing.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Detect clusters/themes using k-means clustering on embeddings
 */
export async function detectClusters(
  ideas: Idea[], 
  minClusterSize: number = 2
): Promise<Cluster[]> {
  const embeddings = await getCachedEmbeddings();
  if (ideas.length < minClusterSize * 2) return [];
  
  // Simple clustering based on similarity thresholds
  const clusters: Cluster[] = [];
  const processed = new Set<string>();
  
  for (const idea of ideas) {
    if (processed.has(idea.id)) continue;
    
    const ideaEmbedding = embeddings.find(e => e.id === idea.id);
    if (!ideaEmbedding) continue;
    
    // Find similar ideas
    const similarIdeas: Idea[] = [idea];
    const similarEmbeddings = [ideaEmbedding];
    
    for (const otherIdea of ideas) {
      if (processed.has(otherIdea.id) || otherIdea.id === idea.id) continue;
      
      const otherEmbedding = embeddings.find(e => e.id === otherIdea.id);
      if (!otherEmbedding) continue;
      
      const similarity = cosineSimilarity(ideaEmbedding.embedding, otherEmbedding.embedding);
      
      if (similarity >= 0.6) {
        similarIdeas.push(otherIdea);
        similarEmbeddings.push(otherEmbedding);
        processed.add(otherIdea.id);
      }
    }
    
    processed.add(idea.id);
    
    // Only create cluster if it has enough ideas
    if (similarIdeas.length >= minClusterSize) {
      const cluster = generateCluster(similarIdeas, similarEmbeddings);
      clusters.push(cluster);
    }
  }
  
  return clusters;
}

/**
 * Find isolated ideas (no connections)
 */
export function findIsolatedIdeas(ideas: Idea[]): Idea[] {
  return ideas.filter(idea => idea.connections.length === 0);
}

/**
 * Identify cross-domain patterns
 */
export async function findCrossDomainPatterns(
  ideas: Idea[], 
  embeddings: IdeaEmbedding[]
): Promise<CrossDomainPattern[]> {
  const patterns: CrossDomainPattern[] = [];
  
  // Group ideas by folders
  const folderGroups = new Map<string, Idea[]>();
  ideas.forEach(idea => {
    if (!folderGroups.has(idea.folderId)) {
      folderGroups.set(idea.folderId, []);
    }
    folderGroups.get(idea.folderId)!.push(idea);
  });
  
  // Find patterns between different folders
  const folderIds = Array.from(folderGroups.keys());
  
  for (let i = 0; i < folderIds.length; i++) {
    for (let j = i + 1; j < folderIds.length; j++) {
      const folder1Ideas = folderGroups.get(folderIds[i])!;
      const folder2Ideas = folderGroups.get(folderIds[j])!;
      
      // Find cross-similarities
      const crossSimilarities: Array<{
        idea1: Idea;
        idea2: Idea;
        similarity: number;
      }> = [];
      
      for (const idea1 of folder1Ideas) {
        for (const idea2 of folder2Ideas) {
          const emb1 = embeddings.find(e => e.id === idea1.id);
          const emb2 = embeddings.find(e => e.id === idea2.id);
          
          if (emb1 && emb2) {
            const similarity = cosineSimilarity(emb1.embedding, emb2.embedding);
            if (similarity >= 0.5) {
              crossSimilarities.push({ idea1, idea2, similarity });
            }
          }
        }
      }
      
      // If we have enough cross-similarities, create a pattern
      if (crossSimilarities.length >= 2) {
        const avgSimilarity = crossSimilarities.reduce((sum, s) => sum + s.similarity, 0) / crossSimilarities.length;
        
        patterns.push({
          domains: [`Folder ${folderIds[i]}`, `Folder ${folderIds[j]}`],
          ideas: [...new Set([...folder1Ideas, ...folder2Ideas])],
          pattern: generatePatternDescription(crossSimilarities),
          confidence: avgSimilarity
        });
      }
    }
  }
  
  return patterns.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Generate comprehensive insights
 */
export async function generateInsights(ideas: Idea[]): Promise<InsightResult> {
  const embeddings = await getCachedEmbeddings();
  
  const [missingConnections, clusters, isolatedIdeas, crossDomainPatterns] = await Promise.all([
    findMissingConnections(ideas),
    detectClusters(ideas),
    Promise.resolve(findIsolatedIdeas(ideas)),
    findCrossDomainPatterns(ideas, embeddings)
  ]);
  
  const summary = {
    totalIdeas: ideas.length,
    connectedIdeas: ideas.filter(i => i.connections.length > 0).length,
    isolatedIdeas: isolatedIdeas.length,
    totalConnections: ideas.reduce((sum, i) => sum + i.connections.length, 0) / 2, // Divide by 2 since connections are bidirectional
    averageConnections: ideas.length > 0 ? ideas.reduce((sum, i) => sum + i.connections.length, 0) / ideas.length : 0
  };
  
  return {
    missingConnections,
    clusters,
    isolatedIdeas,
    crossDomainPatterns,
    summary
  };
}

// Helper functions
function generateConnectionReason(idea1: Idea, idea2: Idea, similarity: number): string {
  const reasons = [];
  
  // Check for common tags
  const commonTags = idea1.tags.filter(tag => idea2.tags.includes(tag));
  if (commonTags.length > 0) {
    reasons.push(`share tags: ${commonTags.join(', ')}`);
  }
  
  // Check for similar content themes
  if (similarity > 0.8) {
    reasons.push('very similar content');
  } else if (similarity > 0.7) {
    reasons.push('similar themes');
  }
  
  // Check for same folder
  if (idea1.folderId === idea2.folderId) {
    reasons.push('same folder');
  }
  
  return reasons.length > 0 ? reasons.join(', ') : 'semantically similar';
}

function generateCluster(ideas: Idea[], embeddings: IdeaEmbedding[]): Cluster {
  // Extract common tags
  const allTags = ideas.flatMap(i => i.tags);
  const tagCounts = new Map<string, number>();
  allTags.forEach(tag => {
    tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
  });
  
  const commonTags = Array.from(tagCounts.entries())
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag, _]) => tag);
  
  // Calculate average similarity for confidence
  let totalSimilarity = 0;
  let comparisons = 0;
  
  for (let i = 0; i < embeddings.length; i++) {
    for (let j = i + 1; j < embeddings.length; j++) {
      totalSimilarity += cosineSimilarity(embeddings[i].embedding, embeddings[j].embedding);
      comparisons++;
    }
  }
  
  const confidence = comparisons > 0 ? totalSimilarity / comparisons : 0;
  
  return {
    id: `cluster_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: commonTags.length > 0 ? `${commonTags.join(' & ')} Theme` : 'Related Ideas',
    ideas,
    theme: commonTags.join(', ') || 'Similar concepts',
    confidence,
    tags: commonTags
  };
}

function generatePatternDescription(similarities: Array<{idea1: Idea, idea2: Idea, similarity: number}>): string {
  const avgSimilarity = similarities.reduce((sum, s) => sum + s.similarity, 0) / similarities.length;
  
  if (avgSimilarity > 0.8) {
    return 'Strong conceptual overlap between domains';
  } else if (avgSimilarity > 0.6) {
    return 'Moderate thematic connections';
  } else {
    return 'Subtle relationships between domains';
  }
}
