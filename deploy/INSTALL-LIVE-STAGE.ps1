$ErrorActionPreference = "Stop"
$Project = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
try {
  $RepoRoot = (git -C $Project rev-parse --show-toplevel).Trim()
} catch {
  throw "This project must be inside a Git repository before the live-stage workflow can be installed."
}

$ProjectNorm = $Project.Replace('\','/')
$RepoNorm = $RepoRoot.Replace('\','/')
if ($ProjectNorm -eq $RepoNorm) {
  $Subdir = "."
  $DistPath = '${{ github.workspace }}/dist'
} else {
  $Subdir = $ProjectNorm.Substring($RepoNorm.Length + 1)
  $DistPath = '${{ github.workspace }}/' + $Subdir + '/dist'
}

$Template = Get-Content (Join-Path $PSScriptRoot "xplay-live-stage.template.yml") -Raw
$Workflow = $Template.Replace("__PROJECT_SUBDIR__", $Subdir).Replace("__DIST_PATH__", $DistPath)

$WorkflowDir = Join-Path $RepoRoot ".github\workflows"
New-Item -ItemType Directory -Force -Path $WorkflowDir | Out-Null
$Out = Join-Path $WorkflowDir "xplay-live-stage.yml"
Set-Content -Path $Out -Value $Workflow -Encoding UTF8

Write-Host ""
Write-Host "XPLAY live-stage workflow installed:" -ForegroundColor Cyan
Write-Host $Out
Write-Host ""
Write-Host "Project subdirectory: $Subdir"
Write-Host "Expected GitHub Pages URL for repo $(git remote get-url origin | ForEach-Object { $_ -replace '^.+/([^/]+)\.git$', '$1' })" -ForegroundColor Green
$RepoName = (git remote get-url origin | ForEach-Object { $_ -replace '^.+/([^/]+)\.git$', '$1' })
Write-Host "https://2flykl.github.io/$RepoName/"
Write-Host ""
Write-Host "Commit and push the workflow + release candidate to main."
Write-Host "GitHub Pages must use GitHub Actions as its Pages source."
