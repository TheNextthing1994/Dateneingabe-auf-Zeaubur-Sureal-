#!/bin/sh

# Generate config.js from environment variables
cat <<EOF > /usr/share/nginx/html/config.js
window.ENV = {
  VITE_GEMINI_API_KEY: "${VITE_GEMINI_API_KEY}",
  VITE_SURREALDB_URL: "${VITE_SURREALDB_URL}",
  VITE_SURREALDB_NS: "${VITE_SURREALDB_NS}",
  VITE_SURREALDB_DB: "${VITE_SURREALDB_DB}",
  VITE_SURREALDB_USER: "${VITE_SURREALDB_USER}",
  VITE_SURREALDB_PASS: "${VITE_SURREALDB_PASS}"
};
EOF

# Start nginx
nginx -g "daemon off;"
