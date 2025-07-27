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
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { AGENT_CONFIG } from '../config.js';
import { Episode, Belief, MemoryConfig, Persona } from './types.js';
import { getAllBeliefs, getPersona, saveBelief, savePersona } from './storage/supabase.js';
import sql from './storage/db.js';

interface ReflectionResult {
  insights: {
    statement: string;
    supporting_evidence: string; // The summary of an episode that supports it
  }[];
}

interface PersonaSynthResult {
    new_description: string;
    new_communication_style: string;
}

/**
 * The core reflection process. Fetches recent memories and uses an LLM to
 * derive new beliefs or strengthen existing ones. Also updates the agent's core persona.
 * @param config The memory configuration.
 */
export async function reflectOnMemories(config: MemoryConfig): Promise<void> {
  console.log('Beginning nightly reflection cycle...');

  // 1. Fetch recent episodes and existing beliefs
  const recentEpisodes = await sql<Episode[]>`
    SELECT * FROM episodes
    ORDER BY timestamp DESC
    LIMIT ${config.reflectionEpisodeBatchSize}
  `;

  if (recentEpisodes.length < 10) { // Not enough new experience to reflect on
      console.log('Insufficient new memories to reflect. Skipping cycle.');
      return;
  }

  const existingBeliefs = await getAllBeliefs();
  
  const episodeSummaries = recentEpisodes.map(e => `- ${e.summary} (Importance: ${e.importance.toFixed(2)}, Emotion: ${e.emotion.toFixed(2)})`).join('\n');
  const existingBeliefsText = existingBeliefs.map(b => `- ${b.statement} (Confidence: ${b.confidence.toFixed(2)})`).join('\n') || 'None';

  // 2. Use an LLM to find insights and form beliefs
  const systemPrompt = `You are a psychoanalyst for a young AI named ${AGENT_CONFIG.personality.name}.
Your job is to analyze the AI's recent memories and its existing beliefs to identify recurring patterns, themes, and insights.
From these memories, you will form new beliefs or suggest updates to existing ones.

A belief should be a general statement about the world, other people, or the AI itself.
For example, if the AI often remembers people being kind, a good belief would be "People are generally kind to me."
Do not just restate a memory. Synthesize a higher-level insight.

Here are the AI's recent memories (as summaries):
---
${episodeSummaries}
---

Here are the AI's current core beliefs:
---
${existingBeliefsText}
---

Based on the memories, what are 1-3 new, salient insights you can draw?
Provide your response in JSON format.
`;

  try {
    const response = await axios.post(
      AGENT_CONFIG.apiEndpoint,
      {
        model: AGENT_CONFIG.model,
        messages: [{ role: 'system', content: systemPrompt }],
        response_format: { type: 'json_object' },
      },
      { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AGENT_CONFIG.apiKey}` } }
    );

    const result: ReflectionResult = JSON.parse(response.data.choices[0].message.content);
    const { insights } = result;

    if (!insights || insights.length === 0) {
        console.log('Reflection complete. No new insights were generated.');
        return;
    }

    // 3. Update or create beliefs based on insights
    for (const insight of insights) {
      const supportingEpisode = recentEpisodes.find(e => e.summary === insight.supporting_evidence);
      if (!supportingEpisode) continue;

      const existingBelief = existingBeliefs.find(b => b.statement === insight.statement);
      const now = Math.floor(Date.now() / 1000);
      
      if (existingBelief) {
        // Update confidence of existing belief using the formula
        const newConfidence = 1 - (1 - existingBelief.confidence) * (1 - supportingEpisode.importance);
        existingBelief.confidence = newConfidence;
        existingBelief.updated_at = now;
        if (!existingBelief.supporting_episodes.includes(supportingEpisode.ep_id)) {
            existingBelief.supporting_episodes.push(supportingEpisode.ep_id);
        }
        await saveBelief(existingBelief);
        console.log(`Strengthened belief: "${existingBelief.statement}" (Confidence: ${newConfidence.toFixed(2)})`);
      } else {
        // Create a new belief
        const newBelief: Belief = {
          bel_id: uuidv4(),
          statement: insight.statement,
          confidence: supportingEpisode.importance, // Initial confidence is the importance of the first evidence
          created_at: now,
          updated_at: now,
          supporting_episodes: [supportingEpisode.ep_id],
        };
        await saveBelief(newBelief);
        console.log(`Formed new belief: "${newBelief.statement}" (Confidence: ${newBelief.confidence.toFixed(2)})`);
      }
    }

    // 4. Synthesize and update the core persona
    await synthesizeNewPersona();


    console.log('Nightly reflection cycle complete.');
  } catch (error) {
    if (axios.isAxiosError(error)) {
        console.error('Error during reflection LLM call:', error.response?.data || error.message);
    } else {
        console.error('An unexpected error occurred during reflection:', error);
    }
  }
}

/**
 * After beliefs are updated, this function synthesizes them into a new persona.
 */
async function synthesizeNewPersona(): Promise<void> {
    const allBeliefs = await getAllBeliefs();
    if (allBeliefs.length === 0) return;

    const currentPersona = await getPersona();

    const beliefsText = allBeliefs
        .sort((a,b) => b.confidence - a.confidence)
        .map(b => `- ${b.statement} (Confidence: ${b.confidence.toFixed(2)})`)
        .join('\n');

    const systemPrompt = `You are a personality synthesizer for a young AI.
Your task is to analyze the AI's core beliefs and its current personality description to generate a new, updated personality.
The new personality should be a natural evolution of the old one, guided by the most confident beliefs.

Current Personality:
- Description: ${currentPersona.description}
- Communication Style: ${currentPersona.communication_style}

Core Beliefs (sorted by confidence):
---
${beliefsText}
---

Based on the core beliefs, synthesize a new, one-sentence description for the AI and a new one-sentence communication style.
The new personality should reflect the themes in the beliefs. For example, if beliefs are about kindness, the new personality should be friendly.
Provide your response in JSON format.`;

    try {
        const response = await axios.post(
            AGENT_CONFIG.apiEndpoint,
            {
                model: AGENT_CONFIG.model,
                messages: [{ role: 'system', content: systemPrompt }],
                response_format: { type: 'json_object' },
            },
            { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AGENT_CONFIG.apiKey}` } }
        );

        const result: PersonaSynthResult = JSON.parse(response.data.choices[0].message.content);

        const newPersona: Persona = {
            description: result.new_description,
            communication_style: result.new_communication_style,
        };

        await savePersona(newPersona);
        console.log('Successfully synthesized and updated persona.');
        console.log(`New Description: ${newPersona.description}`);
        console.log(`New Style: ${newPersona.communication_style}`);

    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error during persona synthesis LLM call:', error.response?.data || error.message);
        } else {
            console.error('An unexpected error occurred during persona synthesis:', error);
        }
    }
} 