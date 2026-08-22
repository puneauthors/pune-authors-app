import re

with open('src/app/components/AboutPage.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Revert Our Story image
c = c.replace(
    'src={aboutImage ? (aboutImage.startsWith(\'data:\') ? aboutImage : `${import.meta.env.VITE_API_URL || "http://localhost:3001"}${aboutImage}`) : "/pune_authors_hcl_event.webp"}',
    'src="/pune_authors_hcl_event.webp"'
)

# Fix Hero background
bg_style = """
        style={{
          position: "relative",
          minHeight: "45vh",
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
          background: aboutImage ? `linear-gradient(135deg, rgba(15,23,42,0.6) 0%, rgba(30,41,59,0.6) 100%), url(${aboutImage.startsWith('data:') ? aboutImage : (import.meta.env.VITE_API_URL || "http://localhost:3001") + aboutImage}) center/cover no-repeat` : "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)",
        }}
"""
c = re.sub(r'        style=\{\{\s*position: "relative",\s*minHeight: "45vh",\s*display: "flex",\s*alignItems: "center",\s*overflow: "hidden",\s*background: "linear-gradient\(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%\)",\s*\}\}', bg_style.strip('\n'), c)

with open('src/app/components/AboutPage.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
