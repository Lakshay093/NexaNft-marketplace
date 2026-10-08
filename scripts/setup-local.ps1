param([string]$PostgresBin = 'C:\Program Files\PostgreSQL\18\bin')
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$data = Join-Path $root 'server\.data'
New-Item -ItemType Directory -Path $data -Force | Out-Null
$envPath = Join-Path $root 'server\.env'
if (Test-Path -LiteralPath $envPath) { throw 'server/.env already exists. Preserve it; use your existing infrastructure.' }
function New-Secret { return [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLower() }
$dbPassword = New-Secret
$jwtSecret = New-Secret
$pwPath = Join-Path $data 'pg-password'
Set-Content -LiteralPath $pwPath -Value $dbPassword -Encoding ascii
$pgData = Join-Path $data 'postgres'
& (Join-Path $PostgresBin 'initdb.exe') -D $pgData -U nexanft --auth=scram-sha-256 --pwfile=$pwPath --encoding=UTF8 --locale=C
if ($LASTEXITCODE -ne 0) { throw 'initdb failed' }
Remove-Item -LiteralPath $pwPath
& (Join-Path $PostgresBin 'pg_ctl.exe') -D $pgData -l (Join-Path $data 'postgres.log') -o '-p 55432 -h 127.0.0.1' -w start
if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL startup failed' }
$env:PGPASSWORD = $dbPassword
& (Join-Path $PostgresBin 'createdb.exe') -h 127.0.0.1 -p 55432 -U nexanft nexanft
& (Join-Path $PostgresBin 'createdb.exe') -h 127.0.0.1 -p 55432 -U nexanft nexanft_test
Remove-Item Env:PGPASSWORD
$template = Get-Content -LiteralPath (Join-Path $root 'server\.env.example') -Raw
$template.Replace('replace-with-a-local-password', $dbPassword).Replace('localhost:5433','127.0.0.1:55432').Replace('replace-with-at-least-32-random-characters',$jwtSecret) | Set-Content -LiteralPath $envPath -Encoding utf8
Copy-Item -LiteralPath (Join-Path $root 'mobile\.env.example') -Destination (Join-Path $root 'mobile\.env')
Copy-Item -LiteralPath (Join-Path $root 'landing\.env.example') -Destination (Join-Path $root 'landing\.env')
Write-Host 'Isolated development PostgreSQL started. Credentials were written only to ignored server/.env. Local image storage is served by the API.'
