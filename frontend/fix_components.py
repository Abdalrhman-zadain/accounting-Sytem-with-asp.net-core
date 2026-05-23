from pathlib import Path
import re

filepath = Path('/home/whitespider/Desktop/work_project/simple-account/frontend/features/pos/pos-page.tsx')
content = filepath.read_text(encoding='utf-8')

def add_language(component_name):
    global content
    pattern = rf'(function {component_name}\([^)]*\)\s*{{)'
    replacement = r'\1\n  const { language } = useTranslation();'
    content = re.sub(pattern, replacement, content)

add_language('StartSessionView')
add_language('CompactCartLine')

filepath.write_text(content, encoding='utf-8')
print("Injected language into helper components.")
