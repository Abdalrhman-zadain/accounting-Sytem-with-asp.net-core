# POS Printer Setup

The POS supports separate thermal print outputs for restaurant operations:

- kitchen KOT: printed from the kitchen ticket template when an order is sent to the kitchen, updated, cancelled, or auto-sent on payment
- customer receipt: printed from the sales receipt template when payment completes or a receipt is reprinted
- session roll reports: printed through the receipt-printer route

Production Restaurant POS printing uses **Simple Account Print Agent** as the primary path. The agent listens on `127.0.0.1:9188`, accepts HTML print jobs from the POS, and prints to the configured kitchen/receipt printers without browser dialogs.

Browser print is available only when the cashier explicitly switches **Print bridge** to **Browser print (manual emergency)**. Agent mode does not silently fall back to browser print.

## Simple Account Print Agent (production)

Use this on Windows cashier PCs instead of QZ Tray when possible.

### Cashier PC setup

1. Install both XPrinter 80mm printers on the cashier computer.
2. Give each OS printer a clear local name, for example:
   - `XPrinter-Cashier`
   - `XPrinter-Kitchen`
3. Open **POS → Printers** (`/pos/printers`) and click **Download Print Agent**.
4. Extract the zip and run `SimpleAccount.PrintAgent.exe` (tray icon appears in the taskbar).
5. Right-click the tray icon → **Open settings** → pick kitchen and receipt printers → **Save**.
6. In POS → Printers, set **Print bridge** to **Local agent (production)**, refresh printers, select the same printer names, and run both test prints.
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

### Dual XPrinter USB on one Windows 10 PC (XP-V320N + XP-Q851L)

Both models are 80mm ESC/POS thermal printers. Plug both into the **same cashier PC** via USB (use a powered hub if front-panel ports are weak).

