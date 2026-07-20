import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router";
import { bookCategories } from "../data/categories";
import { Menu, X, User, ShoppingCart } from "lucide-react";
import { CartDrawer } from "./CartDrawer";

const customerLinks = [
  { label: "About Us", href: "/about" },
  { label: "Books", href: "/catalogue" },
  { label: "Invite Authors", href: "/invite-authors" },
  { label: "Gallery", href: "/gallery" },
  { label: "Contact", href: "/contact" },
];

const authorLinks = [
  { label: "Author Portal", href: "/authors" },
  { label: "Services", href: "/services" },
  { label: "Events", href: "/events" },
  { label: "Gallery", href: "/gallery?from=author" },
  { label: "Flybraries", href: "/flybraries" },
];

const organizerLinks = [
  { label: "Organizer Portal", href: "/organizers" },
  { label: "Events", href: "/events?from=organizer" },
  { label: "Gallery", href: "/gallery?from=organizer" },
  { label: "Organize a Literary Event", href: "/organizers/organize-event" },
];

export function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const isOrganizerRoute = location.pathname.startsWith("/organizers") ||
    (location.pathname === "/events" && location.search.includes("from=organizer")) ||
    (location.pathname === "/gallery" && location.search.includes("from=organizer"));

  const isAuthorRoute = !isOrganizerRoute && (
    location.pathname.startsWith("/authors") ||
    ["/services", "/events", "/flybraries"].includes(location.pathname) ||
    (location.pathname === "/gallery" && location.search.includes("from=author"))
  );
  const [cartCount, setCartCount] = useState(0);

  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const megaMenuTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [capsuleStyle, setCapsuleStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const navRef = useRef<HTMLElement>(null);
  const activeLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    // Small delay to ensure DOM is painted
    const timer = setTimeout(() => {
      if (activeLinkRef.current && navRef.current) {
        const parentRect = navRef.current.getBoundingClientRect();
        const linkRect = activeLinkRef.current.getBoundingClientRect();
        setCapsuleStyle({
          left: linkRect.left - parentRect.left,
          width: linkRect.width,
          opacity: 1
        });
      } else {
        setCapsuleStyle({ left: 0, width: 0, opacity: 0 });
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [location.pathname, isOrganizerRoute, isAuthorRoute]);

  const handleNavHover = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (navRef.current) {
      const parentRect = navRef.current.getBoundingClientRect();
      const linkRect = e.currentTarget.getBoundingClientRect();
      setCapsuleStyle({
        left: linkRect.left - parentRect.left,
        width: linkRect.width,
        opacity: 1
      });
    }
  };

  const handleNavLeave = () => {
    if (activeLinkRef.current && navRef.current) {
      const parentRect = navRef.current.getBoundingClientRect();
      const linkRect = activeLinkRef.current.getBoundingClientRect();
      setCapsuleStyle({
        left: linkRect.left - parentRect.left,
        width: linkRect.width,
        opacity: 1
      });
    } else {
      setCapsuleStyle(prev => ({ ...prev, opacity: 0 }));
    }
  };

  const handleMouseEnterBooks = () => {
    if (megaMenuTimeoutRef.current) clearTimeout(megaMenuTimeoutRef.current);
    setMegaMenuOpen(true);
  };

  const handleMouseLeaveBooks = () => {
    megaMenuTimeoutRef.current = setTimeout(() => {
      setMegaMenuOpen(false);
    }, 200);
  };

  const [hasBooks, setHasBooks] = useState<{ main: Record<string, boolean>, sub: Record<string, boolean> }>({ main: {}, sub: {} });

  useEffect(() => {
    const processBooks = (books: any[]) => {
      const main: Record<string, boolean> = {};
      const sub: Record<string, boolean> = {};
      books.forEach(b => {
        if (b.genre) main[b.genre] = true;
        if (b.subGenre) {
          const parts = b.subGenre.split(b.subGenre.includes(" > ") ? " > " : ">").map((s: string) => s.trim());
          if (parts[0]) sub[parts[0]] = true;
        }
      });
      setHasBooks({ main, sub });
    };

    const w = window as any;
    if (w.__apiCache?.catalogueBooks) {
      processBooks(w.__apiCache.catalogueBooks);
    } else {
      fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/books`)
        .then(res => res.json())
        .then(data => processBooks(data))
        .catch(console.error);
    }
  }, []);

  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("userRole");

  useEffect(() => {
    const updateCartCount = () => {
      const saved = localStorage.getItem('checkout_cart');
      const savedQ = localStorage.getItem('checkout_quantities');
      if (saved) {
        const ids = JSON.parse(saved);
        if (savedQ) {
          const qs = JSON.parse(savedQ);
          const total = ids.reduce((sum: number, id: string) => sum + (qs[id] || 1), 0);
          setCartCount(total);
        } else {
          setCartCount(ids.length);
        }
      } else {
        setCartCount(0);
      }
    };
    updateCartCount();
    window.addEventListener('cart_updated', updateCartCount);
    return () => window.removeEventListener('cart_updated', updateCartCount);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <>
      <style>{`
      .main-navbar { width: 95%; max-width: 1400px; }
      .mobile-toggle { display: none !important; }
      @media (max-width: 1024px) {
        .desktop-container { display: none !important; }
        .mobile-toggle { display: flex !important; }
      }
      @media (max-width: 768px) {
        .main-navbar { width: calc(100% - 2rem) !important; justify-content: space-between !important; }
      }
    `}</style>
      <div
        className="main-navbar-wrapper"
        style={{
          position: "fixed",
          top: 20,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1000,
          width: "95%",
          maxWidth: 1400,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: "0.5rem"
        }}
      >
      <header
        className="main-navbar-inner"
        style={{
          width: "100%",
          background: "rgba(255, 255, 255, 0.3)",
          backdropFilter: "blur(100px)",
          WebkitBackdropFilter: "blur(100px)",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          borderRadius: "50px",
          boxShadow: scrolled ? "0 10px 30px rgba(0,0,0,0.08)" : "0 4px 20px rgba(0,0,0,0.04)",
          transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
        }}
      >
        <div
          className="main-navbar-content"
          style={{
            padding: "0.5rem 1.5rem", minHeight: 60, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem",
          }}
        >
          {/* Logo */}
          <Link
            to="/"
            style={{ display: "flex", alignItems: "center", gap: "1rem", textDecoration: "none", flexShrink: 0, paddingRight: "1rem" }}
            onClick={() => {
              if (location.pathname === "/") {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
          >
            {!logoError ? (
              <img
                src="/logo.webp"
                alt="Pune Authors' Association Logo"
                className="navbar-logo-img"
                style={{ height: 70, objectFit: "contain", transition: "transform 0.3s ease", borderRadius: "50%" }}
                onError={() => setLogoError(true)}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              />
            ) : (
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  background: "#b44d28",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: 24,
                }}
              >
                P
              </div>
            )}
            <span className="brand-text" style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: "#111", letterSpacing: "0.02em", textTransform: "uppercase" }}>
              Pune Authors Association
            </span>
          </Link>

          {/* Desktop Nav Links & Dynamic Buttons Container */}
          <div className="desktop-container" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.4rem", flex: 1, justifyContent: "flex-end" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <nav className="desktop-nav" ref={navRef} onMouseLeave={handleNavLeave} style={{ display: "flex", alignItems: "center", gap: "0.25rem", position: "relative" }}>
              <div style={{
              position: "absolute",
              top: "50%",
              transform: "translateY(-50%)",
              left: capsuleStyle.left,
              width: capsuleStyle.width,
              height: "36px",
              background: "#FF6B00",
              borderRadius: "100px",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              opacity: capsuleStyle.opacity,
              pointerEvents: "none",
              zIndex: 0
            }} />

            {(() => {
              const currentLinks = isOrganizerRoute ? organizerLinks : isAuthorRoute ? authorLinks : customerLinks;
              return currentLinks.map((link) => {
                const isActive = location.pathname === link.href;
                return (
                  <Link
                    key={link.label}
                    to={link.href}
                    ref={isActive ? activeLinkRef : null}
                    className="nav-link"
                    onClick={() => {
                      if (isActive) window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    style={{
                      fontFamily: "'Google Sans', sans-serif",
                      fontSize: 14,
                      fontWeight: isActive ? 700 : 600,
                      color: isActive ? "#fff" : "#333",
                      textDecoration: "none",
                      transition: "color 0.2s ease",
                      whiteSpace: "nowrap",
                      position: "relative",
                      zIndex: 1,
                      padding: "0.5rem 1rem",
                      borderRadius: "100px"
                    }}
                    onMouseEnter={(e) => {
                      handleNavHover(e);
                      (e.currentTarget as HTMLAnchorElement).style.color = "#fff";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.color = isActive ? "#fff" : "#333";
                    }}
                  >
                    {link.label}
                  </Link>
                );
              })
            })()}
          </nav>

          {/* Desktop Actions */}
          <div className="desktop-actions" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {(!userRole || userRole === "CUSTOMER") && location.pathname !== "/register" && (
              <button onClick={() => setCartOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", position: 'relative', display: 'flex', alignItems: 'center', color: '#111' }}>
                <ShoppingCart size={20} />
                {cartCount > 0 && <span style={{ position: 'absolute', top: -8, right: -12, background: '#b44d28', color: '#fff', fontSize: 10, fontWeight: 'bold', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>{cartCount}</span>}
              </button>
            )}
            {token ? (
              <Link
                to={userRole === "ADMIN" ? "/operations" : userRole === "AUTHOR" ? "/dashboard" : "/profile"}
                style={{
                  fontFamily: "'Google Sans', sans-serif",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#111",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  transition: "color 0.2s ease",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#b44d28"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#111"; }}
              >
                <User size={15} /> My Profile
              </Link>
            ) : (
              <Link
                to="/login"
                style={{
                  fontFamily: "'Google Sans', sans-serif",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#333",
                  textDecoration: "none",
                  transition: "color 0.2s ease",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#FF6B00"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#333"; }}
              >
                Sign In
              </Link>
            )}
          </div>
          </div>

        </div>


          {/* Mobile Toggle & Cart */}
          <div className="mobile-toggle" style={{ alignItems: "center", gap: "1.2rem" }}>
            {(!userRole || userRole === "CUSTOMER") && location.pathname !== "/register" && (
              <button onClick={() => setCartOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", position: 'relative', display: 'flex', color: '#111' }}>
                <ShoppingCart size={22} />
                {cartCount > 0 && <span style={{ position: 'absolute', top: -8, right: -12, background: '#b44d28', color: '#fff', fontSize: 10, fontWeight: 'bold', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>{cartCount}</span>}
              </button>
            )}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#111",
                padding: "0.2rem",
                display: "flex",
                alignItems: "center"
              }}
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className="mobile-menu"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "#ffffff",
            display: menuOpen ? "flex" : "none",
            flexDirection: "column",
            padding: "100px 2rem 2rem 2rem",
            gap: "1.5rem",
            zIndex: -1,
            overflowY: "auto",
          }}
        >
          {(() => {
            const currentLinks = isOrganizerRoute ? organizerLinks : isAuthorRoute ? authorLinks : customerLinks;
            return currentLinks.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.label}
                  to={link.href}
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "1.2rem",
                    color: isActive ? "#FF6B00" : "#111",
                    textDecoration: "none",
                    fontWeight: isActive ? 700 : 400,
                  }}
                >
                  {link.label}
                </Link>
              );
            });
          })()}

          {(() => {
            const btnStyle = {
              fontSize: '1rem',
              fontWeight: 800,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.05em',
              color: '#111',
              background: 'rgba(0,0,0,0.04)',
              border: '1px solid rgba(0,0,0,0.08)',
              padding: '0.8rem 1rem',
              borderRadius: '50px',
              textDecoration: 'none',
              textAlign: 'center' as const,
              transition: 'all 0.3s ease',
              whiteSpace: 'nowrap' as const,
              fontFamily: "'Google Sans', sans-serif"
            };

            if (isAuthorRoute) {
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <Link to="/organizers" style={btnStyle} onClick={() => setMenuOpen(false)}>Request Literary Event</Link>
                  <Link to="/" style={btnStyle} onClick={() => setMenuOpen(false)}>For Readers</Link>
                </div>
              );
            } else if (isOrganizerRoute) {
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <Link to="/authors" style={btnStyle} onClick={() => setMenuOpen(false)}>Authors / Join the Group</Link>
                  <Link to="/" style={btnStyle} onClick={() => setMenuOpen(false)}>For Readers</Link>
                </div>
              );
            } else {
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <Link to="/authors" style={btnStyle} onClick={() => setMenuOpen(false)}>Authors / Join the Group</Link>
                  <Link to="/organizers" style={btnStyle} onClick={() => setMenuOpen(false)}>Request Literary Event</Link>
                </div>
              );
            }
          })()}

          <div style={{ height: "1px", background: "#eaeaea", width: "100%", margin: "0.5rem 0" }}></div>

          {token ? (
            <Link
              to={userRole === "ADMIN" ? "/operations" : userRole === "AUTHOR" ? "/dashboard" : "/profile"}
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.2rem",
                color: "#111",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "0.8rem",
              }}
              onClick={() => setMenuOpen(false)}
            >
              <User size={18} /> My Profile
            </Link>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <Link
                to="/login"
                style={{
                  fontFamily: "'Google Sans', sans-serif",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#333",
                  textDecoration: "none",
                  textAlign: "center",
                  padding: "0.8rem",
                  border: "1px solid #eaeaea",
                }}
                onClick={() => setMenuOpen(false)}
              >
                Sign In
              </Link>
            </div>
          )}
        </div>

        <style>{`
        .nav-link { position: relative; }
        
        @media (min-width: 993px) {
          .mobile-menu { display: none !important; }
        }
        @media (max-width: 992px) {
          .desktop-nav { display: none !important; }
          .mobile-toggle { display: flex !important; }
        }
        @media (max-width: 600px) {
          .brand-text { display: none !important; }
          .navbar-logo-img { height: 45px !important; }
        }
      `}</style>

        {/* Mega Menu Dropdown */}
        {false && (
          <div
            style={{
              position: 'absolute', top: '100%', left: 0, width: '100%',
              background: '#fff', borderTop: '1px solid #eaeaea',
              boxShadow: '0 10px 25px rgba(0,0,0,0.05)', display: 'flex',
              justifyContent: 'center', transition: 'all 0.3s ease',
              zIndex: 40
            }}
            onMouseEnter={handleMouseEnterBooks}
            onMouseLeave={handleMouseLeaveBooks}
          >
            <div style={{ maxWidth: 1100, width: '100%', display: 'flex' }}>
              <div style={{ flex: 3, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '2.5rem 1.5rem', gap: '2rem' }}>

                {/* Column 1: Fiction */}
                {hasBooks.main["Fiction"] && (
                  <div>
                    <Link onClick={() => setMegaMenuOpen(false)} to={`/catalogue?category=Fiction`} style={{ color: '#b44d28', fontWeight: 700, fontSize: 15, textDecoration: 'none', marginBottom: '1.2rem', display: 'block' }}>Fiction</Link>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                      {Object.keys(bookCategories["Fiction"]).filter(sub => hasBooks.sub[sub]).slice(0, 6).map(sub => (
                        <li key={sub}>
                          <Link onClick={() => setMegaMenuOpen(false)} to={`/catalogue?category=Fiction&subcategory=${encodeURIComponent(sub)}`} style={{ color: '#4b5563', fontSize: 13, textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#b44d28')} onMouseLeave={(e) => (e.currentTarget.style.color = '#4b5563')}>{sub}</Link>
                        </li>
                      ))}
                      <li style={{ marginTop: '0.2rem' }}>
                        <Link onClick={() => setMegaMenuOpen(false)} to={`/catalogue?category=Fiction`} style={{ color: '#b44d28', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>See All &rarr;</Link>
                      </li>
                    </ul>
                  </div>
                )}

                {/* Column 2: Non-Fiction */}
                {hasBooks.main["Non-Fiction"] && (
                  <div>
                    <Link onClick={() => setMegaMenuOpen(false)} to={`/catalogue?category=Non-Fiction`} style={{ color: '#b44d28', fontWeight: 700, fontSize: 15, textDecoration: 'none', marginBottom: '1.2rem', display: 'block' }}>Non-Fiction</Link>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                      {Object.keys(bookCategories["Non-Fiction"]).filter(sub => hasBooks.sub[sub]).slice(0, 6).map(sub => (
                        <li key={sub}>
                          <Link onClick={() => setMegaMenuOpen(false)} to={`/catalogue?category=Non-Fiction&subcategory=${encodeURIComponent(sub)}`} style={{ color: '#4b5563', fontSize: 13, textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#b44d28')} onMouseLeave={(e) => (e.currentTarget.style.color = '#4b5563')}>{sub}</Link>
                        </li>
                      ))}
                      <li style={{ marginTop: '0.2rem' }}>
                        <Link onClick={() => setMegaMenuOpen(false)} to={`/catalogue?category=Non-Fiction`} style={{ color: '#b44d28', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>See All &rarr;</Link>
                      </li>
                    </ul>
                  </div>
                )}

                {/* Column 3: Children's Books */}
                {hasBooks.main["Children's Books"] && (
                  <div>
                    <Link onClick={() => setMegaMenuOpen(false)} to={`/catalogue?category=${encodeURIComponent("Children's Books")}`} style={{ color: '#b44d28', fontWeight: 700, fontSize: 15, textDecoration: 'none', marginBottom: '1.2rem', display: 'block' }}>Children's Books</Link>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                      {Object.keys(bookCategories["Children's Books"]).filter(sub => hasBooks.sub[sub]).slice(0, 6).map(sub => (
                        <li key={sub}>
                          <Link onClick={() => setMegaMenuOpen(false)} to={`/catalogue?category=${encodeURIComponent("Children's Books")}&subcategory=${encodeURIComponent(sub)}`} style={{ color: '#4b5563', fontSize: 13, textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#b44d28')} onMouseLeave={(e) => (e.currentTarget.style.color = '#4b5563')}>{sub}</Link>
                        </li>
                      ))}
                      <li style={{ marginTop: '0.2rem' }}>
                        <Link onClick={() => setMegaMenuOpen(false)} to={`/catalogue?category=${encodeURIComponent("Children's Books")}`} style={{ color: '#b44d28', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>See All &rarr;</Link>
                      </li>
                    </ul>
                  </div>
                )}

              </div>

              {/* Column 4: Also Explore */}
              <div style={{ flex: 1, background: '#fff9f5', padding: '2.5rem 2rem', borderLeft: '1px solid #f3e8e0', display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: '#1e293b', fontWeight: 700, fontSize: 15, marginBottom: '1.2rem', display: 'block' }}>Also Explore</span>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {["Academic & Educational", "Arts & Entertainment", "Comics & Graphic Novels", "Lifestyle", "Poetry", "Reference", "Sports & Outdoors", "Regional & Language Literature"].filter(cat => hasBooks.main[cat]).map(cat => (
                    <li key={cat}>
                      <Link onClick={() => setMegaMenuOpen(false)} to={`/catalogue?category=${encodeURIComponent(cat)}`} style={{ color: '#c2410c', fontSize: 13, textDecoration: 'none', fontWeight: 600, transition: 'color 0.2s' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#7c2d12')} onMouseLeave={(e) => (e.currentTarget.style.color = '#c2410c')}>{cat}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

      </header>

      {/* Floating Buttons Below Navbar */}
      <div className="desktop-container" style={{ display: "flex", gap: "0.8rem", marginRight: "1rem", marginTop: "0.2rem" }}>
        {(() => {
          const btnStyle = {
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
            color: '#fff',
            background: '#FF6B00',
            border: 'none',
            padding: '0.5rem 1.2rem',
            borderRadius: '50px',
            textDecoration: 'none',
            transition: 'all 0.3s ease',
            whiteSpace: 'nowrap' as const,
            fontFamily: "'Google Sans', sans-serif",
            boxShadow: '0 4px 10px rgba(255, 107, 0, 0.3)'
          };
          const hoverEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
            e.currentTarget.style.backgroundColor = '#e66000';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 15px rgba(255, 107, 0, 0.4)';
          };
          const hoverLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
            e.currentTarget.style.backgroundColor = '#FF6B00';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 10px rgba(255, 107, 0, 0.3)';
          };

          if (isAuthorRoute) {
            return (
              <>
                <Link to="/organizers" style={btnStyle} onMouseEnter={hoverEnter} onMouseLeave={hoverLeave}>Request Literary Event</Link>
                <Link to="/" style={btnStyle} onMouseEnter={hoverEnter} onMouseLeave={hoverLeave}>For Readers</Link>
              </>
            );
          } else if (isOrganizerRoute) {
            return (
              <>
                <Link to="/authors" style={btnStyle} onMouseEnter={hoverEnter} onMouseLeave={hoverLeave}>Authors / Join the Group</Link>
                <Link to="/" style={btnStyle} onMouseEnter={hoverEnter} onMouseLeave={hoverLeave}>For Readers</Link>
              </>
            );
          } else {
            return (
              <>
                <Link to="/authors" style={btnStyle} onMouseEnter={hoverEnter} onMouseLeave={hoverLeave}>Authors / Join the Group</Link>
                <Link to="/organizers" style={btnStyle} onMouseEnter={hoverEnter} onMouseLeave={hoverLeave}>Request Literary Event</Link>
              </>
            );
          }
        })()}
      </div>
      </div>
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
