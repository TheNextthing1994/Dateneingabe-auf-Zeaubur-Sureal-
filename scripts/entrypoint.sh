#!/bin/sh

# Generate config.js from environment variables
cat <<EOF > /usr/share/nginx/html/config.js
console.log('config.js loaded successfully');
window.ENV = {
  VITE_GEMINI_API_KEY: "${VITE_GEMINI_API_KEY:-${GEMINI_API_KEY}}",
  VITE_SURREALDB_URL: "${VITE_SURREALDB_URL:-${SURREALDB_URL}}",
  VITE_SURREALDB_NS: "${VITE_SURREALDB_NS:-${SURREALDB_NS:-test}}",
  VITE_SURREALDB_DB: "${VITE_SURREALDB_DB:-${SURREALDB_DB:-test}}",
  VITE_SURREALDB_USER: "${VITE_SURREALDB_USER:-${SURREALDB_USER}}",
  VITE_SURREALDB_PASS: "${VITE_SURREALDB_PASS:-${SURREALDB_PASS}}"
};
EOF

# Start nginx
nginx -g "daemon off;"
