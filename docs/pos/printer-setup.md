# POS Printer Setup

The POS supports separate thermal print outputs for restaurant operations:

- kitchen KOT: printed from the kitchen ticket template when an order is sent to the kitchen
- customer receipt: printed from the sales receipt template when payment completes or a receipt is reprinted
- session roll reports: printed through the receipt-printer route

Silent printer routing in a browser requires a local print bridge. The current client integration targets QZ Tray and falls back to the browser print window if the bridge is not available.

## Cashier PC Setup

1. Install both XPrinter 80mm printers on the cashier computer.
2. Give each OS printer a clear local name, for example:
   - `XPrinter-Cashier`
   - `XPrinter-Kitchen`
3. Install and start QZ Tray on the cashier computer.
4. Open **POS → Printers** (`/pos/printers`), or POS Settings for accountant users, then use the Printer setup panel.
5. Refresh printers, select the local kitchen and receipt printer names, then run both test prints.
6. Save the printer settings.
7. Enable **Print waiter kitchen tickets on this PC** and keep **Register** (`/pos/register`) open while waiters are taking orders from other devices.

Important:

- Do not assign the same OS printer name to both Kitchen printer and Receipt printer. Keep them as separate local printer targets so kitchen KOT and customer receipt do not get mixed up on the same device.

Printer names are saved in browser `localStorage`, not in the global database, because every cashier machine can expose the same physical model under a different OS printer name.

## Runtime Behavior

- Cashier **Send to kitchen** prints the KOT template on the cashier PC when `autoPrintKotOnSend` is enabled.
- Waiter confirm does **not** print on the waiter device. When **Print waiter kitchen tickets on this PC** is enabled, the open cashier register polls `GET /pos/kitchen/orders` every 3 seconds and prints new kitchen items through the local QZ/browser print bridge on the cashier PC.
- Completing payment prints the customer receipt template to the configured receipt printer when `autoPrintReceiptOnPay` is enabled.
- For `TAKEAWAY / سفري` orders, if `autoPrintKotOnSend` is enabled and the order was not already sent to the kitchen earlier, payment completion also prints one kitchen KOT so takeaway completion produces both the customer receipt and the kitchen ticket.
- Kitchen tickets are not reprinted during payment completion for dine-in orders that were already sent from the explicit `Send to kitchen` step.
- Receipt/KOT layout code remains separate in `frontend/features/pos/pos-receipt-print.ts` and `frontend/features/pos/pos-kot-print.ts`.
- Waiter-send kitchen printing is handled by `frontend/features/pos/pos-kitchen-print-hub.ts` on the cashier register.
- The default customer receipt logo is served from `frontend/public/pos/mr-karshanji-logo.png` and can be overridden per receipt via `logoUrl` when needed.
- If QZ Tray is not connected, the POS opens the browser print window as a fallback and leaves the sale/order action successful.

## Operational Notes

- QZ Tray must be running on each cashier computer that needs silent named-printer routing.
- Keep the cashier **Register** open on the PC connected to the kitchen printer when waiters are sending orders remotely.
- If the POS cannot list printers, verify that QZ Tray is running and that the browser can load the QZ client script.
- If browser storage is cleared, the cashier computer must reselect its kitchen and receipt printers.
- For offline deployments, host the QZ client JavaScript locally instead of relying on the CDN fallback in the browser bridge.
