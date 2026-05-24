import re

file_path = "frontend/features/phase-3-sales-receivables/sales-receivables-page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Quotations
quotations_pattern = re.compile(
    r'<div className="grid gap-6 xl:grid-cols-\[1\.2fr_0\.8fr\]">\s*<Card className="overflow-hidden p-0">(.*?)</Card>\s*<Card className="space-y-5">\s*<div>\s*<div className="text-lg font-bold text-gray-900">{selectedQuotation\?\.reference \?\? t\("salesReceivables\.section\.quotationDetails"\)}</div>\s*<div className="text-sm text-gray-500">{selectedQuotation \? `\${selectedQuotation\.customer\.code} · \${selectedQuotation\.customer\.name}` : t\("salesReceivables\.section\.quotationDetailsEmpty"\)}</div>\s*</div>\s*\{selectedQuotation \? \(\s*<>\s*(.*?)\s*</>\s*\) : <div className="text-sm text-gray-500">{t\("salesReceivables\.section\.quotationDetailsEmpty"\)}</div>\}\s*</Card>\s*</div>',
    re.DOTALL
)
def quotations_repl(m):
    list_content = m.group(1)
    details_content = m.group(2)
    return (
        '<div className="grid gap-6 grid-cols-1">\n'
        '            <Card className="overflow-hidden p-0">' + list_content + '</Card>\n'
        '          </div>\n\n'
        '          <Modal\n'
        '            isOpen={!!selectedQuotation}\n'
        '            onClose={() => setSelectedQuotationId(null)}\n'
        '            title={selectedQuotation?.reference ?? t("salesReceivables.section.quotationDetails")}\n'
        '            size="3xl"\n'
        '          >\n'
        '            {selectedQuotation ? (\n'
        '              <div className="space-y-5">\n'
        '                <div className="text-sm text-gray-500">{selectedQuotation.customer.code} · {selectedQuotation.customer.name}</div>\n'
        '                ' + details_content + '\n'
        '              </div>\n'
        '            ) : null}\n'
        '          </Modal>'
    )
content = quotations_pattern.sub(quotations_repl, content)

# 2. Orders
orders_pattern = re.compile(
    r'<div className="grid gap-6 xl:grid-cols-\[1\.2fr_0\.8fr\]">\s*<Card className="overflow-hidden p-0">(.*?)</Card>\s*<Card className="space-y-5">\s*<div>\s*<div className="text-lg font-bold text-gray-900">{selectedOrder\?\.reference \?\? t\("salesReceivables\.section\.orderDetails"\)}</div>\s*<div className="text-sm text-gray-500">{selectedOrder \? `\${selectedOrder\.customer\.code} · \${selectedOrder\.customer\.name}` : t\("salesReceivables\.section\.orderDetailsEmpty"\)}</div>\s*</div>\s*\{selectedOrder \? \(\s*<>\s*(.*?)\s*</>\s*\) : <div className="text-sm text-gray-500">{t\("salesReceivables\.section\.orderDetailsEmpty"\)}</div>\}\s*</Card>\s*</div>',
    re.DOTALL
)
def orders_repl(m):
    list_content = m.group(1)
    details_content = m.group(2)
    return (
        '<div className="grid gap-6 grid-cols-1">\n'
        '            <Card className="overflow-hidden p-0">' + list_content + '</Card>\n'
        '          </div>\n\n'
        '          <Modal\n'
        '            isOpen={!!selectedOrder}\n'
        '            onClose={() => setSelectedOrderId(null)}\n'
        '            title={selectedOrder?.reference ?? t("salesReceivables.section.orderDetails")}\n'
        '            size="3xl"\n'
        '          >\n'
        '            {selectedOrder ? (\n'
        '              <div className="space-y-5">\n'
        '                <div className="text-sm text-gray-500">{selectedOrder.customer.code} · {selectedOrder.customer.name}</div>\n'
        '                ' + details_content + '\n'
        '              </div>\n'
        '            ) : null}\n'
        '          </Modal>'
    )
content = orders_pattern.sub(orders_repl, content)

# 3. Invoices
invoices_pattern = re.compile(
    r'<div className="grid gap-6 xl:grid-cols-\[1\.2fr_0\.8fr\]">\s*<Card className="overflow-hidden p-0">(.*?)</Card>\s*<Card className="space-y-5">\s*<div>\s*<div className="text-lg font-bold text-gray-900">{selectedInvoice\?\.reference \?\? t\("salesReceivables\.section\.invoiceDetails"\)}</div>\s*<div className="text-sm text-gray-500">{selectedInvoice \? `\${selectedInvoice\.customer\.code} · \${selectedInvoice\.customer\.name}` : t\("salesReceivables\.section\.invoiceDetailsEmpty"\)}</div>\s*</div>\s*\{selectedInvoice \? \(\s*<>\s*(.*?)\s*</>\s*\) : \(\s*<div className="text-sm text-gray-500">{t\("salesReceivables\.section\.invoiceDetailsEmpty"\)}</div>\s*\)\}\s*</Card>\s*</div>',
    re.DOTALL
)
def invoices_repl(m):
    list_content = m.group(1)
    details_content = m.group(2)
    return (
        '<div className="grid gap-6 grid-cols-1">\n'
        '            <Card className="overflow-hidden p-0">' + list_content + '</Card>\n'
        '          </div>\n\n'
        '          <Modal\n'
        '            isOpen={!!selectedInvoice}\n'
        '            onClose={() => setSelectedInvoiceId(null)}\n'
        '            title={selectedInvoice?.reference ?? t("salesReceivables.section.invoiceDetails")}\n'
        '            size="3xl"\n'
        '          >\n'
        '            {selectedInvoice ? (\n'
        '              <div className="space-y-5">\n'
        '                <div className="text-sm text-gray-500">{selectedInvoice.customer.code} · {selectedInvoice.customer.name}</div>\n'
        '                ' + details_content + '\n'
        '              </div>\n'
        '            ) : null}\n'
        '          </Modal>'
    )
