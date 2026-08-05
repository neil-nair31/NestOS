# NestOS always-on host image (Railway / Render / VPS)
FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates zip \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /nestos

COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY web/package.json ./web/

RUN npm ci --workspace=server --include-workspace-root \
  || npm install --workspace=server --include-workspace-root

COPY server ./server
COPY extension ./extension
COPY downloads ./downloads
COPY nestos-v2-demo.html login.html extension-demo.html extension-guide.html NestOS-Trial-Operations-Guide.html ./

RUN npm run build -w server \
  && npm rebuild better-sqlite3 -w server \
  && mkdir -p downloads /tmp/nestos-naukri-helper /data/uploads \
  && chmod -R 777 /data \
  && cp -r extension/. /tmp/nestos-naukri-helper/ \
  && (cd /tmp && zip -r /nestos/downloads/nestos-naukri-helper.zip nestos-naukri-helper) \
  && test -f /nestos/server/dist/index.js

# Never hardcode PORT — Railway injects it at runtime
ENV NODE_ENV=production
ENV STORE_MODE=sqlite
ENV DATA_DIR=/data
ENV COOKIE_SECURE=1

WORKDIR /nestos/server
# Log PORT then start so Deploy Logs show why listen fails
CMD ["sh", "-c", "echo \"[NestOS] starting PORT=${PORT:-unset} NODE=$(node -v)\" && ls -la dist && exec node dist/index.js"]
