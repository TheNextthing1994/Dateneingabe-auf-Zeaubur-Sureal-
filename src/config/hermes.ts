/**
 * Centralized Hermes Configuration
 * Handles logic for environment variable mapping and constant defaults.
 */

// Since this is frontend, we use VITE_ prefix for variables we want to expose.
// However, most sensitive logic stays backend-side.
export const HERMES_CONFIG = {
  // Public URL for displays or client-side checks if needed
  BASE_URL: import.meta.env.VITE_HERMES_BASE_URL || 'http://76.13.151.81:8642/v1',
  
  // These are primarily for the backend, but we keep the structure here for documentation
  MODEL: 'hermes-agent',
  TIMEOUT_MS: 30000,
  SESSION_PREFIX: 'dt_',
};

/**
 * Utility to check if we are in a mixed content situation
 * (HTTPS app trying to talk to HTTP Hermes VPS)
 */
export const checkMixedContent = () => {
  if (typeof window === 'undefined') return false;
  
  const isHttps = window.location.protocol === 'https:';
  const isHermesHttp = HERMES_CONFIG.BASE_URL.startsWith('http:');
  
  return isHttps && isHermesHttp;
};
