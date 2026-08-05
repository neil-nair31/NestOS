$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$ext = Join-Path $root "extension"
$outDir = Join-Path $root "downloads"
$stage = Join-Path $env:TEMP "nestos-naukri-helper"
$zip = Join-Path $outDir "nestos-naukri-helper.zip"

if (-not (Test-Path (Join-Path $ext "manifest.json"))) {
  throw "Extension folder missing: $ext"
}

New-Item -ItemType Directory -Force -Path $outDir | Out-Null
Remove-Item -Recurse -Force $stage -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $stage | Out-Null
Copy-Item -Path (Join-Path $ext "*") -Destination $stage -Recurse -Force
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path $stage -DestinationPath $zip -Force
Write-Host "Wrote $zip ($((Get-Item $zip).Length) bytes)"
