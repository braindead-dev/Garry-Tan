import axios from 'axios';
import { EmbeddingTaskType } from '../types.js';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is not set');
}

const API_KEY = process.env.GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent';

const OUTPUT_DIMENSIONALITY = 768;

/**
 * Generates a vector embedding for a given text using the Gemini REST API.
 * @param text The text to embed.
 * @param taskType The intended use case for the embedding to optimize performance.
 * @returns A promise that resolves to a normalized vector embedding.
 */
export async function generateEmbedding(text: string, taskType: EmbeddingTaskType): Promise<number[]> {
  try {
    const response = await axios.post(
      `${API_URL}?key=${API_KEY}`,
      {
        model: 'models/gemini-embedding-001',
        content: {
          parts: [{ text }],
        },
        task_type: taskType,
        output_dimensionality: OUTPUT_DIMENSIONALITY,
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const embedding = response.data.embedding.values;

    // As per Gemini docs, embeddings with controlled dimensionality must be normalized manually.
    const norm = Math.sqrt(embedding.reduce((sum: number, val: number) => sum + val * val, 0));
    if (norm === 0) return embedding; // Avoid division by zero

    return embedding.map((val: number) => val / norm);

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error generating embedding:', error.response?.data || error.message);
    } else {
      console.error('An unexpected error occurred:', error);
    }
    throw new Error('Failed to generate embedding.');
  }
} 