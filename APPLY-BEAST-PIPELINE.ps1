param(
  [string]$Repo = "."
)
$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoPath = (Resolve-Path $Repo).Path

if (-not (Test-Path (Join-Path $repoPath "package.json"))) {
  throw "Run this from the XPLAYEngine repo root, or pass -Repo <path>."
}

$files = @(
  "server\beastPipeline.js",
  "server\index.js",
  "public\beast-lab.html",
  "public\beast-lab.js",
  "src\core\ApiBase.js",
  "BEAST-PIPELINE-START-HERE.md",
  "RUN-BEAST-PIPELINE-LAB.bat"
)

foreach ($rel in $files) {
  $src = Join-Path $here $rel
  $dst = Join-Path $repoPath $rel
  $dir = Split-Path -Parent $dst
  if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  Copy-Item -Force $src $dst
  Write-Host "Applied $rel"
}

Write-Host ""
Write-Host "XPLAY Beast Pipeline installed." -ForegroundColor Green
Write-Host "Run: .\RUN-BEAST-PIPELINE-LAB.bat"
