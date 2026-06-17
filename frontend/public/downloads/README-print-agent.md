# Print Agent download

Cashiers download **Simple Account Print Agent** from POS → Printers (`/downloads/simple-account-print-agent.zip`).

## Build the zip (Windows)

The zip is **not in git** — you must build it first. `scp` will fail with "No such file" until then.

### Option A — Windows PC with .NET 8 SDK (fastest if you have one)

```powershell
cd tools\print-agent
.\build-release.ps1
```

Then upload (from repo root):

```powershell
scp frontend/public/downloads/simple-account-print-agent.zip server@100.89.174.122:/home/server/Desktop/production/simple-account/frontend/public/downloads/
```

If your shell is already in `frontend/`, use:

```bash
scp public/downloads/simple-account-print-agent.zip server@100.89.174.122:/home/server/Desktop/production/simple-account/frontend/public/downloads/
```

### Option B — GitHub Actions (no Windows PC needed)

1. Push changes under `tools/print-agent/` (or run **Actions → Build Print Agent → Run workflow** on GitHub).
2. Open the completed workflow run → **Artifacts** → download `simple-account-print-agent.zip`.
3. Upload to the server:

```bash
scp ~/Downloads/simple-account-print-agent.zip server@100.89.174.122:/home/server/Desktop/production/simple-account/frontend/public/downloads/
```

No PM2 restart needed — it is a static file. Verify:

`https://sabina.trusttechlimited.com/downloads/simple-account-print-agent.zip`

## Production deploy

Include the zip in the frontend static assets when deploying (same as other files under `frontend/public/`). After deploy, verify:

`https://<your-domain>/downloads/simple-account-print-agent.zip`

See `tools/print-agent/README.md` for agent install steps and WebView2 requirements.

**Current build:** v1.0.3 — rebuild with `tools\print-agent\build-release.ps1` (Windows) or `tools/print-agent/build-release.sh` (Linux with .NET 8 SDK) after agent code changes.

**Note:** `build-release.sh` exists for optional CI/Linux automation; the Windows `.ps1` / `.cmd` scripts are what you should use to produce the cashier zip.
