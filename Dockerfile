FROM oven/bun:1.3.4

WORKDIR /app

# Copy root workspace manifests
COPY package.json bun.lock turbo.json ./

# Copy internal packages and the API app
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Stub apps/web so bun skips installing Next.js + React (~400MB saved)
RUN mkdir -p apps/web && \
    echo '{"name":"@veritas/web","version":"0.0.0","private":true}' > apps/web/package.json

# Install only API + package dependencies
RUN bun install

# Generate Prisma client for Linux
RUN cd apps/api && bunx prisma generate

EXPOSE 3001

CMD ["bun", "apps/api/src/index.ts"]
