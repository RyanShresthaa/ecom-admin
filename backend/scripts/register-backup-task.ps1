# Register a daily 03:15 Windows scheduled task for DB backups.
# Run once (Admin recommended): powershell -ExecutionPolicy Bypass -File scripts\register-backup-task.ps1

$ErrorActionPreference = 'Stop'
$backend = Split-Path -Parent $PSScriptRoot
$script = Join-Path $PSScriptRoot 'backup-docker.ps1'
$taskName = 'AppDbBackupDaily'

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$script`"" -WorkingDirectory $backend
$trigger = New-ScheduledTaskTrigger -Daily -At 3:15am
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description 'Docker Postgres backup (pg_dump -Fc + optional S3)' -Force | Out-Null
Write-Host "Registered scheduled task: $taskName (daily 03:15) → backup-docker.ps1"
Write-Host "Optional: set env BACKUP_S3_URI or create backend\backup.env"
Get-ScheduledTask -TaskName $taskName | Format-List TaskName, State
