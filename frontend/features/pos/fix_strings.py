import re
from pathlib import Path

def process_file(filepath):
    path = Path(filepath)
    content = path.read_text(encoding='utf-8')
    
    # Simple regex to match string literals like "English / Arabic"
    # We want to match things like: "Close Shift / إغلاق الوردية"
    # but not inside already existing getLocalizedText.
    # To be safe, we will just manually find all "X / Y" strings that are text nodes or prop values.
    
    # Because doing a blind regex replace might break things, let's look for specific patterns:
    # 1. >Text / Text<
    content = re.sub(r'>([^<>{\n]+ / [^<>}\n]+)<', r'>{getLocalizedText("\1", language)}<', content)
    # 2. "Text / Text"
    content = re.sub(r'(?<!getLocalizedText\()(["\'])([^"\'<>{\n]+ / [^"\'<>}\n]+)\1(?!\s*[:,])', r'getLocalizedText(\1\2\1, language)', content)

    # 3. Add useTranslation and language
    if 'useTranslation' not in content:
        content = content.replace('import { cn }', 'import { useTranslation } from "@/lib/i18n";\nimport { cn }')
    
    if 'getLocalizedText' in content and 'function getLocalizedText' not in content:
        helper = """
export function getLocalizedText(text: string, language: string) {
  if (!text) return text;
  const parts = text.split(" / ");
  if (parts.length > 1) {
    return language === "ar" ? parts[1].trim() : parts[0].trim();
  }
  return text;
}
"""
        if 'getLocalizedText(' in content and 'export function getLocalizedText' not in content:
            content = content.replace('import { cn }', helper + '\nimport { cn }')

    # Ensure language is available in PosSessionBar
    if 'PosSessionBar({' in content and 'const { language }' not in content:
        content = content.replace('PosSessionBar({', 'PosSessionBar({')
        content = re.sub(r'(canCloseSession\?: boolean;\n}) {', r'\1 {\n  const { language } = useTranslation();', content)

    path.write_text(content, encoding='utf-8')
    print(f"Processed {filepath}")

process_file('/home/whitespider/Desktop/work_project/simple-account/frontend/features/pos/pos-page.tsx')
process_file('/home/whitespider/Desktop/work_project/simple-account/frontend/features/pos/pos-session-bar.tsx')
