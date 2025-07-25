// =============================================================================
// SERVICE CONFIGURATION AND HELPERS - Implementation details
// =============================================================================

// Service configuration mapping
const SERVICE_CONFIG = {
    groq: {
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      envKey: 'GROQ_API_KEY'
    },
    openai: {
      endpoint: 'https://api.openai.com/v1/chat/completions',
      envKey: 'OPENAI_API_KEY'
    },
    xai: {
      endpoint: 'https://api.x.ai/v1/chat/completions',
      envKey: 'XAI_API_KEY'
    },
    gemini: {
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      envKey: 'GEMINI_API_KEY'
    }
  } as const;
  
  /**
   * Gets the API configuration for a given service
   * @param service - The AI service to use
   * @returns Object containing endpoint and API key
   */
  export function getServiceConfig(service: keyof typeof SERVICE_CONFIG) {
    const config = SERVICE_CONFIG[service];
    const apiKey = process.env[config.envKey];
    
    if (!apiKey) {
      throw new Error(`Missing API key: ${config.envKey} environment variable is required for ${service}`);
    }
    
    return {
      endpoint: config.endpoint,
      apiKey: apiKey
    };
  }
  
  export interface AgentConfig {
    service: 'groq' | 'openai' | 'xai' | 'gemini';
    apiEndpoint: string;
    apiKey: string;
    model: string;
    messageHistoryLimit: number;
    splitMessages: boolean;
    messageSplitDelay: number;
    personality: {
      name: string;
      description: string;
    };
    systemPrompt: (params: { message: any }) => string;
    confidenceCheck: {
      service: 'groq' | 'openai' | 'xai' | 'gemini';
      apiEndpoint: string;
      apiKey: string;
      model: string;
      systemPrompt: string;
      threshold: number;
      messageHistoryLimit: number;
    };
  }