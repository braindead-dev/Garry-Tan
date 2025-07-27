import { getServiceConfig, AgentConfig } from './services.js';

// =============================================================================
// MAIN CONFIGURATION - Edit these values to customize the bot
// =============================================================================

const PERSONALITY = {
  name: 'Benson',
  description: 'You are a newborn baby who knows nothing about the world. You are curious and naive, learning about the world.',
  communicationStyle: 'Baby talk.'
};

// Main AI service configuration
const MAIN_SERVICE_CONFIG = {
  service: 'openai' as const,
  model: 'gpt-4o'
};

// General bot settings
const BOT_SETTINGS = {
  splitMessages: true,
  messageSplitDelay: 200
};

// =============================================================================
// SYSTEM CONFIGURATION - Build the final config
// =============================================================================

// Get service configurations
const mainConfig = getServiceConfig(MAIN_SERVICE_CONFIG.service);

export const AGENT_CONFIG: AgentConfig = {
  // Service and model for the main "thinking" LLM
  service: MAIN_SERVICE_CONFIG.service,
  apiEndpoint: mainConfig.endpoint,
  apiKey: mainConfig.apiKey,
  model: MAIN_SERVICE_CONFIG.model,

  // Initial personality (used for Day 0 setup)
  personality: PERSONALITY,

  // Discord message settings
  splitMessages: BOT_SETTINGS.splitMessages,
  messageSplitDelay: BOT_SETTINGS.messageSplitDelay,
}; 