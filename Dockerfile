# Stage 1: Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Set build-time environment variables so Vite can bake them into the client bundle
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm ci

# Copy the rest of the application code
COPY . .

# Run the build (Vite client build + Esbuild server build)
RUN npm run build

# Stage 2: Runner stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=80

# Copy built assets and server from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Expose the application port
EXPOSE 80

# Start the server
CMD ["npm", "start"]
