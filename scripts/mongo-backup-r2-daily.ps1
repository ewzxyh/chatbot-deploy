param(
  [string]$MongoContainer = $(if ($env:MONGO_CONTAINER) { $env:MONGO_CONTAINER } else { "mongo" }),
  [string]$BackupDir = $(if ($env:MONGO_BACKUP_DIR) { $env:MONGO_BACKUP_DIR } else { (Join-Path $PSScriptRoot "..\backups\mongo") }),
  [string]$DownloadDir = $(if ($env:MONGO_R2_DOWNLOAD_DIR) { $env:MONGO_R2_DOWNLOAD_DIR } else { (Join-Path $PSScriptRoot "..\backups\mongo-r2-download-test") }),
  [string]$LogDir = $(if ($env:MONGO_BACKUP_LOG_DIR) { $env:MONGO_BACKUP_LOG_DIR } else { (Join-Path $PSScriptRoot "..\backups\logs") }),
  [string]$RestoreSuffix = $(if ($env:MONGO_RESTORE_SUFFIX) { $env:MONGO_RESTORE_SUFFIX } else { "restore-test" }),
  [switch]$SkipRestoreCheck
)

$ErrorActionPreference = "Stop"

function Import-DotEnv {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    return
  }

  foreach ($line in [System.IO.File]::ReadAllLines($Path)) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith("#")) {
      continue
    }

    $match = [regex]::Match($trimmed, "^([A-Za-z_][A-Za-z0-9_]*)=(.*)$")
    if (-not $match.Success) {
      continue
    }

    $key = $match.Groups[1].Value
    $value = $match.Groups[2].Value.Trim()
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    if (-not [System.Environment]::GetEnvironmentVariable($key, "Process")) {
      [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
  }
}

function Invoke-Checked {
  param(
    [string]$FilePath,
    [string[]]$Arguments
  )

  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$FilePath $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
  }
}

function Get-LatestBackupSet {
  param([string]$Root)

  $latestManifest = Get-ChildItem -LiteralPath $Root -Recurse -Filter manifest.json |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (-not $latestManifest) {
    throw "No manifest.json found under $Root"
  }

  return Split-Path -Parent $latestManifest.FullName
}

