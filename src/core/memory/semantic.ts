/**
 * @file src/core/memory/semantic.ts
 * @description
 * Manages the creation and maintenance of semantic memory (core beliefs). This module
 * is responsible for the nightly reflection job that distills experiences into beliefs.
 *
 * Responsibilities:
 * 1.  Implementing the nightly reflection job (`reflect()`).
 * 2.  Fetching recent episodes from the episodic store.
 * 3.  Using an LLM to infer recurring facts, patterns, and beliefs.
 * 4.  Creating and updating `Belief` nodes with confidence scores and supporting episode links.
 * 5.  Applying the confidence update formula when new evidence is found.
 * 6.  Identifying high-confidence beliefs to be surfaced in the persona block.
 */ 