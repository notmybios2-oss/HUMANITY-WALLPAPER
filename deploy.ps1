# Sync the wallpaper into Wallpaper Engine's myprojects folder.
# Usage: powershell -ExecutionPolicy Bypass -File deploy.ps1

$ErrorActionPreference = 'Stop'

$src = Join-Path $PSScriptRoot 'wallpaper'

# Locate Wallpaper Engine via the Steam install path, with the default as fallback.
$steam = $null
try { $steam = (Get-ItemProperty 'HKLM:\SOFTWARE\WOW6432Node\Valve\Steam' -ErrorAction Stop).InstallPath } catch {}
if (-not $steam) { $steam = 'C:\Program Files (x86)\Steam' }

$we = Join-Path $steam 'steamapps\common\wallpaper_engine'
if (-not (Test-Path $we)) {
    Write-Error "Wallpaper Engine not found at $we - pass the correct Steam library path."
}

$dest = Join-Path $we 'projects\myprojects\wikispy-wallpaper'
robocopy $src $dest /MIR /NJH /NJS /NDL /NFL | Out-Null
if ($LASTEXITCODE -ge 8) { Write-Error "robocopy failed with code $LASTEXITCODE" }

Write-Host "Deployed to $dest"
Write-Host "Restart Wallpaper Engine (or re-select the wallpaper) to pick up changes."
