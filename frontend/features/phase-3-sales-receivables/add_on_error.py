import re

file_path = "/home/whitespider/Desktop/work_project/simple-account/frontend/features/phase-3-sales-receivables/sales-receivables-page.tsx"

with open(file_path, "r") as f:
    content = f.read()

mutations_to_update = [
    ("createCustomerMutation", "setCustomerEditorClientError"),
    ("updateCustomerMutation", "setCustomerEditorClientError"),
    ("createSalesRepMutation", "setSalesRepEditorClientError"),
    ("updateSalesRepMutation", "setSalesRepEditorClientError"),
    ("createQuotationMutation", "setQuotationEditorClientError"),
    ("updateQuotationMutation", "setQuotationEditorClientError"),
    ("createInvoiceMutation", "setInvoiceEditorClientError"),
    ("updateInvoiceMutation", "setInvoiceEditorClientError"),
    ("createCreditNoteMutation", "setCreditNoteEditorClientError"),
    ("updateCreditNoteMutation", "setCreditNoteEditorClientError")
]

for mut, setter in mutations_to_update:
    # Find the mutation block
    pattern = r'(const ' + mut + r' = useMutation\(\{)'
    if setter in content and mut in content:
        # Check if onError is already there
        block_pattern = r'const ' + mut + r' = useMutation\(\{[\s\S]*?\}\);'
        block_match = re.search(block_pattern, content)
        if block_match and "onError:" not in block_match.group(0):
            replacement = r'\1\n    onError: (error: any) => ' + setter + r'(error.message || "An error occurred"),'
            content = re.sub(pattern, replacement, content)

with open(file_path, "w") as f:
    f.write(content)

print("onError added")
