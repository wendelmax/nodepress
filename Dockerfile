# Dockerfile for NodePress (single standalone Next.js app, no monorepo).
# Build: docker build --build-arg NEXT_PUBLIC_KEYCLOAK_URL=https://auth.navant.co -t nodepress .
# Runtime env required: DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET
# Build arg required: NEXT_PUBLIC_KEYCLOAK_URL (NEXT_PUBLIC_* vars are inlined
# into the JS bundle at `next build` time, not read at container runtime --
# passing it only as a runtime `environment:` var silently bakes in the
# code's localhost fallback instead. See src/auth.ts.)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
# --legacy-peer-deps: react-quill@2.0.0 declares a peer dep on React ^16-18,
# but this project is on React 19.2.4. Unrelated to this task (pre-existing
# upstream conflict in package.json), but `npm ci` fails without it.
RUN npm ci --legacy-peer-deps
COPY . .
ARG NEXT_PUBLIC_KEYCLOAK_URL
ENV NEXT_PUBLIC_KEYCLOAK_URL=$NEXT_PUBLIC_KEYCLOAK_URL
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
