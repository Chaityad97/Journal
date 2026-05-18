import OpenAI from 'openai';
import { InsightResult, MissingConnection, Cluster, CrossDomainPattern } from './insightEngine';

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Missing EXPO_PUBLIC_OPENAI_API_KEY. AI insight generation is unavailable until it is configured.'
    );
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
    });
  }

  return openaiClient;
}

const LLM_MODEL = 'gpt-3.5-turbo';

export interface LLMInsight {
  title: string;
  content: string;
  type: 'missing-connections' | 'clusters' | 'isolated-ideas' | 'cross-domain' | 'summary';
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
}

/**
 * Generate natural language insights from structured data
 */
export async function generateInsights(
  insightResult: InsightResult
): Promise<LLMInsight[]> {
  const insights: LLMInsight[] = [];
  
  // Generate insights for missing connections
  if (insightResult.missingConnections.length > 0) {
    const missingConnectionInsight = await generateMissingConnectionsInsight(
      insightResult.missingConnections.slice(0, 5) // Limit to top 5
    );
    if (missingConnectionInsight) insights.push(missingConnectionInsight);
  }
  
  // Generate insights for clusters
  if (insightResult.clusters.length > 0) {
    const clusterInsight = await generateClustersInsight(insightResult.clusters);
    if (clusterInsight) insights.push(clusterInsight);
  }
  
  // Generate insights for isolated ideas
  if (insightResult.isolatedIdeas.length > 0) {
    const isolatedInsight = await generateIsolatedIdeasInsight(insightResult.isolatedIdeas);
    if (isolatedInsight) insights.push(isolatedInsight);
  }
  
  // Generate insights for cross-domain patterns
  if (insightResult.crossDomainPatterns.length > 0) {
    const crossDomainInsight = await generateCrossDomainInsight(
      insightResult.crossDomainPatterns.slice(0, 3) // Limit to top 3
    );
    if (crossDomainInsight) insights.push(crossDomainInsight);
  }
  
  // Generate summary insight
  const summaryInsight = await generateSummaryInsight(insightResult.summary);
  if (summaryInsight) insights.push(summaryInsight);
  
  return insights.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

/**
 * Generate insight about missing connections
 */
async function generateMissingConnectionsInsight(
  connections: MissingConnection[]
): Promise<LLMInsight | null> {
  if (connections.length === 0) return null;
  
  const prompt = `
You are analyzing a user's journal ideas and found ${connections.length} pairs of ideas that are very similar but not connected.

Here are the top similar but unconnected ideas:
${connections.map((conn, i) => `
${i + 1}. "${conn.idea1.title || conn.idea1.content.substring(0, 50)}..." and "${conn.idea2.title || conn.idea2.content.substring(0, 50)}..."
   Similarity: ${(conn.similarity * 100).toFixed(1)}%
   Reason: ${conn.reason}
`).join('\n')}

Generate a concise insight about these missing connections. Focus on:
1. What themes or patterns the user is exploring but not connecting
2. Why connecting these ideas might be valuable
3. A gentle suggestion to consider making these connections

Keep it to 2-3 sentences, friendly and encouraging tone.
  `;

  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: LLM_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant for a journaling app. Provide insights about the user\'s thinking patterns and idea connections.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    return {
      title: 'Missing Connections',
      content: content.trim(),
      type: 'missing-connections',
      priority: connections.length > 3 ? 'high' : 'medium',
      actionable: true
    };
  } catch (error) {
    console.error('Error generating missing connections insight:', error);
    return null;
  }
}

/**
 * Generate insight about clusters
 */
async function generateClustersInsight(clusters: Cluster[]): Promise<LLMInsight | null> {
  if (clusters.length === 0) return null;
  
  const prompt = `
You are analyzing a user's journal ideas and found ${clusters.length} thematic clusters of related ideas.

Here are the clusters:
${clusters.map((cluster, i) => `
${i + 1}. ${cluster.name}
   Ideas: ${cluster.ideas.length}
   Theme: ${cluster.theme}
   Confidence: ${(cluster.confidence * 100).toFixed(1)}%
   Common tags: ${cluster.tags.join(', ')}
`).join('\n')}

Generate a concise insight about these clusters. Focus on:
1. What main themes or topics the user is exploring
2. How organized their thinking appears to be
3. Any interesting patterns in how they group ideas

Keep it to 2-3 sentences, encouraging tone.
  `;

  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: LLM_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant for a journaling app. Provide insights about the user\'s thinking patterns and idea organization.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    return {
      title: 'Idea Clusters',
      content: content.trim(),
      type: 'clusters',
      priority: 'medium',
      actionable: false
    };
  } catch (error) {
    console.error('Error generating clusters insight:', error);
    return null;
  }
}

