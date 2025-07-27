import sql from './db.js';
import { Belief, BeliefRow, Episode, EpisodeRow } from '../types.js';

const VECTOR_DIMENSION = 768; // Based on Gemini-embedding-001 with controlled dimensionality

/**
 * Ensures the required database tables and extensions exist.
 * This should be called once on application startup.
 */
export async function setupDatabase() {
  await sql`CREATE EXTENSION IF NOT EXISTS vector`;

  // Use sql.unsafe for DDL statements where parameters are not allowed for certain parts,
  // like the vector dimension in CREATE TABLE. This is safe as VECTOR_DIMENSION is a constant.
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS episodes (
      ep_id UUID PRIMARY KEY,
      summary TEXT NOT NULL,
      embedding VECTOR(${VECTOR_DIMENSION}) NOT NULL,
      timestamp BIGINT NOT NULL,
      importance FLOAT NOT NULL,
      emotion FLOAT NOT NULL,
      usage_count INTEGER NOT NULL DEFAULT 0,
      event_ids TEXT[] NOT NULL
    )
  `);

  await sql`
    CREATE TABLE IF NOT EXISTS beliefs (
      bel_id UUID PRIMARY KEY,
      statement TEXT NOT NULL UNIQUE,
      confidence FLOAT NOT NULL,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL,
      supporting_episodes UUID[] NOT NULL
    )
  `;

  console.log('Database setup complete. Tables and extensions are ready.');
}

/**
 * Saves a new episode to the database.
 * @param episode The episode object to save.
 */
export async function saveEpisode(episode: Episode) {
  const { ep_id, summary, embedding, timestamp, importance, emotion, usage_count, event_ids } = episode;
  await sql`
    INSERT INTO episodes (ep_id, summary, embedding, timestamp, importance, emotion, usage_count, event_ids)
    VALUES (${ep_id}, ${summary}, ${JSON.stringify(embedding)}, ${timestamp}, ${importance}, ${emotion}, ${usage_count}, ${event_ids})
  `;
}

/**
 * Finds episodes in the database that are semantically similar to a query embedding.
 * @param embedding The query vector.
 * @param limit The maximum number of episodes to return.
 * @returns A promise that resolves to an array of episodes.
 */
export async function findSimilarEpisodes(embedding: number[], limit: number): Promise<Episode[]> {
  const result = await sql<EpisodeRow[]>`
    SELECT * FROM episodes
    ORDER BY embedding <-> ${JSON.stringify(embedding)}
    LIMIT ${limit}
  `;
  return result.map(row => ({
      ...row,
      embedding: JSON.parse(row.embedding), // Convert string vector back to array
  }));
}

/**
 * Increments the usage count for a given episode.
 * @param ep_id The ID of the episode to update.
 */
export async function incrementEpisodeUsage(ep_id: string) {
    await sql`
        UPDATE episodes
        SET usage_count = usage_count + 1
        WHERE ep_id = ${ep_id}
    `;
}

/**
 * Saves a new belief or updates an existing one.
 * @param belief The belief object to save.
 */
export async function saveBelief(belief: Belief) {
  const { bel_id, statement, confidence, created_at, updated_at, supporting_episodes } = belief;
  await sql`
    INSERT INTO beliefs (bel_id, statement, confidence, created_at, updated_at, supporting_episodes)
    VALUES (${bel_id}, ${statement}, ${confidence}, ${created_at}, ${updated_at}, ${supporting_episodes})
    ON CONFLICT (statement) DO UPDATE SET
      confidence = EXCLUDED.confidence,
      updated_at = EXCLUDED.updated_at,
      supporting_episodes = EXCLUDED.supporting_episodes
  `;
}

/**
 * Retrieves all beliefs from the database.
 * @returns A promise that resolves to an array of beliefs.
 */
export async function getAllBeliefs(): Promise<Belief[]> {
    const result = await sql<BeliefRow[]>`SELECT * FROM beliefs`;
    return result;
}

/**
 * Retrieves the top N beliefs with the highest confidence.
 * @param limit The number of beliefs to retrieve.
 * @returns A promise that resolves to an array of high-confidence beliefs.
 */
export async function getHighConfidenceBeliefs(limit: number): Promise<Belief[]> {
    const result = await sql<BeliefRow[]>`
        SELECT * FROM beliefs
        ORDER BY confidence DESC
        LIMIT ${limit}
    `;
    return result;
} 