content = invoices_pattern.sub(invoices_repl, content)

# 4. Receipts - different customer formatting!
receipts_pattern = re.compile(
    r'<div className="grid gap-6 xl:grid-cols-\[1\.2fr_0\.8fr\]">\s*<Card className="overflow-hidden p-0">(.*?)</Card>\s*<Card className="space-y-5">\s*<div>\s*<div className="text-lg font-bold text-gray-900">{selectedReceipt\?\.reference \?\? t\("salesReceivables\.section\.receiptDetails"\)}</div>\s*<div className="text-sm text-gray-500">{selectedReceipt\?\.customer \? `\${selectedReceipt\.customer\.code} · \${selectedReceipt\.customer\.name}` : t\("salesReceivables\.section\.receiptDetailsEmpty"\)}</div>\s*</div>\s*\{selectedReceipt \? \(\s*<>\s*(.*?)\s*</>\s*\) : <div className="text-sm text-gray-500">{t\("salesReceivables\.section\.receiptDetailsEmpty"\)}</div>\}\s*</Card>\s*</div>',
    re.DOTALL
)
def receipts_repl(m):
    list_content = m.group(1)
    details_content = m.group(2)
    return (
        '<div className="grid gap-6 grid-cols-1">\n'
        '            <Card className="overflow-hidden p-0">' + list_content + '</Card>\n'
        '          </div>\n\n'
        '          <Modal\n'
        '            isOpen={!!selectedReceipt}\n'
        '            onClose={() => setSelectedReceiptId(null)}\n'
        '            title={selectedReceipt?.reference ?? t("salesReceivables.section.receiptDetails")}\n'
        '            size="3xl"\n'
        '          >\n'
        '            {selectedReceipt ? (\n'
        '              <div className="space-y-5">\n'
        '                <div className="text-sm text-gray-500">{selectedReceipt.customer ? `${selectedReceipt.customer.code} · ${selectedReceipt.customer.name}` : t("salesReceivables.empty.unlinked")}</div>\n'
        '                ' + details_content + '\n'
        '              </div>\n'
        '            ) : null}\n'
        '          </Modal>'
    )
content = receipts_pattern.sub(receipts_repl, content)

# 5. Credit Notes - different details ending!
credit_notes_pattern = re.compile(
    r'<div className="grid gap-6 xl:grid-cols-\[1\.2fr_0\.8fr\]">\s*<Card className="overflow-hidden p-0">(.*?)</Card>\s*<Card className="space-y-5">\s*<div>\s*<div className="text-lg font-bold text-gray-900">{selectedCreditNote\?\.reference \?\? t\("salesReceivables\.section\.creditNoteDetails"\)}</div>\s*<div className="text-sm text-gray-500">{selectedCreditNote \? `\${selectedCreditNote\.customer\.code} · \${selectedCreditNote\.customer\.name}` : t\("salesReceivables\.section\.creditNoteDetailsEmpty"\)}</div>\s*</div>\s*\{selectedCreditNote \? \(\s*<>\s*(.*?)\s*</>\s*\) : \(\s*<div className="text-sm text-gray-500">{t\("salesReceivables\.section\.creditNoteDetailsEmpty"\)}</div>\s*\)\}\s*</Card>\s*</div>',
    re.DOTALL
)
def credit_notes_repl(m):
    list_content = m.group(1)
    details_content = m.group(2)
    return (
        '<div className="grid gap-6 grid-cols-1">\n'
        '            <Card className="overflow-hidden p-0">' + list_content + '</Card>\n'
        '          </div>\n\n'
        '          <Modal\n'
        '            isOpen={!!selectedCreditNote}\n'
        '            onClose={() => setSelectedCreditNoteId(null)}\n'
        '            title={selectedCreditNote?.reference ?? t("salesReceivables.section.creditNoteDetails")}\n'
        '            size="3xl"\n'
        '          >\n'
        '            {selectedCreditNote ? (\n'
        '              <div className="space-y-5">\n'
        '                <div className="text-sm text-gray-500">{selectedCreditNote.customer.code} · {selectedCreditNote.customer.name}</div>\n'
        '                ' + details_content + '\n'
        '              </div>\n'
        '            ) : null}\n'
        '          </Modal>'
    )
content = credit_notes_pattern.sub(credit_notes_repl, content)

# Finally, import Modal
content = content.replace(
    'import { Button, Card, PageShell, SidePanel, StatusPill } from "@/components/ui";',
    'import { Button, Card, Modal, PageShell, SidePanel, StatusPill } from "@/components/ui";'
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Matched Quotations: {bool(quotations_pattern.search(content))}")
print(f"Matched Orders: {bool(orders_pattern.search(content))}")
print(f"Matched Invoices: {bool(invoices_pattern.search(content))}")
print(f"Matched Receipts: {bool(receipts_pattern.search(content))}")
print(f"Matched Credit Notes: {bool(credit_notes_pattern.search(content))}")

