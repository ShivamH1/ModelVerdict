FROM oven/bun:1.3.4

WORKDIR /app

# Copy workspace manifests first for better layer caching
COPY bun.lock package.json turbo.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Install all workspace deps from root so workspace links resolve
RUN bun install --frozen-lockfile

# Generate Prisma client
RUN cd apps/api && bunx prisma generate

EXPOSE 3001

CMD ["bun", "apps/api/src/index.ts"]