1. Install the [Xprinter 58/80/76 universal driver](https://www.xprinter.net/Download_Details/3.html) once; Windows should list two separate printers.
2. Rename each printer in **Control Panel → Devices and Printers** to stable names, for example:
   - `XPrinter-V320N`
   - `XPrinter-Q851L`
3. Install [WebView2 Evergreen Runtime](https://developer.microsoft.com/microsoft-edge/webview2/) on Windows 10 (required for silent HTML printing).
4. Print a Windows test page from each printer before installing the Print Agent.
5. Extract and run `SimpleAccount.PrintAgent.exe`; tray → **Open settings** → assign kitchen and receipt roles (either model can be either role) → enable **Start with Windows** → Save.
6. Run the pre-deploy smoke test from the repo root:

   ```powershell
   node tools\print-agent\smoke-test-agent-api.mjs http://127.0.0.1:9188 "XPrinter-V320N" "XPrinter-Q851L"
   ```

   Replace names with your exact Windows printer names. Both printers must receive an 80mm test slip.

7. In POS → Printers: **Local agent (production)** → Refresh → select the same names → **Test kitchen** and **Test receipt** → Save.
8. Enable **Print waiter kitchen tickets on this PC** and keep **Register** (`/pos/register`) open while waiters are taking orders. The cashier account only needs normal register access (`POS_VIEW_POS_SCREEN`); it does not need the kitchen display role.

**Pre-deploy pass criteria:** tray test kitchen/receipt go to different devices; POS test prints match; a real **Send to kitchen** prints KOT only on the kitchen printer; **Complete payment** prints the Arabic receipt only on the receipt printer; a waiter confirm from a phone/tablet prints on the cashier PC kitchen printer within a few seconds while the register tab stays open.

### Required pre-deploy hardware test

Before deploying a cashier PC, run the hardware verifier from the repository root on that Windows machine:

```powershell
.\tools\print-agent\verify-windows-hardware.ps1 -KitchenPrinter "XPrinter-Kitchen" -ReceiptPrinter "XPrinter-Cashier"
```

Replace the names with the exact Windows printer names on that cashier PC. Deployment is not ready until the test prints two physical slips from two different devices.

### When the agent is not running

If the agent is stopped, POS shows a clear Print Agent / printer error and the print job fails. No browser dialog opens unless the cashier has deliberately selected **Browser print (manual emergency)**.

## QZ Tray (legacy / optional)

QZ Tray code remains available for legacy cashier PCs that were already configured for it, but it is not part of the normal production cashier/kitchen flow. New deployments should use the Simple Account Print Agent.

### Cashier PC setup (QZ mode)

1. Install and start QZ Tray on the cashier computer.
2. Open **POS → Printers**, set **Print bridge** to **QZ Tray** only on legacy browsers that already have that mode selected, refresh printers, select kitchen and receipt names, and test print.
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

If `QZ_CERT_PATH` / `QZ_PRIVATE_KEY_PATH` are missing, or `QZ_SIGNING_ENABLED=false`, QZ Tray may show the Allow/Block dialog. QZ mode does not silently fall back to browser print.

QZ Tray is optional when the Print Agent is installed and selected.

## Browser print manual mode

Use this only as an explicit emergency/manual mode:

1. Open **POS → Printers**.
2. Set **Print bridge** to **Browser print (manual emergency)**.
3. Save settings.
4. Before **Send to kitchen**, set the **kitchen printer** as the Windows default printer.
5. Before **Payment / receipt**, set the **receipt printer** as the Windows default printer.

Windows will show the normal print dialog; the cashier picks the printer (or uses whichever is default). No agent, QZ Tray, Java, or certificate is required.

## Print bridge behavior

| Print bridge setting | Behavior on failure |
|----------------------|---------------------|
| Local agent | Show a clear POS error. No browser fallback. |
| Browser print (manual emergency) | Open browser print dialog. |
| QZ Tray (legacy) | Show a clear POS error. No browser fallback. |

## Runtime Behavior

### Print rules (dine-in, takeaway, delivery)

| Trigger | Kitchen printer | Cashier printer |
|---------|-----------------|-----------------|
| Send / confirm / update kitchen | Delta **ADD** ticket for new/changed qty | Nothing |
| Cashier removes/reduces sent line | **VOID** ticket | Nothing |
| Pay — kitchen already sent | Nothing | Arabic receipt |
| Pay — never sent to kitchen | KOT for unsent lines | Arabic receipt |

- `Send to kitchen`, cashier kitchen update (including silent table sync), and payment catch-up KOT print delta slips on the **cashier PC** when `autoPrintKotOnSend` is enabled.
- **Waiter confirm** does not print on the waiter device. When **Print waiter kitchen tickets on this PC** is enabled, the open cashier register polls kitchen orders every 3 seconds and prints new waiter KOT items through the local Print Agent on the cashier PC.
- Completing payment prints the customer receipt when `autoPrintReceiptOnPay` is enabled.
- If payment completes and some lines were never sent to the kitchen, the POS sends separate print jobs: a KOT to the kitchen printer and the Arabic receipt to the cashier printer.
- Only the **cashier** may remove or reduce items already sent to the kitchen; the kitchen receives a void/cancel slip. Waiters cannot cancel sent kitchen lines.
- Cashier cannot remove sent lines that are already `READY` or `SERVED` in the kitchen order.

### Templates and language

- Receipt/KOT layout code remains separate in `frontend/features/pos/pos-receipt-print.ts` and `frontend/features/pos/pos-kot-print.ts`.
- Delta/void kitchen slips are built in `frontend/features/pos/pos-kitchen-print-delta.ts` and routed through `frontend/features/pos/pos-print-service.ts`. Cashier VOID/ADD slips diff the API response against the **last synced server snapshot** (set on table resume and after each successful kitchen update), not the live cart at button press — so remove/qty-reduce edits produce VOID slips correctly.
- Waiter-send kitchen printing is handled by `frontend/features/pos/pos-kitchen-print-hub.ts` on the cashier register; only one register tab per browser profile acts as the print leader when multiple tabs are open.
- The hub is mounted in `frontend/app/(erp)/pos/layout.tsx` via `PosKitchenPrintHubProvider`, so it keeps polling while the cashier navigates between `/pos/register`, `/pos/tables`, delivery, settings, and other cashier POS routes (not `/pos/waiter/*`).
- Resuming an already-sent table order marks that invoice and its kitchen lines as printed in the hub, so opening the table for payment does not reprint KOT.
- The kitchen print hub tracks both `KitchenOrderItem.id` and `salesInvoiceLineId`, and ignores orders whose linked POS sale is already `COMPLETED` or `REFUNDED`, so paying a dine-in order that was already sent to the kitchen does not print a second KOT.
- Backend kitchen sync (`rebuildKitchenOrderFromInvoice`) updates existing kitchen rows in place instead of deleting and recreating them, preserving item ids and kitchen status across payment.
- Customer receipts print in **Arabic only** (RTL). Payment method labels use Arabic (`نقد`, `بطاقة`, etc.). Set `POS_RECEIPT_COMPANY_NAME` to the Arabic business name for a fully Arabic header.
- The customer receipt uses a **restaurant-style 80mm** layout (Kashouka-inspired): centered **64px** logo, company name, branch/tax number when configured, date/time split, invoice number, table + staff for dine-in, order type, then a **4-column item table** (الصنف / السعر / الكمية / الإجمالي).
- Totals show **المجموع الفرعي**, optional discount/service/delivery lines, **الضريبة N%** when tax applies, and a bold **الصافي** row. Payments print inside a bordered box (نقد, بطاقة, مدفوع, الباقي).
- Receipt payload includes `tableNumber`, `orderType`, `waiterName`, `serviceChargeAmount`, `deliveryFeeAmount`, and computed `taxRatePercent` from the completed sale API.
- Receipt HTML includes bottom padding and a trailing spacer so thermal auto-cutters do not clip the payment/thank-you lines; QZ Tray jobs also append blank feed lines after the HTML payload.
- Browser and QZ print paths wait for receipt images to finish loading before sending the job, reducing clipped or mis-sized prints.
- The default customer receipt logo is served from `frontend/public/pos/mr-karshanji-logo.png` and can be overridden per receipt via `logoUrl` when needed.
- If the selected print bridge is unavailable, the POS shows the print error. Browser print opens only when Browser print manual mode is selected.

## Horizontal clipping (left/right characters cut off)

Many XPrinter 80mm drivers report paper as **80 (72.1) × 297 mm** — only **~72mm** is printable even though the roll is 80mm wide. POS receipt, KOT, and session-roll templates target that safe area in `frontend/features/pos-shared/thermal-receipt-layout.ts`.

### Cashier PC driver checks (do first)

1. Open **Control Panel → Devices and Printers** → right-click the receipt printer → **Printing preferences**.
2. Confirm paper is **80mm roll** (not A4/Letter).
3. Set **left/right margins** to **0** or the minimum allowed.
4. If the driver offers **scale** / **fit to page**, try **shrink to fit** at **90–95%** only when clipping persists after a POS deploy with the 72mm layout.
5. Center the paper roll in the printer guide; use the XPrinter utility **print offset** if one side clips more than the other.
6. Run **POS → Printers → Test receipt** after each change.

### Software layout (already applied)

- Content width: **72mm** printable area with **3mm** inner side padding.
- `@page` side margins: **4mm** on an **80mm** roll.
- Item table: four columns (name, unit price, quantity, line total); names truncate at **28** characters.
- Dine-in receipts show **طاولة** and **الموظف** (waiter name when set, otherwise cashier).
- Totals table ends with bold **الصافي**; payment box always lists **نقد** and **بطاقة** (0.00 when unused) plus **مدفوع** and **الباقي** when applicable.
- Body font **12px**; title **17px**; net total **15px** bold.
- Separator lines: **32** characters.

After deploying the **frontend**, hard-refresh the POS in the browser (Ctrl+Shift+R) before re-testing.

## Operational Notes

- Print Agent must be running on each cashier computer that needs production silent named-printer routing.
- Keep the cashier **Register** open on the PC connected to the kitchen printer when waiters are sending orders remotely.
- If the POS cannot list printers in Local agent mode, verify the agent tray icon is green.
- If browser storage is cleared, the cashier computer must reselect its kitchen and receipt printers.
- Rebuild and redeploy `frontend/public/downloads/simple-account-print-agent.zip` when the agent version changes.
