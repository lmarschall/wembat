# --- Build Stage ---
FROM node:22.20-slim AS build

# Install openssl for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/build

# Copy root workspace manifests
COPY package*.json ./
# Copy workspace-specific manifests (allows npm ci to cache better)
COPY workspaces/server/package*.json ./workspaces/server/

RUN npm ci

# Copy source and prisma schema
COPY workspaces/server/ ./workspaces/server/

WORKDIR /usr/src/build/workspaces/server

# Generate Prisma Client and Build
RUN npx prisma generate
RUN npm run build

# --- Run Stage ---
FROM node:22-bullseye-slim AS run

# # Install runtime dependencies
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Setup data directory with correct permissions before VOLUME is defined
RUN mkdir -p /opt/data/keys && chown -R node:node /opt/data

USER node
WORKDIR /usr/src/app
# Set environment
ENV NODE_ENV=production

# Copy manifests for production install
COPY --chown=node:node package*.json ./
COPY --chown=node:node workspaces/server/package*.json ./workspaces/server/

# Install only production dependencies
RUN npm ci --workspace=@wembat/server --omit=dev

# Copy built assets and Prisma files
COPY --chown=node:node --from=build /usr/src/build/workspaces/server/dist ./dist
COPY --chown=node:node --from=build /usr/src/build/workspaces/server/prisma ./prisma
COPY --chown=node:node --from=build /usr/src/build/workspaces/server/entrypoint.sh ./entrypoint.sh

# Ensure entrypoint is executable
RUN chmod +x ./entrypoint.sh

# Persist the keys directory
VOLUME /opt/data

EXPOSE 8080

# Use ENTRYPOINT for the script and CMD for default arguments
ENTRYPOINT ["bash", "./entrypoint.sh"]
# CMD ["tail", "-f", "/dev/null"]