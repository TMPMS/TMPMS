param(
    [string]$BackendWwwroot = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")) "TMPMS_BE\wwwroot")
)

$ErrorActionPreference = "Stop"
$FeRoot = $PSScriptRoot
$DistDir = Join-Path $FeRoot "dist"
$ApiUrl = $env:VITE_API_URL
if (-not $ApiUrl) { $ApiUrl = "http://localhost:5000" }

Write-Host "==> Building FE with VITE_API_URL=$ApiUrl"
$env:VITE_API_URL = $ApiUrl
Push-Location $FeRoot
try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build failed with exit code $LASTEXITCODE" }
}
finally {
    Pop-Location
}

Write-Host "==> Syncing dist -> $BackendWwwroot"
if (-not (Test-Path -LiteralPath $BackendWwwroot)) {
    throw "Backend wwwroot not found: $BackendWwwroot"
}

$uploadDir = Join-Path $BackendWwwroot "uploads"
if (Test-Path -LiteralPath $uploadDir) {
    Write-Host "==> Preserving uploads folder"
}

robocopy $DistDir $BackendWwwroot /E /NFL /NDL /NJH /NJS /NP /XD uploads
$robocopyExit = $LASTEXITCODE
if ($robocopyExit -ge 8) {
    throw "robocopy failed with exit code $robocopyExit"
}

Write-Host "==> Removing stale bundle files (old hashed assets)"
Get-ChildItem -LiteralPath (Join-Path $BackendWwwroot "assets") -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notmatch "^index-(C-YpOo-F|Bg5WrkpI)\." } |
    Remove-Item -Force -ErrorAction SilentlyContinue

Write-Host "==> Deploy complete."
Write-Host "    Served bundle: $(Get-Content -LiteralPath (Join-Path $BackendWwwroot 'index.html') -Raw | Select-String -Pattern 'assets/index-[^\"'']+' -AllMatches | ForEach-Object { $_.Matches.Value })"
