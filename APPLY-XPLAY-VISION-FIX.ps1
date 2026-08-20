$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverFile = Join-Path $repo 'server\index.js'
if (!(Test-Path $serverFile)) { throw "Run this patch from the ROOT of XPLAYEngine. server\index.js was not found." }

$src = Get-Content $serverFile -Raw

# 1) Use the known-working model by default.
$src = $src -replace "gemini-2\.5-flash", "gemini-3.6-flash"

# 2) Import the proven Vision Drop bridge once.
if ($src -notmatch "registerGeminiVisionDropRoutes") {
  $src = "import { registerGeminiVisionDropRoutes } from './geminiVisionDrop.js';`r`n" + $src
}

# 3) Remove the old XPLAY /api/vision/health and /api/vision/analyze route block only.
$pattern = "(?s)app\.get\('/api/vision/health'.*?\n\}\);\s*app\.post\('/api/vision/analyze'.*?\n\}\);"
if ($src -match $pattern) {
  $src = [regex]::Replace($src,$pattern,"registerGeminiVisionDropRoutes(app,{apiKey:geminiKey,model:geminiModel});",1)
} elseif ($src -notmatch "registerGeminiVisionDropRoutes\(app") {
  # Insert immediately before calibration profiles if route block has drifted.
  $src = $src -replace "\nconst CALIBRATION_PROFILES=", "`r`nregisterGeminiVisionDropRoutes(app,{apiKey:geminiKey,model:geminiModel});`r`n`r`nconst CALIBRATION_PROFILES="
}

Set-Content $serverFile $src -Encoding UTF8
Write-Host "XPLAY Vision Drop proven bridge applied." -ForegroundColor Green
Write-Host "Next: git add . ; git commit -m 'Use proven Gemini Vision Drop pipeline' ; git push origin main" -ForegroundColor Cyan
