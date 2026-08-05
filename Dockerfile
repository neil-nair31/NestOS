# NestOS always-on host image (Railway / Render / VPS) — not laptop-dependent
FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates zip \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /nestos

COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY web/package.json ./web/

# Install server workspace (better-sqlite3 compiles here)
RUN npm ci --omit=dev --workspace=server --include-workspace-root \
  || npm install --omit=dev --workspace=server --include-workspace-root

COPY server ./server
COPY extension ./extension
COPY downloads ./downloads
COPY nestos-v2-demo.html login.html extension-demo.html extension-guide.html NestOS-Trial-Operations-Guide.html ./

# Refresh extension zip for download link
RUN mkdir -p downloads /tmp/nestos-naukri-helper \
  && cp -r extension/. /tmp/nestos-naukri-helper/ \
  && (cd /tmp && zip -r /nestos/downloads/nestos-naukri-helper.zip nestos-naukri-helper) \
  && mkdir -p /data/uploads

ENV NODE_ENV=production
ENV PORT=4100
ENV HOST=0.0.0.0
ENV STORE_MODE=sqlite
ENV DATA_DIR=/data
ENV COOKIE_SECURE=1

EXPOSE 4100
VOLUME ["/data"]

WORKDIR /nestos/server
CMD ["npx", "tsx", "src/index.ts"]
