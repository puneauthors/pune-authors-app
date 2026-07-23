import React, { useState, useEffect, useRef } from 'react';
import { Plane, MapPin, BookOpen, Clock } from 'lucide-react';
import axios from 'axios';

const airports = [
  { name: 'Kolkata Airport', location: 'Netaji Subhash Chandra Bose International Airport, Kolkata', books: '278', defaultImage: '/kolkata_airport_flybrary.webp' },
  { name: 'Chennai Airport', location: 'Chennai International Airport, Chennai', books: '403', defaultImage: '/chennai_airport_flybrary.webp' },
  { name: 'Pune Airport', location: 'Pune International Airport, Pune', books: '380', defaultImage: '/pune_airport_flybrary.webp' },
  { name: 'Thiruvananthapuram Airport', location: 'Trivandrum International Airport', books: '59', defaultImage: '/trivandrum_airport_flybrary.webp' },
  { name: 'Mangaluru Airport', location: 'Mangaluru International Airport', books: '136', defaultImage: '/mangalore_airport_flybrary.webp' },
  { name: 'Bhubaneshwar Airport', location: 'Biju Patnaik International Airport, Bhubaneshwar', books: '185', defaultImage: '/bhubaneshwar_airport_flybrary.webp' },
];


// --- NEOBRUTALIST COLOR PALETTE ---
const C = {
  primary: "#facc15", 
  red: "#ef4444",     
  blue: "#3b82f6",    
  green: "#16a34a",   
  purple: "#a855f7",
  dark: "#000000",    
  text: "#111827",    
  light: "#f8f9fa",   
  white: "#ffffff",
};

