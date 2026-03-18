/**
 * Helper to get environment variables from either build-time (import.meta.env)
 * or runtime (window.ENV, populated by Docker entrypoint).
 */
export const getEnv = (key: string, defaultValue: string = ''): string => {
  // 1. Check window.ENV (runtime config from Docker/Zeabur)
  if (typeof window !== 'undefined' && (window as any).ENV) {
    const val = (window as any).ENV[key];
    if (val && val !== `\${${key}}`) { // Check if it's not the literal placeholder
      return val;
    }
  }
  
  // 2. Check import.meta.env (build-time config)
  // Note: Vite does NOT support dynamic indexing like import.meta.env[key]
  // We must check specifically for the variables we use.
  if (key === 'VITE_GEMINI_API_KEY') return import.meta.env.VITE_GEMINI_API_KEY || defaultValue;
  if (key === 'VITE_SURREALDB_URL') return import.meta.env.VITE_SURREALDB_URL || defaultValue;
  if (key === 'VITE_SURREALDB_NS') return import.meta.env.VITE_SURREALDB_NS || defaultValue;
  if (key === 'VITE_SURREALDB_DB') return import.meta.env.VITE_SURREALDB_DB || defaultValue;
  if (key === 'VITE_SURREALDB_USER') return import.meta.env.VITE_SURREALDB_USER || defaultValue;
  if (key === 'VITE_SURREALDB_PASS') return import.meta.env.VITE_SURREALDB_PASS || defaultValue;
  
  return defaultValue;
};
