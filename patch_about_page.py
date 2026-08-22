import re

with open('src/app/components/AboutPage.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Add axios import if not present
if "import axios" not in c:
    c = c.replace('import { useState, useEffect, useRef } from "react";', 'import { useState, useEffect, useRef } from "react";\nimport axios from "axios";')

# Inject state and fetch logic
fetch_logic = """
export function AboutPage() {
  const [aboutImage, setAboutImage] = useState("");
  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/public-stats`)
      .then(res => {
        if (res.data.aboutPageImage) {
          setAboutImage(res.data.aboutPageImage);
        }
      })
      .catch(() => {});
  }, []);
"""
c = c.replace("export function AboutPage() {", fetch_logic)

# Update background style
bg_style = """
        style={{
          position: "relative",
          minHeight: "45vh",
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
          background: aboutImage ? `linear-gradient(135deg, rgba(15,23,42,0.85) 0%, rgba(30,41,59,0.85) 100%), url(${aboutImage.startsWith('data:') ? aboutImage : (import.meta.env.VITE_API_URL || "http://localhost:3001") + aboutImage}) center/cover no-repeat` : "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)",
        }}
"""
c = re.sub(r'        style=\{\{\s*position: "relative",\s*minHeight: "45vh",\s*display: "flex",\s*alignItems: "center",\s*overflow: "hidden",\s*background: "linear-gradient\(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%\)",\s*\}\}', bg_style.strip('\n'), c)

with open('src/app/components/AboutPage.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
