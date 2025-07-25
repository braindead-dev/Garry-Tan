import { v4 as uuidv4 } from 'uuid';

// =============================================================================
// §0: Core Data Structures
// =============================================================================

/**
 * The fundamental unit of experience from the chat.
 * This is the raw input the agent receives from its "world".
 */
export interface ChatEvent {
  msg_id: string;
  author_id: string;
  author_name: string;
  timestamp: number; // UNIX seconds
  content: string;
  is_mention: boolean; // Was the bot mentioned directly?
}

/**
 * A summarized, scored, and embedded memory of a short-term experience.
 * This is the primary unit of long-term memory.
 */
export interface Episode {
  ep_id: string;
  summary: string;
  embedding: number[];
  timestamp: number;
  importance: number;
  emotion: number;
  usage_count: number;
  event_ids: string[]; // Reference to the raw ChatEvents it summarizes
}

/**

 * A high-level inference about the self, others, or the world.
 * These are formed during nightly reflection and shape the agent's personality.
 */
export interface Belief {
  bel_id: string;
  statement: string;
  confidence: number;
  created_at: number;
  updated_at: number;
  supporting_episodes: string[]; // Array of ep_ids
}

// =============================================================================
// §1 & 4: In-Memory & Retrieval Structures
// =============================================================================

/**
 * The in-memory buffer of recent events.
 */
export type WorkingMemory = ChatEvent[];

/**
 * An episode decorated with its retrieval score for ranking.
 */
export interface ScoredEpisode extends Episode {
  retrieval_score: number;
}

// =============================================================================
// §9: Storage & Service Types
// =============================================================================

/**
 * The schema for the 'episodes' table in Supabase.
 */
export type EpisodeRow = {
  ep_id: string;
  summary: string;
  embedding: string; // Stored as a string representation of a vector
  timestamp: number;
  importance: number;
  emotion: number;
  usage_count: number;
  event_ids: string[];
};

/**
 * The schema for the 'beliefs' table in Supabase.
 */
export type BeliefRow = {
  bel_id: string;
  statement: string;
  confidence: number;
  created_at: number;
  updated_at: number;
  supporting_episodes: string[];
};

/**
 * Task types for the Gemini Embedding API to optimize performance.
 * As per your documentation.
 */
export enum EmbeddingTaskType {
  RETRIEVAL_QUERY = 'RETRIEVAL_QUERY',
  RETRIEVAL_DOCUMENT = 'RETRIEVAL_DOCUMENT',
  SEMANTIC_SIMILARITY = 'SEMANTIC_SIMILARITY',
  CLASSIFICATION = 'CLASSIFICATION',
  CLUSTERING = 'CLUSTERING',
  QUESTION_ANSWERING = 'QUESTION_ANSWERING',
  FACT_VERIFICATION = 'FACT_VERIFICATION',
}

// =============================================================================
// §7 & Tunables: Configuration
// =============================================================================

/**
 * Parameters that control memory dynamics and can evolve over time.
 */
export interface MemoryConfig {
  // Working Memory
  workingMemorySize: number; // k
  wmRecencyTau: number; // τ_wm in seconds

  // Episodic Memory
  episodeCreationThreshold: number; // N events
  episodeCreationTimeout: number; // seconds of inactivity
  ltmImportanceDecayTau: number; // τ_ltm in seconds

  // Retrieval
  retrievalWeightRecency: number; // alpha
  retrievalWeightImportance: number; // beta
  retrievalWeightRelevance: number; // gamma
  retrievalWeightUsage: number; // delta
  maxRetrievedEpisodes: number; // N

  // Reply Gate
  gateShyness: number; // η₀
  gateRelevance: number; // η₁
  gateMentionBonus: number; // η₂
  
  // Reflection
  reflectionEpisodeBatchSize: number; // M
}

/**
 * Initial values for a "newborn" agent.
 */
export const BABY_MEMORY_CONFIG: MemoryConfig = {
  workingMemorySize: 64,
  wmRecencyTau: 300, // 5 minutes

  episodeCreationThreshold: 10,
  episodeCreationTimeout: 30,
  ltmImportanceDecayTau: 259200, // 3 days

  retrievalWeightRecency: 0.2,
  retrievalWeightImportance: 0.8,
  retrievalWeightRelevance: 1.0,
  retrievalWeightUsage: 0.0,
  maxRetrievedEpisodes: 5,
  
  gateShyness: -3.0,
  gateRelevance: 4.0,
  gateMentionBonus: 6.0,
  
  reflectionEpisodeBatchSize: 200,
}; 