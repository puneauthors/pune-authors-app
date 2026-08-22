import re

with open('src/app/components/BrowseAuthorsPage.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Inject state and fetch logic
fetch_logic = """
export function BrowseAuthorsPage() {
  const [authors, setAuthors] = useState<any[]>([]);
  const [filteredAuthors, setFilteredAuthors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bannerImage, setBannerImage] = useState("");

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/public-stats`)
      .then(res => {
        if (res.data.inviteAuthorBannerImage) {
          setBannerImage(res.data.inviteAuthorBannerImage);
        }
      })
      .catch(() => {});
  }, []);
"""
c = re.sub(r'export function BrowseAuthorsPage\(\) \{\s*const \[authors, setAuthors\] = useState<any\[\]>\(\[\]\);\s*const \[filteredAuthors, setFilteredAuthors\] = useState<any\[\]>\(\[\]\);\s*const \[loading, setLoading\] = useState\(true\);', fetch_logic.strip('\n'), c)

# Update background style
bg_style = """
      <section style={{ padding: "11.5rem 2rem 8rem", textAlign: "center", position: "relative", overflow: "hidden", backgroundColor: "#fff" }}>
        <div style={{ 
          position: "absolute", 
          inset: 0, 
          backgroundImage: bannerImage ? `url(${bannerImage.startsWith('data:') ? bannerImage : (import.meta.env.VITE_API_URL || 'http://localhost:3001') + bannerImage})` : "url('/panel-discussion.webp')", 
          backgroundSize: "cover", 
          backgroundPosition: "center 15%",
          filter: "grayscale(100%)",
          zIndex: 0
        }}></div>
"""
c = re.sub(r'<section style=\{\{\s*padding: "11.5rem 2rem 8rem",\s*textAlign: "center",\s*position: "relative",\s*overflow: "hidden",\s*backgroundColor: "#fff"\s*\}\}>\s*<div style=\{\{\s*position: "absolute",\s*inset: 0,\s*backgroundImage: "url\(\'/panel-discussion\.webp\'\)",\s*backgroundSize: "cover",\s*backgroundPosition: "center 15%",\s*filter: "grayscale\(100%\)",\s*zIndex: 0\s*\}\}></div', bg_style.strip('\n') + '</div', c)

with open('src/app/components/BrowseAuthorsPage.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
