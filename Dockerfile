# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# ---- deps: ลง dependency ครบทั้ง dev เพราะตอน build ต้องใช้ (react compiler, tailwind, prisma) ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: prisma generate (src/generated ไม่ได้เก็บใน git) แล้วค่อย next build ----
FROM deps AS builder
COPY . .
# prisma.config.ts อ่าน DATABASE_URL ตั้งแต่ตอนโหลด config ทั้งที่ generate ไม่ได้ต่อ DB จริง
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

# ---- migrator: คอนเทนเนอร์ใช้ครั้งเดียวสำหรับ migrate / seed / import ขอบเขต ----
FROM deps AS migrator
COPY prisma ./prisma
COPY scripts ./scripts
COPY prisma.config.ts ./
CMD ["npx", "prisma", "migrate", "deploy"]

# ---- runner: เอาเฉพาะ standalone output ----
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
