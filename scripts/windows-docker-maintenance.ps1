param(
  [switch]$PruneUnusedImages,
  [switch]$SkipDesktopReclaim,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$desktopReclaimImage = "docker/desktop-reclaim-space"

function Invoke-Checked {
  param(
    [string]$Command,
    [string[]]$Arguments
  )

  if ($DryRun) {
    Write-Output ("DRY RUN: {0} {1}" -f $Command, ($Arguments -join " "))
    return
  }

  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Command failed with exit code $LASTEXITCODE"
  }
}

function Get-DockerDataVhdx {
  $path = Join-Path $env:LOCALAPPDATA "Docker\wsl\disk\docker_data.vhdx"
  if (Test-Path -LiteralPath $path) {
    return Get-Item -LiteralPath $path
  }

  return $null
}

Write-Output "Checking Docker engine..."
Invoke-Checked "docker" @("info")

$vhdxBefore = Get-DockerDataVhdx
if ($vhdxBefore) {
  Write-Output ("docker_data.vhdx before: {0:N2} GB" -f ($vhdxBefore.Length / 1GB))
}

Write-Output "Docker usage before cleanup:"
Invoke-Checked "docker" @("system", "df")

if (-not $SkipDesktopReclaim) {
  Write-Output "Running Docker Desktop space reclaim helper..."
  Invoke-Checked "docker" @("run", "--rm", "--privileged", "--pid=host", $desktopReclaimImage)
  Write-Output "Removing Docker Desktop space reclaim helper image..."
  Invoke-Checked "docker" @("image", "rm", "-f", $desktopReclaimImage)
}

Write-Output "Pruning Docker build cache..."
Invoke-Checked "docker" @("builder", "prune", "-af")

if ($PruneUnusedImages) {
  Write-Output "Pruning all unused images..."
  Invoke-Checked "docker" @("image", "prune", "-a", "-f")
} else {
  Write-Output "Pruning dangling images only..."
  Invoke-Checked "docker" @("image", "prune", "-f")
}

Write-Output "Docker usage after cleanup:"
Invoke-Checked "docker" @("system", "df")

$vhdxAfter = Get-DockerDataVhdx
if ($vhdxAfter) {
  Write-Output ("docker_data.vhdx after: {0:N2} GB" -f ($vhdxAfter.Length / 1GB))
}

if ($vhdxBefore -and $vhdxAfter -and $vhdxAfter.Length -ge $vhdxBefore.Length) {
  Write-Output "Note: Docker usage can drop while docker_data.vhdx keeps the same physical size."
  Write-Output "Physical VHDX compaction requires Docker/WSL stopped and an elevated PowerShell/diskpart session."
}

Write-Output "Done. Volumes were not pruned."