// --- FADE IN ON SCROLL ---
function FadeIn({ children, delay = 0 }: { children: React.ReactNode, delay?: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : `translateY(15px)`,
        transition: `all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
export function FlybrariesPage() {
  const [flybraries, setFlybraries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFlybraries = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/public/libraries`);
        const flys = res.data.filter((lib: any) => 
          lib.type === 'Airport Library' || 
          lib.name.toLowerCase().includes('airport')
        );
        setFlybraries(flys);
      } catch (error) {
        console.error("Failed to fetch flybraries:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchFlybraries();
  }, []);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const getEventBanner = (event: any) => {
    let url = event?.bannerUrl;
    if (!url && event?.galleryEvent) {
      if (event.galleryEvent.images && event.galleryEvent.images.length > 0) {
        url = event.galleryEvent.images[0].url;
      } else if (event.galleryEvent.photoUrl) {
        url = event.galleryEvent.photoUrl;
      }
    }
    if (url) {
      if (url.startsWith('http')) return url;
      if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        return `${apiBase}${url.startsWith('/') ? '' : '/'}${url}`;
      }
      if (url.startsWith('/')) return url;
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      return `${apiBase}/${url}`;
    }
    return null;
  };

  // Merge database libraries with hardcoded airports to ensure all 6 are displayed with correct data and images
  const mergedLibraries = airports.map(airport => {
    // Find matching library from DB
    const dbLib = flybraries.find(lib => {
      const dbNameNorm = lib.name.toLowerCase();
      const codeNameNorm = airport.name.toLowerCase();
      return dbNameNorm.includes(codeNameNorm) || codeNameNorm.includes(dbNameNorm) ||
             (dbNameNorm.includes('kolkata') && codeNameNorm.includes('kolkata')) ||
             (dbNameNorm.includes('chennai') && codeNameNorm.includes('chennai')) ||
             (dbNameNorm.includes('pune') && codeNameNorm.includes('pune')) ||
             (dbNameNorm.includes('thiruvananthapuram') && codeNameNorm.includes('thiruvananthapuram')) ||
             (dbNameNorm.includes('trivandrum') && codeNameNorm.includes('thiruvananthapuram')) ||
             (dbNameNorm.includes('mangalore') && codeNameNorm.includes('mangaluru')) ||
             (dbNameNorm.includes('mangaluru') && codeNameNorm.includes('mangaluru')) ||
             (dbNameNorm.includes('bhubneshwar') && codeNameNorm.includes('bhubaneshwar')) ||
             (dbNameNorm.includes('bhubaneshwar') && codeNameNorm.includes('bhubaneshwar'));
    });

    const bannerUrl = (dbLib && getEventBanner(dbLib)) || airport.defaultImage;

    return {
      ...airport,
      dbId: dbLib ? dbLib.id : null,
      createdAt: dbLib ? dbLib.createdAt : new Date().toISOString(),
      bannerUrl,
    };
  });

  // Also include any dynamic libraries in the DB that are NOT part of the 6 standard airports
  const extraLibraries = flybraries
    .filter(lib => {
      // Check if it was already matched
      const isMatched = airports.some(airport => {
        const dbNameNorm = lib.name.toLowerCase();
        const codeNameNorm = airport.name.toLowerCase();
        return dbNameNorm.includes(codeNameNorm) || codeNameNorm.includes(dbNameNorm) ||
               (dbNameNorm.includes('kolkata') && codeNameNorm.includes('kolkata')) ||
               (dbNameNorm.includes('chennai') && codeNameNorm.includes('chennai')) ||
               (dbNameNorm.includes('pune') && codeNameNorm.includes('pune')) ||
               (dbNameNorm.includes('thiruvananthapuram') && codeNameNorm.includes('thiruvananthapuram')) ||
               (dbNameNorm.includes('trivandrum') && codeNameNorm.includes('thiruvananthapuram')) ||
               (dbNameNorm.includes('mangalore') && codeNameNorm.includes('mangaluru')) ||
               (dbNameNorm.includes('mangaluru') && codeNameNorm.includes('mangaluru')) ||
               (dbNameNorm.includes('bhubneshwar') && codeNameNorm.includes('bhubaneshwar')) ||
               (dbNameNorm.includes('bhubaneshwar') && codeNameNorm.includes('bhubaneshwar'));
      });
      return !isMatched;
    })
    .map(lib => ({
      name: lib.name,
      location: lib.airportName ? `${lib.airportName}, ${lib.city}` : lib.city,
      books: lib.booksDonated || '250+',
      dbId: lib.id,
      createdAt: lib.createdAt,
      bannerUrl: getEventBanner(lib)
    }));

  const allLibraries = [...mergedLibraries, ...extraLibraries];
  const displayedLibraries = allLibraries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(allLibraries.length / itemsPerPage);

  return (
    <main style={{ fontFamily: "var(--font-body)", background: C.light, color: C.text, minHeight: "calc(100vh - 64px)", overflowX: "hidden" }}>
      {/* -- HERO -- */}
      <section style={{ padding: "11.5rem 2rem 4rem", textAlign: "center", position: "relative", background: C.light, borderBottom: `2px solid ${C.dark}` }}>
        <FadeIn>
          <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", color: C.dark, marginBottom: "2rem", display: "inline-block", background: C.primary, padding: "0.5rem 1.5rem", borderRadius: 50, border: `2px solid ${C.dark}`, boxShadow: "3px 3px 0px #000" }}>
            Taking Books to the Skies
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(3rem, 6vw, 4.5rem)", fontWeight: 900, lineHeight: 1.1, marginBottom: "1rem", letterSpacing: "-0.03em", color: C.dark, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.5rem", alignItems: "center" }}>
            <span>The</span>
            <span style={{ display: "inline-flex", gap: "0.2rem" }}>
              <div style={{ width: 50, height: 50, borderRadius: "50%", background: C.red, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, transform: "rotate(-10deg)", border: `2px solid ${C.dark}` }}><Plane size={24} /></div>
            </span>
            <span style={{ color: C.blue, textShadow: "2px 2px 0px #000" }}>Flybraries</span>
            <span>Project</span>
          </h1>
          <p style={{ fontSize: "1.2rem", color: "#4b5563", maxWidth: 650, margin: "2rem auto", lineHeight: 1.6, fontWeight: 600 }}>
            We believe that great stories should travel. Through the Flybraries initiative, the Pune Authors' Association has set up free libraries at six major Indian airports — Pune, Chennai, Kolkata, Mangalore, Thiruvananthapuram &amp; Bhubaneswar donating over 1,600 books to enrich the journeys of millions of travelers.
          </p>
        </FadeIn>
      </section>

      {/* -- LOCATIONS GRID -- */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "6rem 1.5rem" }}>
        {loading ? (
          <div className="events-grid">
             {[1, 2, 3].map((i) => (
                <div key={i} style={{ height: "300px", border: `2px solid ${C.dark}`, background: C.white, borderRadius: 16, padding: "2rem", boxShadow: "4px 4px 0px #000" }} className="animate-pulse flex flex-col">
                  <div style={{ height: "24px", background: "#e5e7eb", width: "80%", marginBottom: "1rem", borderRadius: 4 }} />
                  <div style={{ height: "16px", background: "#e5e7eb", width: "60%", marginBottom: "2rem", borderRadius: 4 }} />
                </div>
             ))}
          </div>
        ) : (
          <div className="events-grid">
            {displayedLibraries.map((lib, index) => {
              const bgColors = [C.white, C.white];
              const cardBg = bgColors[index % bgColors.length];
              const imgSrc = lib.bannerUrl || lib.defaultImage;
              return (
                <FadeIn key={index} delay={index * 50}>
                  <div className="event-card" style={{ display: "flex", flexDirection: "column", height: "100%", border: `2px solid ${C.dark}`, background: cardBg, borderRadius: 24, padding: "2rem", boxShadow: "4px 4px 0px #000", transition: "transform 0.2s ease, box-shadow 0.2s ease", cursor: "pointer" }}
                       onMouseEnter={e => { e.currentTarget.style.transform = "translate(-2px, -2px)"; e.currentTarget.style.boxShadow = "6px 6px 0px #000"; }}
                       onMouseLeave={e => { e.currentTarget.style.transform = "translate(0px, 0px)"; e.currentTarget.style.boxShadow = "4px 4px 0px #000"; }}>
                    <div style={{ height: 200, overflow: "hidden", marginBottom: "1.5rem", border: `2px solid ${C.dark}`, borderRadius: 16, background: C.light }}>
                      {imgSrc ? (
                         <img 
                           src={imgSrc} 
                           alt={lib.name} 
                           onError={(e) => {
                             if (lib.defaultImage && e.currentTarget.src !== window.location.origin + lib.defaultImage) {
                               e.currentTarget.src = lib.defaultImage;
                             }
                           }}
                           style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                         />
                      ) : (
                         <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", textAlign: "center" }}>
                            <Plane size={48} color={C.dark} style={{ marginBottom: "0.5rem", opacity: 0.2 }} />
                         </div>
                      )}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", alignItems: "center" }}>
                      <span style={{ fontSize: 12, fontWeight: 800, background: lib.dbId ? C.green : C.blue, padding: "0.3rem 0.8rem", borderRadius: 50, border: `2px solid ${C.dark}`, color: C.white }}>
                        {lib.dbId ? 'Active' : 'Ongoing'}
                      </span>
                      <div style={{ 
                        width: "36px", height: "36px", borderRadius: "50%", background: C.primary, border: `2px solid ${C.dark}`,
                        display: "flex", alignItems: "center", justifyContent: "center"
                      }}>
                        <Plane size={18} color={C.dark} />
                      </div>
                    </div>
                    <h3 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 900, color: C.dark, margin: "0 0 0.5rem", flexGrow: 1, lineHeight: 1.2 }}>{lib.name}</h3>
                    <p style={{ fontSize: 14, color: "#4b5563", fontWeight: 600, display: "flex", alignItems: "flex-start", gap: "0.5rem", marginBottom: "2rem", lineHeight: 1.4 }}>
                      <MapPin size={16} color={C.red} style={{ marginTop: "0.1rem", flexShrink: 0 }} />
                      <span>{lib.location}</span>
                    </p>
                    
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: C.light, padding: "1rem", borderRadius: "12px", border: `2px solid ${C.dark}` }}>
                      <BookOpen size={20} color={C.dark} />
                      <span style={{ fontSize: "0.9rem", fontWeight: 800, color: C.dark, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {lib.books} Books Donated
                      </span>
                    </div>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: "4rem", gap: "1rem" }}>
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                padding: "0.8rem 1.5rem", background: currentPage === 1 ? C.light : C.white, 
                color: currentPage === 1 ? "#9ca3af" : C.dark, border: `2px solid ${C.dark}`,
                borderRadius: "50px", cursor: currentPage === 1 ? "default" : "pointer", fontWeight: 800,
                boxShadow: currentPage === 1 ? "0px 0px 0px #000" : "3px 3px 0px #000",
                transition: "all 0.2s ease",
                transform: currentPage === 1 ? "none" : "translate(-2px, -2px)"
              }}
            >
              Previous
            </button>
            <span style={{ display: "flex", alignItems: "center", color: C.dark, fontSize: "14px", fontWeight: 800 }}>
              Page {currentPage} of {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: "0.8rem 1.5rem", background: currentPage === totalPages ? C.light : C.white, 
                color: currentPage === totalPages ? "#9ca3af" : C.dark, border: `2px solid ${C.dark}`,
                borderRadius: "50px", cursor: currentPage === totalPages ? "default" : "pointer", fontWeight: 800,
                boxShadow: currentPage === totalPages ? "0px 0px 0px #000" : "3px 3px 0px #000",
                transition: "all 0.2s ease",
                transform: currentPage === totalPages ? "none" : "translate(-2px, -2px)"
              }}
            >
              Next
            </button>
          </div>
        )}
      </section>

      <style>{`
        .events-grid { display: grid; grid-template-columns: repeat(1, 1fr); gap: 2rem; }
        @media (min-width: 768px) { .events-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1024px) { .events-grid { grid-template-columns: repeat(3, 1fr); } }
      `}</style>
    </main>
  );
}
