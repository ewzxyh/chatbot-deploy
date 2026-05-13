param(
  [string]$MongoContainer = $(if ($env:MONGO_CONTAINER) { $env:MONGO_CONTAINER } else { "mongo" }),
  [string]$BackupDir = $(if ($env:MONGO_BACKUP_DIR) { $env:MONGO_BACKUP_DIR } else { (Join-Path $PSScriptRoot "..\backups\mongo") }),
  [string]$Databases = $(if ($env:MONGO_DATABASES) { $env:MONGO_DATABASES } else { "tiledesk,chat21,tiledesk-logs" })
)

$ErrorActionPreference = "Stop"

function Invoke-Docker {
  param([string[]]$Arguments)

  & docker @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "docker $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
  }
}

$databaseList = $Databases -split "[,; ]+" | Where-Object { $_ -and $_.Trim() } | ForEach-Object { $_.Trim() }
if (-not $databaseList -or $databaseList.Count -eq 0) {
  throw "No databases configured. Set MONGO_DATABASES or pass -Databases."
}

$inspect = & docker inspect $MongoContainer 2>$null
if ($LASTEXITCODE -ne 0) {
  throw "Mongo container '$MongoContainer' was not found or Docker is not running."
}

$resolvedBackupDir = [System.IO.Path]::GetFullPath($BackupDir)
New-Item -ItemType Directory -Force -Path $resolvedBackupDir | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupSetDir = Join-Path $resolvedBackupDir $timestamp
New-Item -ItemType Directory -Force -Path $backupSetDir | Out-Null

$manifest = [ordered]@{
  createdAt = (Get-Date).ToUniversalTime().ToString("o")
  mongoContainer = $MongoContainer
  databases = @()
}

foreach ($db in $databaseList) {
  $safeDbName = $db -replace "[^A-Za-z0-9_.-]", "_"
  $archiveName = "$safeDbName.archive.gz"
  $containerArchive = "/tmp/chatcase-$timestamp-$safeDbName.archive.gz"
  $hostArchive = Join-Path $backupSetDir $archiveName

  Write-Host "Backing up database '$db'..."
  Invoke-Docker @("exec", $MongoContainer, "mongodump", "--db", $db, "--archive=$containerArchive", "--gzip")
  Invoke-Docker @("cp", "${MongoContainer}:$containerArchive", $hostArchive)
  Invoke-Docker @("exec", $MongoContainer, "rm", "-f", $containerArchive)

  $file = Get-Item -LiteralPath $hostArchive
  $hash = Get-FileHash -Algorithm SHA256 -LiteralPath $hostArchive
  $manifest.databases += [ordered]@{
    name = $db
    archive = $archiveName
    bytes = $file.Length
    sha256 = $hash.Hash.ToLowerInvariant()
  }
}

$manifestPath = Join-Path $backupSetDir "manifest.json"
$manifest | ConvertTo-Json -Depth 5 | Set-Content -Path $manifestPath -Encoding UTF8

Write-Host ""
Write-Host "Mongo backup completed:"
Write-Host $backupSetDir
Write-Host "Manifest:"
Write-Host $manifestPath