function Test-RestoreCounts {
  param(
    [string]$MongoContainerName,
    [string]$Suffix
  )

  $safeSuffix = $Suffix.Replace("\", "\\").Replace("'", "\'")
  $js = @'
const restoreSuffix = '__RESTORE_SUFFIX__';
const checks = {
  tiledesk: ['users','projects','requests','leads','integrations','messages','files.files','files.chunks','project_users','kvstore'],
  chat21: ['messages','conversations','groups','instances'],
  'tiledesk-logs': ['router_loggers']
};
let failed = false;
for (const [dbName, collections] of Object.entries(checks)) {
  const source = db.getSiblingDB(dbName);
  const restored = db.getSiblingDB(`${dbName}-${restoreSuffix}`);
  for (const collection of collections) {
    const left = source.getCollection(collection).countDocuments({});
    const right = restored.getCollection(collection).countDocuments({});
    const ok = left === right;
    print(`${ok ? 'OK' : 'FAIL'} ${dbName}.${collection}: ${left} -> ${right}`);
    if (!ok) failed = true;
  }
}
if (failed) quit(1);
'@.Replace("__RESTORE_SUFFIX__", $safeSuffix)

  $mongoShellArgs = @("compose", "exec", "-T", $MongoContainerName, "mongosh")
  if ($env:MONGO_BACKUP_URI) {
    $mongoShellArgs += $env:MONGO_BACKUP_URI
  }
  $mongoShellArgs += @("--quiet", "--eval", $js)

  Invoke-Checked -FilePath "docker" -Arguments $mongoShellArgs
}

function Send-BackupAlert {
  param(
    [string]$Status,
    [string]$Message,
    [string]$LogPath
  )

  $timestamp = (Get-Date).ToString("o")
  $payloadObject = [ordered]@{
    text = "ChatCase Mongo R2 backup $Status on $env:COMPUTERNAME: $Message"
    content = "ChatCase Mongo R2 backup $Status on $env:COMPUTERNAME: $Message"
    status = $Status
    host = $env:COMPUTERNAME
    timestamp = $timestamp
    logPath = $LogPath
  }

  $webhookUrl = $env:BACKUP_ALERT_WEBHOOK_URL
  if ($webhookUrl) {
    $payload = $payloadObject | ConvertTo-Json -Depth 4
    Invoke-RestMethod -Method Post -Uri $webhookUrl -ContentType "application/json" -Body $payload -TimeoutSec 20 | Out-Null
    return
  }

  if ($Status -ne "success") {
    $alertPath = Join-Path $LogDir "last-failure-alert.json"
    $payloadObject | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $alertPath -Encoding UTF8
    Write-Warning "BACKUP_ALERT_WEBHOOK_URL is not configured. Failure alert saved at $alertPath"

    $eventMessage = "ChatCase Mongo R2 backup failed: $Message. Log: $LogPath"
    & eventcreate.exe /T ERROR /ID 100 /L APPLICATION /SO ChatCaseBackup /D $eventMessage 2>$null | Out-Null
  }
}

$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
Set-Location $projectRoot
Import-DotEnv -Path (Join-Path $projectRoot ".env")

$resolvedBackupDir = [System.IO.Path]::GetFullPath($BackupDir)
$resolvedDownloadDir = [System.IO.Path]::GetFullPath($DownloadDir)
$resolvedLogDir = [System.IO.Path]::GetFullPath($LogDir)

New-Item -ItemType Directory -Force -Path $resolvedBackupDir, $resolvedDownloadDir, $resolvedLogDir | Out-Null

$runId = Get-Date -Format "yyyyMMdd-HHmmss"
$logPath = Join-Path $resolvedLogDir "mongo-r2-daily-$runId.log"
$lastResultPath = Join-Path $resolvedLogDir "mongo-r2-daily-last.json"
$backupSetId = $null

Start-Transcript -Path $logPath -Append | Out-Null
try {
  Write-Host "ChatCase Mongo R2 daily backup started at $(Get-Date -Format o)"
  Write-Host "Project root: $projectRoot"
  Write-Host "Log: $logPath"

  Invoke-Checked -FilePath "powershell" -Arguments @(
    "-ExecutionPolicy", "Bypass",
    "-File", (Join-Path $PSScriptRoot "mongo-backup-r2.ps1"),
    "-MongoContainer", $MongoContainer,
    "-BackupDir", $resolvedBackupDir
  )

  $latestBackupSet = Get-LatestBackupSet -Root $resolvedBackupDir
  $backupSetId = Split-Path -Leaf $latestBackupSet

  if (-not $SkipRestoreCheck) {
    Invoke-Checked -FilePath "node" -Arguments @(
      (Join-Path $PSScriptRoot "r2-backup-sync.js"),
      "download",
      "--set-id", $backupSetId,
      "--output-dir", $resolvedDownloadDir
    )

    $downloadedSet = Join-Path $resolvedDownloadDir $backupSetId
    Invoke-Checked -FilePath "powershell" -Arguments @(
      "-ExecutionPolicy", "Bypass",
      "-File", (Join-Path $PSScriptRoot "mongo-restore-test.ps1"),
      "-MongoContainer", $MongoContainer,
      "-BackupSet", $downloadedSet,
      "-RestoreSuffix", $RestoreSuffix
    )

    Test-RestoreCounts -MongoContainerName $MongoContainer -Suffix $RestoreSuffix
  } else {
    Write-Warning "Restore check skipped by parameter."
  }

  $result = [ordered]@{
    status = "success"
    backupSet = $backupSetId
    completedAt = (Get-Date).ToString("o")
    logPath = $logPath
    restoreCheck = (-not $SkipRestoreCheck)
  }
  $result | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $lastResultPath -Encoding UTF8

  $staleFailureAlert = Join-Path $resolvedLogDir "last-failure-alert.json"
  if (Test-Path -LiteralPath $staleFailureAlert) {
    Remove-Item -LiteralPath $staleFailureAlert -Force
  }

  if ($env:BACKUP_ALERT_ON_SUCCESS -eq "true") {
    Send-BackupAlert -Status "success" -Message "backup set $backupSetId completed" -LogPath $logPath
  }

  Write-Host "ChatCase Mongo R2 daily backup completed successfully."
} catch {
  $message = $_.Exception.Message
  $result = [ordered]@{
    status = "failed"
    backupSet = $backupSetId
    failedAt = (Get-Date).ToString("o")
    error = $message
    logPath = $logPath
    restoreCheck = (-not $SkipRestoreCheck)
  }
  $result | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $lastResultPath -Encoding UTF8

  try {
    Send-BackupAlert -Status "failed" -Message $message -LogPath $logPath
  } catch {
    Write-Warning "Failed to send backup alert: $($_.Exception.Message)"
  }

  throw
} finally {
  Stop-Transcript | Out-Null
}
