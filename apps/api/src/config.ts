function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export interface ApiConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  redisUrl: string;
}

export function loadConfig(): ApiConfig {
  return {
    supabaseUrl: requireEnv("SUPABASE_URL"),
    supabaseServiceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  };
}
