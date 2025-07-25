/**
 * @file src/core/memory/index.ts
 * @description
 * This is the main entry point for the memory system. It will orchestrate the different
 * memory layers (Working, Episodic, Semantic) and provide a unified interface for the
 * agent to interact with. It will be responsible for:
 *
 * 1. Initializing and managing memory stores (e.g., connecting to Supabase).
 * 2. Handling the flow of information between memory layers.
 * 3. Exposing high-level functions like `retrieve`, `addEvent`, `reflect`.
 * 4. Coordinating the dynamic system prompt builder.
 */ 