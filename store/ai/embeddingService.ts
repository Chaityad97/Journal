import OpenAI from 'openai';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Idea } from '../useAppStore';

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Missing EXPO_PUBLIC_OPENAI_API_KEY. AI embeddings are unavailable until it is configured.'
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

export interface IdeaEmbedding {
  id: string;
  embedding: number[];
  text: string;
  updatedAt: number;
}

const EMBEDDING_CACHE_KEY = 'idea_embeddings';
const EMBEDDING_MODEL = 'text-embedding-3-small'; // 1536 dimensions, cheaper and faster

/**
 * Generate embedding for a single idea
 */
export async function generateIdeaEmbedding(idea: Idea): Promise<IdeaEmbedding> {
  const combinedText = [
    idea.title || '',
    idea.content,
    ...idea.tags
  ].filter(Boolean).join(' ');

  try {
    const openai = getOpenAIClient();
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: combinedText,
    });

    return {
      id: idea.id,
      embedding: response.data[0].embedding,
      text: combinedText,
      updatedAt: Date.now(),
    };
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Generate embedding for user query
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  try {
    const openai = getOpenAIClient();
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: query,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating query embedding:', error);
    throw error;
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  
  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Get cached embeddings for all ideas
 */
export async function getCachedEmbeddings(): Promise<IdeaEmbedding[]> {
  try {
    const cached = await AsyncStorage.getItem(EMBEDDING_CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch (error) {
    console.error('Error loading cached embeddings:', error);
    return [];
  }
}

/**
 * Save embeddings to cache
 */
export async function saveEmbeddings(embeddings: IdeaEmbedding[]): Promise<void> {
  try {
    await AsyncStorage.setItem(EMBEDDING_CACHE_KEY, JSON.stringify(embeddings));
  } catch (error) {
    console.error('Error saving embeddings:', error);
  }
}

/**
 * Update or add embedding for a specific idea
 */
export async function updateIdeaEmbedding(idea: Idea): Promise<void> {
  const embeddings = await getCachedEmbeddings();
  const newEmbedding = await generateIdeaEmbedding(idea);
  
  const existingIndex = embeddings.findIndex(e => e.id === idea.id);
  if (existingIndex >= 0) {
    embeddings[existingIndex] = newEmbedding;
  } else {
    embeddings.push(newEmbedding);
  }
  
  await saveEmbeddings(embeddings);
}

/**
 * Batch generate embeddings for multiple ideas
 */
export async function batchGenerateEmbeddings(ideas: Idea[]): Promise<IdeaEmbedding[]> {
  const embeddings: IdeaEmbedding[] = [];
  
  // Process in batches to avoid rate limits
  const batchSize = 5;
  for (let i = 0; i < ideas.length; i += batchSize) {
    const batch = ideas.slice(i, i + batchSize);
    const batchEmbeddings = await Promise.all(
      batch.map(idea => generateIdeaEmbedding(idea))
    );
    embeddings.push(...batchEmbeddings);
    
    // Small delay between batches
    if (i + batchSize < ideas.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return embeddings;
}
