/**
 * @file src/core/memory/prompt.ts
 * @description
 * This module is responsible for dynamically building the complete system prompt
 * before every generation call. It is stateless and assembles the prompt from the
_latest_
 * information in the memory stores.
 *
 * Responsibilities:
 * 1.  Assembling the final prompt string according to the specified structure.
 * 2.  Fetching the current state of Working Memory.
 * 3.  Fetching the top 5 high-confidence beliefs from the Semantic store.
 * 4.  Integrating the retrieved episodic memory summaries from the `retrieval` module.
 * 5.  Calculating the agent's age in days.
 * 6.  (Future) Deriving writing style instructions from the agent's own past messages.
 */ 