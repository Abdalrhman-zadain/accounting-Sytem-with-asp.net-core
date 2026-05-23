from pathlib import Path

# 1. Add getLocalizedText to utils
utils_path = Path('/home/whitespider/Desktop/work_project/simple-account/frontend/lib/utils/index.ts')
utils_content = utils_path.read_text(encoding='utf-8')
if 'getLocalizedText' not in utils_content:
    utils_content += """
export function getLocalizedText(text: string, language: string) {
  if (!text) return text;
  const parts = text.split(" / ");
  if (parts.length > 1) {
    return language === "ar" ? parts[1].trim() : parts[0].trim();
  }
  return text;
}
"""
    utils_path.write_text(utils_content, encoding='utf-8')

# 2. Fix imports in pos-page.tsx
page_path = Path('/home/whitespider/Desktop/work_project/simple-account/frontend/features/pos/pos-page.tsx')
page_content = page_path.read_text(encoding='utf-8')
if 'getLocalizedText' not in page_content[:1000]:
    page_content = page_content.replace('import { cn } from "@/lib/utils";', 'import { cn, getLocalizedText } from "@/lib/utils";')
page_path.write_text(page_content, encoding='utf-8')

# 3. Fix imports in pos-session-bar.tsx
bar_path = Path('/home/whitespider/Desktop/work_project/simple-account/frontend/features/pos/pos-session-bar.tsx')
bar_content = bar_path.read_text(encoding='utf-8')
bar_content = bar_content.replace('import { getLocalizedText } from "./pos-page";', '')
bar_content = bar_content.replace('import { cn } from "@/lib/utils";', 'import { cn, getLocalizedText } from "@/lib/utils";')
bar_path.write_text(bar_content, encoding='utf-8')

print("Fixed imports and getLocalizedText.")