/**
 * Generate insight about isolated ideas
 */
async function generateIsolatedIdeasInsight(isolatedIdeas: any[]): Promise<LLMInsight | null> {
  if (isolatedIdeas.length === 0) return null;
  
  const prompt = `
You are analyzing a user's journal ideas and found ${isolatedIdeas.length} isolated ideas that have no connections to other ideas.

Here are some examples of isolated ideas:
${isolatedIdeas.slice(0, 3).map((idea, i) => `
${i + 1}. "${idea.title || idea.content.substring(0, 50)}..."
   Tags: ${idea.tags.join(', ')}
   Created: ${new Date(idea.createdAt).toLocaleDateString()}
`).join('\n')}

Generate a concise insight about these isolated ideas. Focus on:
1. Why these ideas might be isolated
2. Whether this represents untapped potential or standalone thoughts
3. A gentle suggestion if appropriate

Keep it to 2-3 sentences, supportive tone.
  `;

  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: LLM_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant for a journaling app. Provide insights about the user\'s thinking patterns and idea connections.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    return {
      title: 'Isolated Ideas',
      content: content.trim(),
      type: 'isolated-ideas',
      priority: isolatedIdeas.length > 5 ? 'medium' : 'low',
      actionable: false
    };
  } catch (error) {
    console.error('Error generating isolated ideas insight:', error);
    return null;
  }
}

/**
 * Generate insight about cross-domain patterns
 */
async function generateCrossDomainInsight(patterns: CrossDomainPattern[]): Promise<LLMInsight | null> {
  if (patterns.length === 0) return null;
  
  const prompt = `
You are analyzing a user's journal ideas and found ${patterns.length} cross-domain patterns where ideas from different categories are related.

Here are the patterns:
${patterns.map((pattern, i) => `
${i + 1}. ${pattern.domains.join(' + ')}
   Ideas involved: ${pattern.ideas.length}
   Pattern: ${pattern.pattern}
   Confidence: ${(pattern.confidence * 100).toFixed(1)}%
`).join('\n')}

Generate a concise insight about these cross-domain connections. Focus on:
1. What interdisciplinary thinking the user is doing
2. How this shows creative or analytical thinking
3. Why these connections might be valuable

Keep it to 2-3 sentences, encouraging tone.
  `;

  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: LLM_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant for a journaling app. Provide insights about the user\'s thinking patterns and interdisciplinary connections.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    return {
      title: 'Cross-Domain Patterns',
      content: content.trim(),
      type: 'cross-domain',
      priority: 'high',
      actionable: false
    };
  } catch (error) {
    console.error('Error generating cross-domain insight:', error);
    return null;
  }
}

/**
 * Generate summary insight
 */
async function generateSummaryInsight(summary: InsightResult['summary']): Promise<LLMInsight | null> {
  const prompt = `
You are analyzing a user's journal idea network. Here are the key statistics:

- Total ideas: ${summary.totalIdeas}
- Connected ideas: ${summary.connectedIdeas}
- Isolated ideas: ${summary.isolatedIdeas}
- Total connections: ${summary.totalConnections}
- Average connections per idea: ${summary.averageConnections.toFixed(2)}

Generate a concise summary insight about the user's overall idea network health and organization. Focus on:
1. How well-connected their ideas are
2. The overall health of their knowledge graph
3. One suggestion for improvement if needed

Keep it to 2-3 sentences, encouraging and constructive tone.
  `;

  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: LLM_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant for a journaling app. Provide insights about the user\'s overall idea network and organization.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    return {
      title: 'Network Overview',
      content: content.trim(),
      type: 'summary',
      priority: 'medium',
      actionable: false
    };
  } catch (error) {
    console.error('Error generating summary insight:', error);
    return null;
  }
}
