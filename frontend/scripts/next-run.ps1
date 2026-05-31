param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("dev", "build", "start")]
  [string]$Mode
)

$ErrorActionPreference = "Stop"

$frontendRoot = Split-Path -Parent $PSScriptRoot
$devNextDir = Join-Path $frontendRoot ".next-dev"
$buildNextDir = Join-Path $frontendRoot ".next"

$nextCli = Join-Path $frontendRoot "node_modules\next\dist\bin\next"

function Reset-NextArtifacts([string]$targetDir) {
  if (-not (Test-Path -LiteralPath $targetDir)) {
    return
  }

  $item = Get-Item -LiteralPath $targetDir -Force
  if ($item.Attributes.ToString().Contains("ReparsePoint")) {
    Remove-Item -LiteralPath $targetDir -Recurse -Force
    return
  }

  Remove-Item -LiteralPath $targetDir -Recurse -Force
}

switch ($Mode) {
  "dev" {
    Reset-NextArtifacts $devNextDir
    $env:NEXT_DIST_DIR = ".next-dev"
    if (-not $env:WATCHPACK_POLLING) {
      $env:WATCHPACK_POLLING = "true"
    }
    if (-not $env:CHOKIDAR_USEPOLLING) {
      $env:CHOKIDAR_USEPOLLING = "true"
    }
    & node $nextCli dev --webpack
  }
  "build" {
    Reset-NextArtifacts $buildNextDir
    $env:NEXT_DIST_DIR = ".next"
    & node $nextCli build
  }
  "start" {
    $env:NEXT_DIST_DIR = ".next"
    & node $nextCli start
  }
}
