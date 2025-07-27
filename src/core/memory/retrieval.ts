import { ChatEvent, Episode, ScoredEpisode, MemoryConfig, EmbeddingTaskType } from './types.js';
import { findSimilarEpisodes, incrementEpisodeUsage } from './storage/supabase.js';
import { generateEmbedding } from './services/embedding.js';

/**
 * Calculates the cosine similarity between two vectors.
 * Assumes vectors are normalized (which our embedding service does).
 * @param vecA The first vector.
 * @param vecB The second vector.
 * @returns The cosine similarity score.
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
    }
    return dotProduct;
}

/**
 * Retrieves the most relevant episodes from memory based on a query event.
 *
 * @param queryEvent The incoming chat event that triggers the retrieval.
 * @param memoryConfig The current memory configuration.
 * @returns A promise that resolves to an array of the most relevant episode summaries.
 */
export async function retrieveRelevantMemories(
    queryEvent: ChatEvent,
    memoryConfig: MemoryConfig
): Promise<Episode[]> {
    // 1. Get query embedding for the incoming message content
    const queryEmbedding = await generateEmbedding(
        queryEvent.content,
        EmbeddingTaskType.RETRIEVAL_QUERY
    );

    // 2. Fetch a candidate set of episodes from the vector DB
    // We fetch more than we need to allow for re-ranking.
    const candidateEpisodes = await findSimilarEpisodes(queryEmbedding, memoryConfig.maxRetrievedEpisodes * 3);

    if (candidateEpisodes.length === 0) {
        return [];
    }

    const now = queryEvent.timestamp;
    const scoredEpisodes: ScoredEpisode[] = [];

    // 3. Score each candidate episode using the composite formula
    for (const episode of candidateEpisodes) {
        // Recency Score (R_i)
        const ageInSeconds = now - episode.timestamp;
        const recencyScore = Math.exp(-ageInSeconds / memoryConfig.ltmImportanceDecayTau);

        // Importance Score (I_i) - with time decay
        const decayedImportance = episode.importance * Math.exp(-ageInSeconds / memoryConfig.ltmImportanceDecayTau);
        if (decayedImportance < 0.05) continue; // Episode has faded

        // Relevance Score (Cosine Similarity)
        const relevanceScore = cosineSimilarity(queryEmbedding, episode.embedding);

        // Usage Score (U_i)
        const usageScore = Math.log(1 + episode.usage_count);

        // Composite Score (S_i)
        const totalScore =
            memoryConfig.retrievalWeightRecency * recencyScore +
            memoryConfig.retrievalWeightImportance * decayedImportance +
            memoryConfig.retrievalWeightRelevance * relevanceScore +
            memoryConfig.retrievalWeightUsage * usageScore;

        scoredEpisodes.push({ ...episode, retrieval_score: totalScore });
    }

    // 4. Sort by final score and take the top N
    const topEpisodes = scoredEpisodes
        .sort((a, b) => b.retrieval_score - a.retrieval_score)
        .slice(0, memoryConfig.maxRetrievedEpisodes);

    // 5. Increment usage count for the retrieved episodes (fire-and-forget)
    topEpisodes.forEach(ep => {
        incrementEpisodeUsage(ep.ep_id).catch(err => {
            console.error(`Failed to increment usage for episode ${ep.ep_id}:`, err)
        });
    });

    console.log(`Retrieved ${topEpisodes.length} relevant memories.`);

    return topEpisodes;
} 