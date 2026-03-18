# Build stage
FROM node:20-slim AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration template
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Copy entrypoint script
COPY scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Default port if not provided by the environment
ENV PORT=80

ENTRYPOINT ["/entrypoint.sh"]
