import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find string literals containing ' / ' where both sides have words
    # Like "English / Arabic" or 'English / Arabic'
    def replacer(match):
        full_string = match.group(0)
        quote = match.group(1)
        inner_text = match.group(2)
        # Check if it looks like a translation string
        if " / " in inner_text and not inner_text.startswith("<"):
            # Don't replace if it's already inside getLocalizedText
            return f'getLocalizedText({quote}{inner_text}{quote}, language)'
        return full_string

    new_content = re.sub(r'([\'"`])(.*? / .*?)\1', replacer, content)
    
    # We need to make sure getLocalizedText is available.
    if 'getLocalizedText' in new_content and 'function getLocalizedText' not in new_content:
        # Add getLocalizedText at the end of imports or top of file
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
        new_content = new_content.replace('import { useTranslation } from "@/lib/i18n";', 'import { useTranslation } from "@/lib/i18n";\n' + helper)

    if content != new_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")
    else:
        print(f"No changes for {filepath}")

process_file('/home/whitespider/Desktop/work_project/simple-account/frontend/features/pos/pos-page.tsx')
process_file('/home/whitespider/Desktop/work_project/simple-account/frontend/features/pos/pos-session-bar.tsx')
