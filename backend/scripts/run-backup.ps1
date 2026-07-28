# Daily DB backup for Windows (Task Scheduler)
# Registers: .\scripts\register-backup-task.ps1
# Manual:    npm run db:backup:offsite

$ErrorActionPreference = 'Stop'
$backend = Split-Path -Parent $PSScriptRoot
Set-Location $backend

# Load optional backup.env (BACKUP_S3_URI, AWS_*, etc.)
$backupEnv = Join-Path $backend 'backup.env'
if (Test-Path $backupEnv) {
  Get-Content $backupEnv | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
    $k, $v = $_.Split('=', 2)
    if ($k -and $v) { Set-Item -Path "Env:$($k.Trim())" -Value $v.Trim() }
  }
}

npm run db:backup:offsite
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
