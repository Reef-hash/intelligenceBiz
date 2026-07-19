export interface AiEngineConfig {
  anthropicApiKey?: string;
  openaiApiKey?: string;
  deepseekApiKey?: string;
}

export function loadConfigFromEnv(): AiEngineConfig {
  return {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
    deepseekApiKey: process.env.DEEPSEEK_API_KEY,
  };
}
