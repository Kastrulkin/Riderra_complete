FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

# Nuxt 2 and the Vue/Webpack toolchain are needed only to generate dist/.
RUN npm ci --include=dev --no-audit

COPY . .

RUN npx prisma generate
RUN npm run generate
RUN npm prune --omit=dev --no-audit
RUN npm audit --omit=dev

FROM node:20-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

# The builder has already removed Nuxt, Vue, Webpack and all other dev-only
# packages. The final image contains the API runtime and generated frontend.
COPY --from=builder /app /app

EXPOSE 3000

CMD ["npm", "start"]
