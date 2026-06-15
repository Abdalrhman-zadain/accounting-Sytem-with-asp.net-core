# Pre-deploy verification for dual XPrinter USB setup on Windows 10/11.
# Run from PowerShell on the cashier PC (both XP-V320N and XP-Q851L connected):
#
#   cd tools\print-agent
#   .\verify-windows-hardware.ps1
#
# Optional explicit printer names:
#   .\verify-windows-hardware.ps1 -KitchenPrinter "XPrinter-V320N" -ReceiptPrinter "XPrinter-Q851L"

param(
    [string]$KitchenPrinter = "",
    [string]$ReceiptPrinter = "",
    [string]$AgentBase = "http://127.0.0.1:9188"
)

$ErrorActionPreference = "Stop"

function Write-Step($message) {
    Write-Host "`n==> $message" -ForegroundColor Cyan
}

function Fail($message) {
    Write-Host "FAIL: $message" -ForegroundColor Red
    exit 1
}

Write-Step "Checking Print Agent is running at $AgentBase"
try {
    $health = Invoke-RestMethod -Uri "$AgentBase/health" -Method Get
    if (-not $health.ok) { Fail "GET /health returned ok=false" }
    Write-Host "OK  Agent version: $($health.version)"
} catch {
    Fail "Print Agent is not running. Start SimpleAccount.PrintAgent.exe and retry."
}

Write-Step "Listing installed printers via agent"
$printers = (Invoke-RestMethod -Uri "$AgentBase/printers" -Method Get).printers
if ($printers.Count -lt 2) {
    Fail "Expected at least 2 printers; found $($printers.Count). Install XPrinter drivers for both USB devices."
}
Write-Host "OK  $($printers.Count) printer(s): $($printers -join ', ')"

$config = Invoke-RestMethod -Uri "$AgentBase/config" -Method Get
$kitchen = if ($KitchenPrinter) { $KitchenPrinter } else { $config.kitchenPrinterName }
$receipt = if ($ReceiptPrinter) { $ReceiptPrinter } else { $config.receiptPrinterName }

if (-not $kitchen -or -not $receipt) {
    Fail "Kitchen and receipt printers are not configured. Open agent tray -> Settings, assign both, Save, then retry."
}

if ($kitchen -eq $receipt) {
    Fail "Kitchen and receipt must be different printers (both set to '$kitchen')."
}

foreach ($name in @($kitchen, $receipt)) {
    if ($printers -notcontains $name) {
        Fail "Printer '$name' is not installed. Available: $($printers -join ', ')"
    }
}

Write-Step "Running Node smoke test (dual 80mm print jobs)"
$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$smokeScript = Join-Path $repoRoot "tools\print-agent\smoke-test-agent-api.mjs"
if (-not (Test-Path $smokeScript)) {
    Fail "Smoke test script not found at $smokeScript"
}

node $smokeScript $AgentBase $kitchen $receipt
if ($LASTEXITCODE -ne 0) {
    Fail "Smoke test failed (exit $LASTEXITCODE)"
}

Write-Step "Manual checks (complete before production rollout)"
Write-Host @"
1. Tray -> Test kitchen print  -> paper from: $kitchen
2. Tray -> Test receipt print  -> paper from: $receipt
3. POS -> Printers -> Local agent -> Refresh -> Test kitchen + Test receipt
4. POS test order: Send to kitchen (KOT only) then Pay (receipt only)
5. Enable 'Start with Windows' in agent settings and reboot once to confirm auto-start
"@

Write-Host "`nAll automated checks passed." -ForegroundColor Green
