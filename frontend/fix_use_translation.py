from pathlib import Path

filepath = Path('/home/whitespider/Desktop/work_project/simple-account/frontend/features/pos/pos-page.tsx')
content = filepath.read_text(encoding='utf-8')

# We want to replace "const { t } = useTranslation();" 
# with "const { t, language } = useTranslation();"
content = content.replace('const { t } = useTranslation();', 'const { t, language } = useTranslation();')

filepath.write_text(content, encoding='utf-8')
print("Fixed useTranslation calls in pos-page.tsx")
