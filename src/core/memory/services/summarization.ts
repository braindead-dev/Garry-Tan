import axios from 'axios';
import { AGENT_CONFIG } from '../../config.js';
import { ChatEvent } from '../types.js';

interface SummarizationResult {
  summary: string;
  importance: number;
  emotion: number;
}

/**
 * Uses an LLM to summarize a chunk of chat events and score them.
 * @param events An array of chat events to be summarized.
 * @returns A promise that resolves to an object containing the summary,
 *          an importance score (0-1), and an emotion score (-1 to 1).
 */
export async function summarizeAndScoreEvents(events: ChatEvent[]): Promise<SummarizationResult> {
  const { personality } = AGENT_CONFIG;
  const conversation = events.map(e => `[${e.author_name}]: ${e.content}`).join('\n');

  const systemPrompt = `You are a summarization and analysis engine for a digital agent named ${personality.name}.
Your task is to process a snippet of a conversation that ${personality.name} has observed.
From the perspective of ${personality.name} (${personality.description}), you must produce a concise, first-person summary of the events.
You must also score the snippet on two dimensions:
1.  **Importance (0.0 to 1.0):** How significant is this conversation for ${personality.name}? Is there a lesson, a new fact about someone, a direct interaction, or a strong emotional moment? A simple greeting is low importance (0.1), while being taught something new is high importance (0.9).
2.  **Emotion (-1.0 to 1.0):** What is the dominant emotion ${personality.name} would feel? Use -1.0 for very negative, 0.0 for neutral, and 1.0 for very positive.

The user you are acting for is: ${personality.name}
Their personality is: "${personality.description}"
Their communication style is: "${personality.communicationStyle}"

Analyze the following conversation from ${personality.name}'s perspective:
---
${conversation}
---
Provide your response in JSON format.
`;

  try {
    const response = await axios.post(
      AGENT_CONFIG.apiEndpoint,
      {
        model: AGENT_CONFIG.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: conversation }
        ],
        response_format: {
          type: 'json_object',
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AGENT_CONFIG.apiKey}`,
        },
      }
    );

    const result = response.data.choices[0].message.tool_calls ? JSON.parse(response.data.choices[0].message.tool_calls[0].function.arguments) : JSON.parse(response.data.choices[0].message.content)

    // Clamp values to their expected ranges to be safe
    result.importance = Math.max(0, Math.min(1, result.importance));
    result.emotion = Math.max(-1, Math.min(1, result.emotion));

    return result;

  } catch (error) {
    if (axios.isAxiosError(error)) {
        console.error('Error summarizing events:', error.response?.data || error.message);
    } else {
        console.error('An unexpected error occurred during summarization:', error);
    }
    throw new Error('Failed to summarize and score events.');
  }
} 