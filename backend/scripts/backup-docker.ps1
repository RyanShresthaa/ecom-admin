# Backup the Docker Compose Postgres (internal network) to backend/backups/
$ErrorActionPreference = 'Stop'
$backend = Split-Path -Parent $PSScriptRoot
Set-Location $backend

$stamp = Get-Date -Format 'yyyy-MM-ddTHH-mm-ss'
$outDir = Join-Path $backend 'backups'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$outFile = "backup-app-$stamp.dump"
$containerOut = "/tmp/$outFile"

Write-Host "[backup:docker] Dumping from container backend-db-1..."
docker compose -f docker-compose.prod.yml exec -T db sh -c "pg_dump -U postgres -d app -Fc -f $containerOut"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

docker compose -f docker-compose.prod.yml cp "db:$containerOut" (Join-Path $outDir $outFile)
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

docker compose -f docker-compose.prod.yml exec -T db rm -f $containerOut | Out-Null
Write-Host "[backup:docker] Saved:" (Join-Path $outDir $outFile)

$s3 = $env:BACKUP_S3_URI
if ($s3) {
  $local = Join-Path $outDir $outFile
  $dest = "$($s3.TrimEnd('/'))/$outFile"
  Write-Host "[backup:docker] Uploading to $dest"
  aws s3 cp $local $dest --only-show-errors
}
