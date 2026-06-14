# Simple Account Print Agent

Windows tray application for **silent Restaurant POS printing** (kitchen KOT + customer receipt) without QZ Tray or Java.

## Requirements

- Windows 10/11 x64
- [.NET 8 Desktop Runtime](https://dotnet.microsoft.com/download/dotnet/8.0) (or use `--self-contained` publish)
- [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/) (preinstalled on Windows 11)

## Build (Windows)

From PowerShell (recommended):

```powershell
cd tools\print-agent
.\build-release.ps1
```

Or double-click `build-release.cmd`.

This publishes a self-contained `win-x64` build and writes `frontend/public/downloads/simple-account-print-agent.zip`.

Manual publish:

```powershell
cd tools\print-agent
dotnet publish src\SimpleAccount.PrintAgent\SimpleAccount.PrintAgent.csproj `
  -c Release -r win-x64 --self-contained true `
  -o publish\win-x64
```

Then zip the contents of `publish\win-x64\` as `frontend/public/downloads/simple-account-print-agent.zip`.

`build-release.sh` is an optional CI/Linux helper only; build on Windows for the cashier installer.

## Test before deploy

**Automated (any OS):**

```bash
cd frontend
npm run typecheck
npm run test -- features/pos-shared/local-print-agent.test.ts
npm run build
```

**API contract smoke test (mock or real agent on port 9188):**

```bash
# Terminal 1 — mock agent (Linux/macOS/Windows with Node 18+)
node tools/print-agent/mock-agent-server.mjs

# Terminal 2
node tools/print-agent/smoke-test-agent-api.mjs
```

**On a Windows cashier PC (required before rollout):**

1. Run `.\build-release.ps1` and extract the zip.
2. Start `SimpleAccount.PrintAgent.exe`.
3. Run `node tools\print-agent\smoke-test-agent-api.mjs`.
4. In POS → Printers: **Local agent** → Refresh → Test kitchen + Test receipt.

## Cashier setup

1. Download from **POS → Printers → Download Print Agent**
2. Extract and run `SimpleAccount.PrintAgent.exe`
3. Right-click tray icon → **Open settings** → pick kitchen + receipt printers → Save
4. In POS → Printers, choose **Local agent (recommended)** → Refresh → Save → Test print

## Local API

Listens on `http://127.0.0.1:9188` only.

| Method | Path | Body |
|--------|------|------|
| GET | `/health` | — |
| GET | `/printers` | — |
| GET | `/config` | — |
| PUT | `/config` | `{ kitchenPrinterName, receiptPrinterName }` |
| POST | `/print` | `{ printerName, html }` |

Config file: `%AppData%/SimpleAccount/PrintAgent/config.json`

Optional header: `Authorization: Bearer simple-account-print-agent`

## Troubleshooting

- **POS says agent not running:** start `SimpleAccount.PrintAgent.exe` and confirm tray icon is visible.
- **Browser says "Request blocked" / connection failed from HTTPS site:** Chrome blocks public HTTPS pages from calling `http://127.0.0.1` unless the agent returns `Access-Control-Allow-Private-Network: true` (v1.0.1+). Download the latest agent zip from POS → Printers, replace the old exe, restart the tray app, then refresh printers in POS.
- **WebView2 missing:** install WebView2 Evergreen bootstrapper from Microsoft.
- **Printer not found:** open agent settings and reselect exact Windows printer names.
