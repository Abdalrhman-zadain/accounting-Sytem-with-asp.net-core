# POS Printer Setup

The POS supports separate thermal print outputs for restaurant operations:

- kitchen KOT: printed from the kitchen ticket template when an order is sent to the kitchen, updated, cancelled, or auto-sent on payment
- customer receipt: printed from the sales receipt template when payment completes or a receipt is reprinted
- session roll reports: printed through the receipt-printer route

Silent printer routing in a browser requires a local print bridge. **Simple Account Print Agent** (recommended) listens on `127.0.0.1:9188`, accepts HTML print jobs from the POS, and prints to the configured kitchen/receipt printers without dialogs. QZ Tray and browser print remain available as fallbacks.

## Simple Account Print Agent (recommended)

Use this on Windows cashier PCs instead of QZ Tray when possible.

### Cashier PC setup

1. Install both XPrinter 80mm printers on the cashier computer.
2. Give each OS printer a clear local name, for example:
   - `XPrinter-Cashier`
   - `XPrinter-Kitchen`
3. Open **POS → Printers** (`/pos/printers`) and click **Download Print Agent**.
4. Extract the zip and run `SimpleAccount.PrintAgent.exe` (tray icon appears in the taskbar).
5. Right-click the tray icon → **Open settings** → pick kitchen and receipt printers → **Save**.
6. In POS → Printers, set **Print bridge** to **Local agent (recommended)**, refresh printers, select the same printer names, and run both test prints.
7. Save the printer settings.

The agent binds to `127.0.0.1:9188` only (localhost). It accepts HTML from the production site and from `http://localhost:3000` during development.

### Build and host the installer zip

On a Windows machine with .NET 8 SDK:

```powershell
cd tools\print-agent
.\build-release.ps1
```

This writes `frontend/public/downloads/simple-account-print-agent.zip`. Deploy that file with the frontend so cashiers can download it from POS → Printers.

See `tools/print-agent/README.md` for WebView2 requirements (preinstalled on Windows 11; Evergreen bootstrapper for Windows 10).

### When the agent is not running

If the agent is stopped, POS shows **Print Agent is not running** and falls back to QZ Tray (if configured) or browser print.

## QZ Tray (fallback)

QZ Tray remains supported when **Print bridge** is set to **QZ Tray** in POS → Printers.

### Cashier PC setup (QZ mode)

1. Install and start QZ Tray on the cashier computer.
2. Open **POS → Printers**, set **Print bridge** to **QZ Tray**, refresh printers, select kitchen and receipt names, and test print.
3. Save the printer settings.

Printer names are saved in browser `localStorage`, not in the global database, because every cashier machine can expose the same physical model under a different OS printer name.

## QZ Tray Trusted Signing (Silent Printing)

The POS can sign QZ Tray connection requests from the backend so cashier PCs stop seeing the **Untrusted website** popup. This uses a free self-signed certificate; you do **not** need a paid QZ Industries license.

### Server setup (once per deployment)

1. On the backend host, generate a certificate pair:

   ```bash
   cd backend
   npm run qz:generate-cert
   ```

2. Add the paths to `backend/.env`:

   ```env
   QZ_CERT_PATH=./certs/qz/digital-certificate.txt
   QZ_PRIVATE_KEY_PATH=./certs/qz/private-key.pem
   ```

3. Restart the backend API.

4. Verify signing before deploy:

   ```bash
   cd backend
   npm run qz:test
   ```

   You should see `Login OK`, `Certificate endpoint OK`, and `Sign endpoint OK`. Use `--base-url` if the API is not on `localhost:3007`.

The private key stays on the server only. The frontend loads the public certificate from `GET /api/qz/certificate` and asks the backend to sign each QZ request via `POST /api/qz/sign` while the cashier is logged in.

### Cashier PC setup (once per machine, QZ mode)

After generating the certificate on the server, trust it locally in QZ Tray on **each** cashier PC:

**Option A — command line (Windows):**

```text
cd "C:\Program Files\QZ Tray"
java -jar qz-tray.jar --allow "C:\path\to\digital-certificate.txt"
```

Copy `backend/certs/qz/digital-certificate.txt` to the cashier PC (USB, network share, etc.). Do **not** copy `private-key.pem`.

**Option B — QZ Site Manager:**

