# Dockerfile for NodePress (single standalone Next.js app, no monorepo).
# Build: docker build -t nodepress .
# Runtime env required: DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
# --legacy-peer-deps: react-quill@2.0.0 declares a peer dep on React ^16-18,
# but this project is on React 19.2.4. Unrelated to this task (pre-existing
# upstream conflict in package.json), but `npm ci` fails without it.
RUN npm ci --legacy-peer-deps
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000
WORKDIR /app
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder --chown=nextjs:nodejs /app ./
USER nextjs
EXPOSE 3000
CMD ["npm", "start"]
