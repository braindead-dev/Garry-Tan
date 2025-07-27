/**
 * @file src/core/memory/gate.ts
 * @description
 * Implements the "Should I Reply?" gate. This module decides whether the agent should
 * even consider generating a response to a given event.
 *
 * Responsibilities:
 * 1.  Calculating the relevance of an incoming message to the agent's self-concept.
 * 2.  Maintaining a running average embedding of the agent's own sent messages (self-embedding).
 * 3.  Implementing the logistic decision probability formula:
 *     P(reply) = logistic(eta0 + eta1*rho + eta2*is_direct_mention)
 * 4.  Managing the evolution of the shyness parameter (eta0) over time.
 * 5.  Returning a boolean decision on whether to proceed with a reply.
 */
import { ChatEvent, MemoryConfig, EmbeddingTaskType } from './types.js';
import { generateEmbedding } from './services/embedding.js';

let selfEmbedding: number[] | null = null;
let messageCount = 0;

/**
 * Calculates the cosine similarity between two vectors.
 * Assumes vectors are normalized.
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
    }
    return dotProduct;
}

/**
 * The logistic sigmoid function.
 */
function sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
}

/**
 * Updates the agent's self-concept embedding with its own message.
 * This is a running average of the embeddings of the agent's own messages.
 * @param messageContent The content of the message the agent sent.
 */
export async function updateSelfConcept(messageContent: string): Promise<void> {
    const newEmbedding = await generateEmbedding(
        messageContent,
        EmbeddingTaskType.SEMANTIC_SIMILARITY
    );

    if (!selfEmbedding) {
        selfEmbedding = newEmbedding;
    } else {
        // Update the running average
        for (let i = 0; i < selfEmbedding.length; i++) {
            selfEmbedding[i] = (selfEmbedding[i] * messageCount + newEmbedding[i]) / (messageCount + 1);
        }
    }
    messageCount++;
}


/**
 * Decides whether the agent should reply to a message based on a probabilistic gate.
 * @param event The incoming chat event.
 * @param config The memory configuration with gate parameters.
 * @returns A boolean indicating whether to reply.
 */
export async function shouldReplyGate(event: ChatEvent, config: MemoryConfig): Promise<boolean> {
    // Always reply if directly mentioned
    if (event.is_mention) {
        console.log('Gate: Auto-replying due to direct mention.');
        return true;
    }

    // If the agent has never spoken, it can't have a self-concept to compare to.
    if (!selfEmbedding) {
        console.log('Gate: No self-concept yet, staying silent.');
        return false;
    }

    // 1. Compute relevance (rho)
    const queryEmbedding = await generateEmbedding(
        event.content,
        EmbeddingTaskType.RETRIEVAL_QUERY
    );
    const relevance = cosineSimilarity(queryEmbedding, selfEmbedding);

    // 2. Compute decision probability
    const directMentionBonus = event.is_mention ? config.gateMentionBonus : 0;
    const exponent = config.gateShyness + (config.gateRelevance * relevance) + directMentionBonus;
    const probability = sigmoid(exponent);

    const decision = Math.random() < probability;

    console.log(`Gate: Relevance (rho) = ${relevance.toFixed(3)}, P(reply) = ${probability.toFixed(3)}. Decision: ${decision ? 'REPLY' : 'SILENCE'}`);

    return decision;
} 