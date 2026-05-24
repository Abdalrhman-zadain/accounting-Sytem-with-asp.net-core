import os
import re

files = [
    "backend/prisma/seed.ts",
    "backend/src/modules/phase-3-sales-receivables/sales-receivables.service.ts",
    "docs/change-guide.md",
    "frontend/features/phase-3-sales-receivables/components/credit-note-editor-modal.tsx",
    "frontend/features/phase-3-sales-receivables/sales-receivables-page.tsx"
]

for f in files:
    if not os.path.exists(f): continue
    with open(f, 'r') as file:
        content = file.read()
    
    conflicts = re.findall(r'<<<<<<< Updated upstream\n(.*?)\n=======\n(.*?)\n>>>>>>> Stashed changes', content, re.DOTALL)
    print(f"=== {f} ===")
    for i, (ours, theirs) in enumerate(conflicts):
        print(f"Conflict {i+1}:")
        print(f"OURS (Upstream):\n{ours.strip()[:200]}...")
        print(f"THEIRS (Stash):\n{theirs.strip()[:200]}...")
        print("-" * 40)
