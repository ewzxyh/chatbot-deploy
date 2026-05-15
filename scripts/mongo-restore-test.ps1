param(
  [string]$MongoContainer = $(if ($env:MONGO_CONTAINER) { $env:MONGO_CONTAINER } else { "mongo" }),
  [string]$BackupDir = $(if ($env:MONGO_BACKUP_DIR) { $env:MONGO_BACKUP_DIR } else { (Join-Path $PSScriptRoot "..\backups\mongo") }),
  [string]$BackupSet,
  [string]$RestoreSuffix = $(if ($env:MONGO_RESTORE_SUFFIX) { $env:MONGO_RESTORE_SUFFIX } else { "restore-test" }),
  [string]$MongoBackupUri = $env:MONGO_BACKUP_URI,
  [switch]$NoDrop
)

$ErrorActionPreference = "Stop"

function Invoke-Docker {
  param([string[]]$Arguments)

  & docker @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "docker $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
  }
}

$resolvedBackupDir = [System.IO.Path]::GetFullPath($BackupDir)
if (-not (Test-Path -LiteralPath $resolvedBackupDir)) {
  throw "Backup directory not found: $resolvedBackupDir"
}

if (-not $BackupSet) {
  $latestManifest = Get-ChildItem -LiteralPath $resolvedBackupDir -Recurse -Filter manifest.json |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (-not $latestManifest) {
    throw "No manifest.json found under $resolvedBackupDir"
  }
  $manifestPath = $latestManifest.FullName
} else {
  $candidate = [System.IO.Path]::GetFullPath($BackupSet)
  if ((Test-Path -LiteralPath $candidate -PathType Container)) {
    $manifestPath = Join-Path $candidate "manifest.json"
  } else {
    $manifestPath = $candidate
  }
}

if (-not (Test-Path -LiteralPath $manifestPath)) {
  throw "Manifest not found: $manifestPath"
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$backupSetDir = Split-Path -Parent $manifestPath

$inspect = & docker inspect $MongoContainer 2>$null
if ($LASTEXITCODE -ne 0) {
  throw "Mongo container '$MongoContainer' was not found or Docker is not running."
}

foreach ($db in $manifest.databases) {
  $sourceDb = [string]$db.name
  $targetDb = "$sourceDb-$RestoreSuffix"
  $archivePath = Join-Path $backupSetDir ([string]$db.archive)
  if (-not (Test-Path -LiteralPath $archivePath)) {
    throw "Archive not found: $archivePath"
  }

  $safeTarget = $targetDb -replace "[^A-Za-z0-9_.-]", "_"
  $containerArchive = "/tmp/chatcase-restore-$safeTarget.archive.gz"

  Write-Host "Restoring '$sourceDb' into '$targetDb'..."
  Invoke-Docker @("cp", $archivePath, "${MongoContainer}:$containerArchive")

  $restoreArgs = @(
    "exec", $MongoContainer,
    "mongorestore"
  )
  if ($MongoBackupUri) {
    $restoreArgs += @("--uri", $MongoBackupUri)
  }
  $restoreArgs += @(
    "--archive=$containerArchive",
    "--gzip",
    "--nsFrom=$sourceDb.*",
    "--nsTo=$targetDb.*"
  )
  if (-not $NoDrop) {
    $restoreArgs += "--drop"
  }

  Invoke-Docker $restoreArgs
  Invoke-Docker @("exec", $MongoContainer, "rm", "-f", $containerArchive)

  $statsEval = "const dbName='$targetDb'; const d=db.getSiblingDB(dbName); printjson({ db: dbName, collections: d.getCollectionNames().length, dataSize: d.stats().dataSize });"
  $statsArgs = @("exec", $MongoContainer, "mongosh")
  if ($MongoBackupUri) {
    $statsArgs += $MongoBackupUri
  }
  $statsArgs += @("--quiet", "--eval", $statsEval)
  Invoke-Docker $statsArgs
}

Write-Host ""
Write-Host "Restore test completed from manifest:"
Write-Host $manifestPath
Write-Host "Restored databases use suffix: -$RestoreSuffix"
