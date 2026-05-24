import re
with open("docs/change-guide.md", "r") as f: content = f.read()
content = re.sub(
    r'<<<<<<< Updated upstream\n(.*?)\n=======\n(.*?)\n>>>>>>> Stashed changes',
    r'\1\n\2',
    content,
    flags=re.DOTALL
)
with open("docs/change-guide.md", "w") as f: f.write(content)
