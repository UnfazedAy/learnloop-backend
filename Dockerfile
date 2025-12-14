# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --silent

# Copy source and build
COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# Stage 2: Production image
FROM node:20-alpine AS prod

WORKDIR /app

# Install only runtime deps
COPY package*.json ./
RUN npm ci --only=production --silent

# Copy built files from build stage
COPY --from=build /app/dist ./dist

# Expose port
ENV PORT=8080
EXPOSE 8080

# Run server
CMD ["node", "dist/server.js"]
