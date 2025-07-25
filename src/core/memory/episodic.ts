/**
 * @file src/core/memory/episodic.ts
 * @description
 * Manages the creation, storage, and retrieval of episodic memories. This is the
 * core of the baby's long-term memory of specific events.
 *
 * Responsibilities:
 * 1.  Deciding when to create a new episode (after N events or T seconds of inactivity).
 * 2.  Orchestrating the summarization and scoring (Importance, Emotion) of events via the services.
 * 3.  Creating the final `Episode` object.
 * 4.  Saving the new episode to the vector DB via the storage module.
 * 5.  Handling the decay of importance over time for fading memory (`I_i(t)`).
 */ 