1. Right-click the QZ Tray tray icon → **Advanced** → **Site Manager**.
2. Import / allow the same `digital-certificate.txt` file.

Then restart QZ Tray and open the POS using **one fixed URL** on every PC (same IP or hostname every time).

### When signing is not configured

If `QZ_CERT_PATH` / `QZ_PRIVATE_KEY_PATH` are missing, or `QZ_SIGNING_ENABLED=false`, printing still works the old way: QZ Tray may show the Allow/Block dialog, or the POS falls back to browser print when QZ is unavailable.

QZ Tray is optional when the Print Agent is installed and selected.

## Browser print only

If neither the Print Agent nor QZ Tray is available:

1. Open **POS → Printers**.
2. Set **Print bridge** to **Browser only**.
3. Save settings.
4. Before **Send to kitchen**, set the **kitchen printer** as the Windows default printer.
5. Before **Payment / receipt**, set the **receipt printer** as the Windows default printer.

Windows will show the normal print dialog; the cashier picks the printer (or uses whichever is default). No agent, QZ Tray, Java, or certificate is required.

## Print bridge fallback chain

| Print bridge setting | Try order on failure |
|----------------------|----------------------|
| Local agent | Agent → QZ Tray → browser |
| QZ Tray | QZ Tray → browser |
| Browser only | Browser only |

## Runtime Behavior

### Print rules (dine-in, takeaway, delivery)

| Trigger | Kitchen printer | Cashier printer |
|---------|-----------------|-----------------|
| Send / confirm / update kitchen | Delta **ADD** ticket for new/changed qty | Nothing |
| Cashier removes/reduces sent line | **VOID** ticket | Nothing |
| Pay — kitchen already sent | Nothing | Arabic receipt |
| Pay — never sent to kitchen | KOT for unsent lines | Arabic receipt |

- `Send to kitchen`, waiter confirm, and kitchen update (including silent table sync) print delta KOT slips when `autoPrintKotOnSend` is enabled.
- Completing payment prints the customer receipt when `autoPrintReceiptOnPay` is enabled.
- If payment completes and some lines were never sent to the kitchen, the POS prints both the Arabic receipt and a kitchen ticket for those lines in the same moment.
- Only the **cashier** may remove or reduce items already sent to the kitchen; the kitchen receives a void/cancel slip. Waiters cannot cancel sent kitchen lines.
- Cashier cannot remove sent lines that are already `READY` or `SERVED` in the kitchen order.

### Templates and language

- Receipt/KOT layout code remains separate in `frontend/features/pos/pos-receipt-print.ts` and `frontend/features/pos/pos-kot-print.ts`.
- Delta/void kitchen slips are built in `frontend/features/pos/pos-kitchen-print-delta.ts` and routed through `frontend/features/pos/pos-print-service.ts`.
- Customer receipts print in **Arabic only** (RTL). Payment method labels use Arabic (`نقد`, `بطاقة`, etc.). Set `POS_RECEIPT_COMPANY_NAME` to the Arabic business name for a fully Arabic header.
- The customer receipt uses a compact 80mm layout (single-line items, joined meta rows, smaller fonts) similar to Market POS, with a small horizontal logo beside the company name when a logo is available.
- Item and total rows use a fixed-width HTML table (302px / ~80mm) so labels and amounts sit on one line without large empty gaps; item names allow up to 28 characters before truncation.
- Receipt HTML includes bottom padding and a trailing spacer so thermal auto-cutters do not clip the payment/thank-you lines; QZ Tray jobs also append blank feed lines after the HTML payload.
- Browser and QZ print paths wait for receipt images to finish loading before sending the job, reducing clipped or mis-sized prints.
- The default customer receipt logo is served from `frontend/public/pos/mr-karshanji-logo.png` and can be overridden per receipt via `logoUrl` when needed.
- If the selected print bridge is unavailable, the POS falls back to the next bridge in the chain and leaves the sale/order action successful.

## Operational Notes

- Print Agent or QZ Tray must be running on each cashier computer that needs silent named-printer routing.
- If the POS cannot list printers, verify the agent tray icon is green or QZ Tray is running.
- If browser storage is cleared, the cashier computer must reselect its kitchen and receipt printers.
- Rebuild and redeploy `frontend/public/downloads/simple-account-print-agent.zip` when the agent version changes.
