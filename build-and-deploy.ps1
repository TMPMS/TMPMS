param(
    [string]$BackendWwwroot = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")) "TMPMS_BE\wwwroot")
)

$ErrorActionPreference = "Stop"
$FeRoot = $PSScriptRoot
$DistDir = Join-Path $FeRoot "dist"
$ApiUrl = $env:VITE_API_URL
if ($null -eq $ApiUrl) {
    # Empty is correct here: this script copies dist/ straight into the backend's own
    # wwwroot, so the SPA and API share one origin and relative API paths just work.
    $ApiUrl = ""
}

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

Write-Host "==> Removing stale bundle files (old hashed assets)"
$assetsDir = Join-Path $BackendWwwroot "assets"
if (Test-Path -LiteralPath $assetsDir) {
    Remove-Item -LiteralPath $assetsDir -Recurse -Force
}

robocopy $DistDir $BackendWwwroot /E /NFL /NDL /NJH /NJS /NP /XD uploads
$robocopyExit = $LASTEXITCODE
if ($robocopyExit -ge 8) {
    throw "robocopy failed with exit code $robocopyExit"
}

Write-Host "==> Deploy complete."
Write-Host "    Served bundle: $(Get-Content -LiteralPath (Join-Path $BackendWwwroot 'index.html') -Raw | Select-String -Pattern 'assets/index-[^\"'']+' -AllMatches | ForEach-Object { $_.Matches.Value })"
