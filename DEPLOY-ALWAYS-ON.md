# NestOS — always-on hosting (do NOT use laptop Cloudflare quick tunnels for Mani)

Quick tunnel (`trycloudflare.com` from your PC) **dies when the laptop sleeps or NestOS stops**.
For trial links that stay open for Mani, put NestOS on a small cloud host.

## Option A — Railway (easiest always-on for trial) — recommended

1. Create free account: https://railway.app  
2. **New Project** → **Deploy from GitHub** (push NestOS) **or** `railway up` from `NestOS/` folder  
3. Root directory / Dockerfile context: `NestOS`  
4. Variables:
   - `JWT_SECRET` = long random string  
   - `NODE_ENV=production`  
   - `COOKIE_SECURE=1`  
   - `DATA_DIR=/data`  
   - `STORE_MODE=sqlite`  
5. Add a **Volume** mounted at `/data` (so resumes/DB don’t wipe on redeploy)  
6. Generate domain → open `https://YOUR-APP.up.railway.app/api/health`  
7. Share that base URL with Mani (login, /app, extension URL = same base)

CLI (after `railway login`):

```powershell
cd C:\Users\neila\Projects\connectosWebsite1\NestOS
npx @railway/cli login
npx @railway/cli init
npx @railway/cli up
npx @railway/cli domain
```

## Option B — Render

- Free web service **sleeps after ~15 min idle** (first open is slow; can look “down”).
- For real always-on, use paid plan OR Railway.
- Blueprint: `render.yaml` in NestOS.

## Option C — Any ₹400–800/mo VPS (DigitalOcean / Contabo / Oracle free)

```powershell
# on the server after docker install
git clone ...
cd NestOS
docker build -t nestos .
docker run -d --name nestos -p 80:4100 -e JWT_SECRET=change-me -e COOKIE_SECURE=1 -e DATA_DIR=/data -v nestos-data:/data nestos
```

Put nginx + HTTPS later if needed.

## What to tell Mani

- Links are on cloud host, **not** tied to your laptop.
- Still trial software, not final ownership.
- Extension NestOS URL = the **https cloud base**, never `localhost`.

## Before you deploy

```powershell
cd C:\Users\neila\Projects\connectosWebsite1\NestOS
npm run pack:extension
```

Confirm `downloads/nestos-naukri-helper.zip` exists and `downloads/nestos-trial-guide.pdf` if you want PDF serve.

## Local laptop tunnel = only for *your* quick test

```powershell
npm run dev
npx cloudflared tunnel --url http://localhost:4100
```

Do **not** WhatsApp that temp URL to Mani for multi-day trial.
