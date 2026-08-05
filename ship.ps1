# NestOS ship script — full product on one URL
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

Write-Host ""
Write-Host "  NestOS — shipping full HummingBrains product" -ForegroundColor Green
Write-Host ""

if (!(Test-Path "server\.env")) {
  Copy-Item "server\.env.example" "server\.env"
}

if (!(Test-Path "node_modules")) {
  Write-Host "Installing dependencies..."
  npm install
}

# Ensure sample resumes exist for Mani demo
if (!(Test-Path "server\data\samples\Rohini_Menon_Resume.pdf")) {
  Write-Host "Generating sample resumes..."
  Push-Location server
  npx tsx scripts/make-samples.ts
  Pop-Location
}

# Kill anything on 4100
$procs = Get-NetTCPConnection -LocalPort 4100 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($pid in $procs) {
  if ($pid -and $pid -ne 0) {
    Write-Host "Stopping old process on :4100 (PID $pid)"
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
  }
}

Write-Host ""
Write-Host "  Starting NestOS on http://localhost:4100" -ForegroundColor Cyan
Write-Host "  Open that URL — full NestOS UI + live APIs" -ForegroundColor Cyan
Write-Host "  Demo path: Talent Hub (drop PDFs) → candidate → WhatsApp/Email → Revenue invoices" -ForegroundColor Yellow
Write-Host ""

npm run dev
