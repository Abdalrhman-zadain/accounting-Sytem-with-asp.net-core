import re

file_path = "frontend/features/pos/pos-page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Find renderSettingsWorkspace block inside PosPage
# We know it starts with "  const renderSettingsWorkspace = () => {"
# and ends with "  const renderWorkspace ="
pattern = re.compile(r'  const renderSettingsWorkspace = \(\) => \{(.*?)\n  \};\n\n  const renderWorkspace =', re.DOTALL)
match = pattern.search(content)
if not match:
    print("Could not find renderSettingsWorkspace")
    exit(1)

settings_workspace_body = match.group(1)

# Remove renderSettingsWorkspace from inside PosPage
content = content[:match.start()] + "  const renderWorkspace =" + content[match.end():]

# In renderWorkspace, replace "return renderSettingsWorkspace();" with "return <SettingsWorkspace posSettings={posSettings} t={t} />;"
content = content.replace('return renderSettingsWorkspace();', 'return <SettingsWorkspace posSettings={posSettings} t={t} />;')

# Define SettingsWorkspace component outside PosPage
# We can append it to the end of the file
settings_component = f"""
function SettingsWorkspace({{ posSettings, t }}: {{ posSettings: any; t: any }}) {{{settings_workspace_body}
}}
"""
content += "\n" + settings_component

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Hooks fixed!")
