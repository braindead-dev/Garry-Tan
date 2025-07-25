/**
 * @file src/core/memory/storage/supabase.ts
 * @description
 * This module will handle all interactions with the Supabase backend, specifically for
 * storing and retrieving long-term memories (Episodic and Semantic). It will abstract
 * away the direct Supabase client calls.
 *
 * Responsibilities:
 * 1.  Establishing a connection to the Supabase client.
 * 2.  Providing functions to save and retrieve Episodic Memory objects.
 *     - This includes handling pgvector operations for embeddings.
 * 3.  Providing functions to save, update, and retrieve Semantic Memory (belief) nodes.
 * 4.  Managing table creation and schema migrations if necessary.
 */ 