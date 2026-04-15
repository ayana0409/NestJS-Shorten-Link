# Build stage
FROM node:20-slim AS builder
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Runtime stage
FROM node:20-slim AS runner
WORKDIR /usr/src/app

COPY package*.json ./
COPY --from=builder /usr/src/app/dist ./dist

RUN npm ci --omit=dev

ENV NODE_ENV=production
EXPOSE 3001

CMD ["npm", "run", "start:prod"]
