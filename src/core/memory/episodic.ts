import { v4 as uuidv4 } from 'uuid';
import { ChatEvent, Episode, EmbeddingTaskType } from './types.js';
import { summarizeAndScoreEvents } from './services/summarization.js';
import { generateEmbedding } from './services/embedding.js';
import { saveEpisode } from './storage/supabase.js';

/**
 * Processes a chunk of chat events to create and store a new episodic memory.
 *
 * @param events The array of chat events that form the episode.
 * @returns A promise that resolves when the episode has been created and saved.
 */
export async function createEpisodeFromEvents(events: ChatEvent[]): Promise<void> {
  if (events.length === 0) {
    return;
  }

  console.log(`Creating episode from ${events.length} events...`);

  // 1. Summarize and score the events using an LLM
  const { summary, importance, emotion } = await summarizeAndScoreEvents(events);

  // 2. Generate an embedding for the summary
  const embedding = await generateEmbedding(summary, EmbeddingTaskType.RETRIEVAL_DOCUMENT);

  // 3. Create the final episode object
  const newEpisode: Episode = {
    ep_id: uuidv4(),
    summary,
    embedding,
    timestamp: Math.floor(Date.now() / 1000),
    importance,
    emotion,
    usage_count: 0,
    event_ids: events.map(e => e.msg_id),
  };

  // 4. Save the episode to the database
  await saveEpisode(newEpisode);

  console.log(`New episode created and saved: ${newEpisode.ep_id}`);
} 