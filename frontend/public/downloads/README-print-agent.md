# Print Agent download

Cashiers download **Simple Account Print Agent** from POS → Printers (`/downloads/simple-account-print-agent.zip`).

## Build the zip (Windows)

On a Windows PC with [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0):

```powershell
cd tools\print-agent
.\build-release.ps1
```

Or run `build-release.cmd` from File Explorer.

This publishes a self-contained `win-x64` folder and writes `frontend/public/downloads/simple-account-print-agent.zip`.

## Production deploy

Include the zip in the frontend static assets when deploying (same as other files under `frontend/public/`). After deploy, verify:

`https://<your-domain>/downloads/simple-account-print-agent.zip`

See `tools/print-agent/README.md` for agent install steps and WebView2 requirements.

**Note:** `build-release.sh` exists only for optional CI/Linux automation; the Windows `.ps1` / `.cmd` scripts are what you should use to produce the cashier zip.
