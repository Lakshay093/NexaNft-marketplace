param(
  [ValidateSet('start','web','android','ios','tunnel','dev-client','export-web','help')]
  [string]$Mode = 'start',
  [int]$Port = 8081,
  [string]$ApiUrl = '',
  [string]$NodePath = $env:NEXANFT_NODE_PATH
)
$ErrorActionPreference = 'Stop'
$mobileRoot = Split-Path -Parent $PSScriptRoot
if ($Mode -eq 'help') {
  Write-Output 'Usage: pwsh -File script/build_and_run.ps1 [-Mode start|web|android|ios|tunnel|dev-client|export-web] [-Port 8081] [-ApiUrl http://LAN_IP:4000/api] [-NodePath PATH_TO_NODE_EXE]'
  exit 0
}
$systemNode = (Get-Command node -ErrorAction SilentlyContinue).Source
$nodeExecutable = $null
foreach ($candidate in @($NodePath, $systemNode)) {
  if ($candidate -and (Test-Path -LiteralPath $candidate)) {
    $majorVersion = & $candidate -p 'process.versions.node.split(".")[0]'
    if ($majorVersion -in @('22','24')) { $nodeExecutable = $candidate; break }
  }
}
if (-not $nodeExecutable) { throw 'Install Node.js 22 or 24 LTS before starting Expo.' }
$env:Path = (Split-Path -Parent $nodeExecutable) + ';' + $env:Path
Set-Location -LiteralPath $mobileRoot
if (-not $ApiUrl -and -not $env:EXPO_PUBLIC_API_URL -and $Mode -ne 'export-web') {
  $network = Get-NetIPConfiguration -ErrorAction SilentlyContinue |
    Where-Object { $_.IPv4DefaultGateway -and $_.InterfaceAlias -eq 'Wi-Fi' } |
    Select-Object -First 1
  if ($network) { $ApiUrl = 'http://' + $network.IPv4Address.IPAddress + ':4000/api' }
}
if ($ApiUrl) { $env:EXPO_PUBLIC_API_URL = $ApiUrl }
$expoArguments = if ($Mode -eq 'export-web') { @('export','--platform','web') } else { @('start','--port',"$Port") }
if ($Mode -notin @('start','export-web')) { $expoArguments += '--' + $Mode }
& $nodeExecutable (Join-Path $mobileRoot '..\node_modules\expo\bin\cli') @expoArguments
exit $LASTEXITCODE
