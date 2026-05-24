import re

file_path = "/home/whitespider/Desktop/work_project/simple-account/frontend/features/phase-3-sales-receivables/sales-receivables-page.tsx"

with open(file_path, "r") as f:
    content = f.read()

# Replace empty catch block in saveQuotationDraft
content = re.sub(
    r'(saveQuotationDraft[\s\S]*?)catch\s*\{\s*return null;\s*\}',
    r'\1catch (error: any) {\n      setQuotationEditorClientError(error.message || "An error occurred");\n      return null;\n    }',
    content
)

# Replace empty catch block in approveQuotationFromEditor
content = re.sub(
    r'(approveQuotationFromEditor[\s\S]*?)catch\s*\{\s*// Keep modal open and let mutation error surface in the existing error UI\.\s*\}',
    r'\1catch (error: any) {\n      setQuotationEditorClientError(error.message || "An error occurred");\n    }',
    content
)

# Replace empty catch block in saveInvoiceFromEditor
content = re.sub(
    r'(saveInvoiceFromEditor[\s\S]*?)catch\s*\{\s*// Keep the editor open so the user can fix line revenue accounts or other validation issues\.\s*\}',
    r'\1catch (error: any) {\n      setInvoiceEditorClientError(error.message || "An error occurred");\n    }',
    content
)

# Replace empty catch block in saveAndPostInvoiceFromEditor
content = re.sub(
    r'(saveAndPostInvoiceFromEditor[\s\S]*?)catch\s*\{\s*// Keep editor open\s*\}',
    r'\1catch (error: any) {\n      setInvoiceEditorClientError(error.message || "An error occurred");\n    }',
    content
)

# Replace empty catch block in saveAndCreateReceiptFromInvoiceEditor
content = re.sub(
    r'(saveAndCreateReceiptFromInvoiceEditor[\s\S]*?)catch\s*\{\s*// Error handling is managed by react-query internally, keep modal open\s*\}',
    r'\1catch (error: any) {\n      setInvoiceEditorClientError(error.message || "An error occurred");\n    }',
    content
)

with open(file_path, "w") as f:
    f.write(content)

print("Catch blocks fixed.")
