const fs = require('fs');
const file = 'src/app/components/LandingPage.tsx';
let c = fs.readFileSync(file, 'utf8');

const targetStart = `<div ref={nrScrollRef} className="horizontal-scroll"`;
const startIndex = c.indexOf(targetStart);
if (startIndex === -1) {
    console.error("Target start not found");
    process.exit(1);
}

const targetEndStr = `          </div>\n        </div>\n      </section>`;
let actualEnd = c.indexOf(targetEndStr, startIndex);
if (actualEnd === -1) {
    actualEnd = c.indexOf(`</section>`, startIndex);
    actualEnd = c.indexOf(`\n`, actualEnd) || actualEnd + 10;
}

const replacementChunk = `<div ref={nrScrollRef} className="horizontal-scroll grid grid-rows-2 grid-flow-col gap-4 overflow-x-auto pb-4 auto-cols-[85%] sm:auto-cols-[calc(50%-0.5rem)] lg:auto-cols-[calc(25%-0.75rem)]" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch", scrollBehavior: "smooth" }}>
            {[...galleryItems].reverse().slice(0, 16).map((book, i) => (
              <Link to={\`/book/\${book.id}\`} key={i} className="nr-card" style={{ position: "relative", background: "#fff", borderRadius: 12, padding: "0.9rem", display: "flex", gap: "0.8rem", alignItems: "center", boxShadow: "0 4px 15px rgba(0,0,0,0.03)", textDecoration: "none" }}>
                <div style={{ position: "absolute", top: "-0.4rem", right: "-0.4rem", background: "#00D084", color: "#fff", fontSize: "9px", fontWeight: 800, padding: "0.2rem 0.5rem", borderRadius: "50px", letterSpacing: "0.05em", zIndex: 10, boxShadow: "0 2px 10px rgba(0,208,132,0.3)" }}>NEW</div>
                <div className="nr-img-wrapper" style={{ width: 80, height: 110, background: "#e6f9f0", borderRadius: 6, overflow: "hidden", flexShrink: 0 }}>
                  <img src={book.coverUrl ? (book.coverUrl.match(/^(http|data:)/) ? book.coverUrl : \`\${import.meta.env.VITE_API_URL || "http://localhost:3001"}\${book.coverUrl}\`) : "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&h=450&fit=crop"} alt={book.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", justifyContent: "center" }}>
                  <h4 style={{ fontSize: 15, fontWeight: 800, color: "#111", margin: "0 0 0.3rem 0", lineHeight: 1.2 }}>{book.title}</h4>
                  <p className="nr-author" style={{ fontSize: 12, color: "#666", margin: "0 0 0.5rem 0", fontWeight: 500 }}>{book.authorName}</p>
                  <div className="nr-stars" style={{ display: "flex", alignItems: "center", gap: "0.2rem", marginBottom: "0.8rem" }}>
                     {[1,2,3,4].map(star => <span key={star} style={{ color: "#FFCC00", fontSize: 12 }}>★</span>)}
                     <span style={{ color: "#e2e8f0", fontSize: 12 }}>★</span>
                     <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: "0.3rem", fontWeight: 600 }}>4.0</span>
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 800, color: "#00D084" }}>₹{book.mrp || 250}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>`;

c = c.substring(0, startIndex) + replacementChunk + c.substring(actualEnd);
fs.writeFileSync(file, c);
console.log("Successfully replaced!");
