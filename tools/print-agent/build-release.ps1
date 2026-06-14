# Build Simple Account Print Agent for Windows and zip it for POS download.
# Run from PowerShell on a Windows PC with .NET 8 SDK installed:
#   cd tools\print-agent
#   .\build-release.ps1

$ErrorActionPreference = "Stop"

$Root = $PSScriptRoot
$Project = Join-Path $Root "src\SimpleAccount.PrintAgent\SimpleAccount.PrintAgent.csproj"
$Out = Join-Path $Root "publish\win-x64"
$ZipName = "simple-account-print-agent.zip"
$DestDir = Join-Path $Root "..\..\frontend\public\downloads"
$Dest = Join-Path $DestDir $ZipName

Write-Host "Publishing Print Agent (win-x64, self-contained)..."

dotnet publish $Project `
  -c Release `
  -r win-x64 `
  --self-contained true `
  -p:PublishSingleFile=false `
  -o $Out

if (-not (Test-Path $Out)) {
  throw "Publish output folder was not created: $Out"
}

New-Item -ItemType Directory -Force -Path $DestDir | Out-Null
if (Test-Path $Dest) {
  Remove-Item $Dest -Force
}

Compress-Archive -Path (Join-Path $Out "*") -DestinationPath $Dest -Force

Write-Host "Created $Dest"
Write-Host "Deploy with the frontend so cashiers can download from POS -> Printers."
