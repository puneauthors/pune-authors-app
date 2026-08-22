import re

def resolve_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        c = f.read()

    conflict_pattern = re.compile(r'<<<<<<< HEAD\n(.*?)\n=======\n.*?\n>>>>>>> [0-9a-f]{40}\n', re.DOTALL)
    c = conflict_pattern.sub(r'\1\n', c)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(c)

resolve_file('src/app/components/AboutPage.tsx')
resolve_file('src/app/components/BrowseAuthorsPage.tsx')
