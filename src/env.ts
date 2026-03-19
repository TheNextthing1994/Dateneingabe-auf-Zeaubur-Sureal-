/**
 * Helper to get environment variables from either build-time (import.meta.env)
 * or runtime (window.ENV, populated by Docker entrypoint).
 */
export const getEnv = (key: string, defaultValue: string = ''): string => {
  // 1. Check window.ENV (runtime config from Docker/Zeabur)
  if (typeof window !== 'undefined' && (window as any).ENV) {
    const val = (window as any).ENV[key];
    if (val && val !== `\${${key}}`) {
      return val;
    }
    
    // Also check without VITE_ prefix if the key starts with it
    if (key.startsWith('VITE_')) {
      const shortKey = key.replace('VITE_', '');
      const shortVal = (window as any).ENV[shortKey];
      if (shortVal && shortVal !== `\${${shortKey}}`) {
        return shortVal;
      }
    }
  }
  
  // 2. Check import.meta.env (build-time config)
  let buildVal = '';
  if (key === 'VITE_GEMINI_API_KEY') buildVal = import.meta.env.VITE_GEMINI_API_KEY;
  else if (key === 'VITE_SURREALDB_URL') buildVal = import.meta.env.VITE_SURREALDB_URL;
  else if (key === 'VITE_SURREALDB_NS') buildVal = import.meta.env.VITE_SURREALDB_NS;
  else if (key === 'VITE_SURREALDB_DB') buildVal = import.meta.env.VITE_SURREALDB_DB;
  else if (key === 'VITE_SURREALDB_USER') buildVal = import.meta.env.VITE_SURREALDB_USER;
  else if (key === 'VITE_SURREALDB_PASS') buildVal = import.meta.env.VITE_SURREALDB_PASS;
  
  if (buildVal) {
    return buildVal;
  }
  
  return defaultValue;
};
