import re

file_path = "frontend/features/pos/pos-page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix switch directions
content = content.replace('checked ? "translate-x-5" : "translate-x-0"', 'checked ? "rtl:-translate-x-5 ltr:translate-x-5" : "translate-x-0"')

# Fix table headers alignments
content = content.replace('<tr className="text-left text-[#6d7b73]">', '<tr className="text-start text-[#6d7b73]">')
content = content.replace('<th className="px-6 py-4 font-bold w-32 text-right">', '<th className="px-6 py-4 font-bold w-32 text-end">')

# Fix table body alignments
content = content.replace('<td className="px-6 py-4 text-right">', '<td className="px-6 py-4 text-end">')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Alignment fixed")
