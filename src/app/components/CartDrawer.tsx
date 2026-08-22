import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { X, Trash2, ShoppingCart } from "lucide-react";

export function CartDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [cartIds, setCartIds] = useState<number[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      loadCart();
    }
  }, [isOpen]);

  const loadCart = async () => {
    const saved = localStorage.getItem('checkout_cart');
    const ids = saved ? JSON.parse(saved).map(Number) : [];
    setCartIds(ids);
    
    if (ids.length === 0) {
      setBooks([]);
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/books`);
      const data = await res.json();
      const cartBooks = data.filter((b: any) => ids.includes(b.id));
      setBooks(cartBooks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const removeItem = (id: number) => {
    const newIds = cartIds.filter(cid => cid !== id);
    setCartIds(newIds);
    setBooks(prev => prev.filter(b => b.id !== id));
    localStorage.setItem('checkout_cart', JSON.stringify(newIds));
    try {
       const savedQ = JSON.parse(localStorage.getItem('checkout_quantities') || '{}');
       delete savedQ[id];
       localStorage.setItem('checkout_quantities', JSON.stringify(savedQ));
    } catch {}
    window.dispatchEvent(new Event('cart_updated'));
  };

  const qs = (() => {
    try { return JSON.parse(localStorage.getItem('checkout_quantities') || '{}'); } catch { return {}; }
  })();
  const subtotal = books.reduce((sum, b) => sum + (b.mrp || 428) * (qs[b.id] || 1), 0);

  return (
    <>
      {/* Backdrop */}
      <div 
        onClick={onClose}
        style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100vh",
          background: "rgba(0,0,0,0.5)", zIndex: 999,
          opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 0.3s ease",
          backdropFilter: "blur(4px)"
        }}
      />

      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, right: 0, width: "100%", maxWidth: 400, height: "100vh",
        background: "#fff", zIndex: 1000,
        transform: isOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.3s ease",
        display: "flex", flexDirection: "column",
        boxShadow: "-4px 0 15px rgba(0,0,0,0.1)"
      }}>
        {/* Header */}
        <div style={{ padding: "1.5rem", borderBottom: "1px solid #eaeaea", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, margin: 0, color: "#111", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <ShoppingCart size={20} /> Your Cart
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#666" }}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
          {loading ? (
            <div style={{ textAlign: "center", color: "#666", padding: "2rem" }}>Loading cart...</div>
          ) : books.length === 0 ? (
            <div style={{ textAlign: "center", color: "#666", padding: "3rem 1rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
              <ShoppingCart size={48} opacity={0.2} />
              <p style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>Your cart is empty.</p>
              <button onClick={() => { onClose(); navigate("/catalogue"); }} style={{ background: "#111", color: "#fff", border: "none", padding: "0.8rem 1.5rem", borderRadius: 8, cursor: "pointer", fontWeight: 600, marginTop: "1rem" }}>
                Browse Books
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {books.map(book => (
                <div key={book.id} style={{ display: "flex", gap: "1rem", borderBottom: "1px solid #f0f0f4", paddingBottom: "1rem" }}>
                  <div style={{ width: 60, height: 90, background: "#f9f9f9", flexShrink: 0, border: "1px solid #eaeaea" }}>
                    {book.coverUrl ? (
                      <img src={book.coverUrl.match(/^(http|data:)/) ? book.coverUrl : `${import.meta.env.VITE_API_URL || "http://localhost:3001"}${book.coverUrl}`} alt={book.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : null}
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    <h4 style={{ margin: "0 0 0.25rem", fontSize: 14, color: "#111", fontWeight: 600, lineHeight: 1.3 }}>{book.title}</h4>
                    <span style={{ fontSize: 12, color: "#666", marginBottom: "auto" }}>by {book.authorName || book.author?.name}</span>
                    
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color: "#b44d28" }}>₹{book.mrp || 428} {(qs[book.id] || 1) > 1 ? `x ${qs[book.id]}` : ""}</span>
                      <button onClick={() => removeItem(book.id)} style={{ background: "none", border: "none", color: "#999", cursor: "pointer", padding: "0.25rem", display: "flex" }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {books.length > 0 && (
          <div style={{ padding: "1.5rem", borderTop: "1px solid #eaeaea", background: "#fafafa" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#666" }}>Subtotal</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 800, color: "#111" }}>₹{subtotal}</span>
            </div>
            <p style={{ fontSize: 12, color: "#888", marginBottom: "1.5rem", textAlign: "center" }}>Taxes and shipping calculated at checkout.</p>
            <button 
              onClick={() => { 
                onClose();
                const token = localStorage.getItem("token");
                const role = localStorage.getItem("userRole");
                if (!token || role !== "CUSTOMER") {
                  navigate("/login?role=CUSTOMER&redirect=/checkout");
                } else {
                  navigate("/checkout");
                }
              }}
              style={{ width: "100%", background: "#111", color: "#fff", border: "none", padding: "1rem", borderRadius: 8, fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer", transition: "opacity 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.opacity="0.8"}
              onMouseLeave={e => e.currentTarget.style.opacity="1"}
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>
    </>
  );
}
