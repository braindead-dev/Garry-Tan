/**
 * @file src/core/memory/services/embedding.ts
 * @description
 * This service is responsible for generating embeddings for text content using the
 * specified embedding model (e.g., Gemini-embedding-001). It will abstract the API
 * calls to the embedding service.
 *
 * Responsibilities:
 * 1.  Providing a function `generateEmbedding(text: string, task_type: TaskType)`
 *     that returns a vector embedding.
 * 2.  Handling API key management and client initialization for the embedding service.
 * 3.  Implementing logic for batching requests if needed for efficiency.
 * 4.  Handling potential truncation and normalization of embeddings as per the model's requirements.
 */ 