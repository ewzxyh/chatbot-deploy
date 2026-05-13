param(
  [string]$MongoContainer = $(if ($env:MONGO_CONTAINER) { $env:MONGO_CONTAINER } else { "mongo" }),
  [string]$BackupDir = $(if ($env:MONGO_BACKUP_DIR) { $env:MONGO_BACKUP_DIR } else { (Join-Path $PSScriptRoot "..\backups\mongo") }),
  [string]$Databases = $(if ($env:MONGO_DATABASES) { $env:MONGO_DATABASES } else { "tiledesk,chat21,tiledesk-logs" }),
  [switch]$SkipBackup,
  [switch]$SkipRetention,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Invoke-Checked {
  param([scriptblock]$Command)

  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code $LASTEXITCODE"
  }
}

$backupScript = Join-Path $PSScriptRoot "mongo-backup.ps1"
$syncScript = Join-Path $PSScriptRoot "r2-backup-sync.js"
$resolvedBackupDir = [System.IO.Path]::GetFullPath($BackupDir)

if (-not $SkipBackup) {
  & powershell -ExecutionPolicy Bypass -File $backupScript `
    -MongoContainer $MongoContainer `
    -BackupDir $resolvedBackupDir `
    -Databases $Databases

  if ($LASTEXITCODE -ne 0) {
    throw "Mongo backup failed with exit code $LASTEXITCODE"
  }
}

$latestManifest = Get-ChildItem -LiteralPath $resolvedBackupDir -Recurse -Filter manifest.json |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (-not $latestManifest) {
  throw "No manifest.json found under $resolvedBackupDir"
}

$backupSetDir = Split-Path -Parent $latestManifest.FullName
$args = @($syncScript, "upload", "--backup-set", $backupSetDir)

if (-not $SkipRetention) {
  $args += "--retention"
}
if ($DryRun) {
  $args += "--dry-run"
}

& node @args
if ($LASTEXITCODE -ne 0) {
  throw "R2 backup sync failed with exit code $LASTEXITCODE"
}
