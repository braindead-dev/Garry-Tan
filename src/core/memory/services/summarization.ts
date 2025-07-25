/**
 * @file src/core/memory/services/summarization.ts
 * @description
 * This service handles the summarization of event chunks to create episodes for
 * Episodic Memory. It will use an LLM to generate concise, first-person summaries.
 *
 * Responsibilities:
 * 1.  Exposing a function `summarizeEvents(events: RawEvent[])` that returns a summary string.
 * 2.  Calling an LLM with the appropriate prompt to perform the summarization.
 * 3.  Also responsible for generating the 'Importance' and 'Emotion' scores for the episode
 *     by making a separate, structured call to an LLM.
 */ 