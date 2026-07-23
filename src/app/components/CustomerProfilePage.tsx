import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router";
import axios from "axios";
import { User, LogOut, Package, ArrowRight, MessageSquare, Mail, Phone, Check, BookOpen, Send, Star } from "lucide-react";
import fictionData from "./data/fiction_catalogue.json";
import nonFictionData from "./data/non_fiction_catalogue.json";
import { OrderFulfillmentTimeline } from "./OrderFulfillmentTimeline";
import { QueryThreadDisplay } from "./QueryThreadDisplay";
import FocusTrap from 'focus-trap-react';

export function CustomerProfilePage() {
  const [userData, setUserData] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasOrderUpdates, setHasOrderUpdates] = useState(false);
  const prevOrdersRef = React.useRef<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAddressObj, setEditAddressObj] = useState({ houseNo: "", street: "", city: "", state: "", pincode: "" });
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [acknowledging, setAcknowledging] = useState<number | null>(null);
  const [queries, setQueries] = useState<any[]>([]);
  const [isQueryModalOpen, setIsQueryModalOpen] = useState(false);
  const [querySubject, setQuerySubject] = useState('');
  const [queryMessage, setQueryMessage] = useState('');
  const [queryAuthor, setQueryAuthor] = useState<any>(null);
  const [queryAuthorId, setQueryAuthorId] = useState<number | null>(null);
  const [isSubmittingQuery, setIsSubmittingQuery] = useState(false);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [isReplying, setIsReplying] = useState<{ [key: string]: boolean }>({});
  const navigate = useNavigate();

  const [feedbackModalOpen, setFeedbackModalOpen] = useState<{ itemId: number, title: string } | null>(null);
  const [feedbackCondition, setFeedbackCondition] = useState("Excellent");
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackComments, setFeedbackComments] = useState("");
  const [expandedQueriesOrder, setExpandedQueriesOrder] = useState<number | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(null);

  const fetchProfile = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (res.data.user.role !== "CUSTOMER") {
          navigate(res.data.user.role === "ADMIN" ? "/operations" : "/dashboard");
          return;
        }
        setUserData(res.data.user);
        setEditName(res.data.user.name);
        
        // Try to parse existing address if it follows the checkout format
        let parsed = { houseNo: "", street: res.data.user.address || "", city: "", state: "", pincode: "" };
        if (res.data.user.address && res.data.user.address.includes(' - ')) {
          try {
            const parts = res.data.user.address.split(', ');
            if (parts.length >= 4) {
              parsed.houseNo = parts[0];
              parsed.street = parts[1];
              parsed.city = parts[2];
              const statePin = parts[3].split(' - ');
              parsed.state = statePin[0] || "";
              parsed.pincode = statePin[1] || "";
            }
          } catch(e) {}
        }
        setEditAddressObj(parsed);
        setEditPhone(res.data.user.phone || "");
        
        const newOrders = res.data.customerOrders || [];
        
        // Check for updates
        if (prevOrdersRef.current && JSON.stringify(prevOrdersRef.current) !== JSON.stringify(newOrders)) {
          setHasOrderUpdates(true);
        }
        prevOrdersRef.current = newOrders;
        
        setOrders(newOrders);
        
        // Update selectedOrder if it's currently open
        if (selectedOrder) {
          const updatedOrder = (res.data.customerOrders || []).find((o: any) => o.id === selectedOrder.id);
          if (updatedOrder) setSelectedOrder(updatedOrder);
        }

        setLoading(false);
        fetchQueries();
      })
      .catch(err => {
        console.error(err);
        localStorage.removeItem("token");
        navigate("/login");
      });
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsRefreshing(true);
      try {
        await fetchProfile();
      } finally {
        setTimeout(() => setIsRefreshing(false), 800);
      }
    };
    
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    navigate("/login");
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const fullAddress = editAddressObj.houseNo ? 
        `${editAddressObj.houseNo}, ${editAddressObj.street}, ${editAddressObj.city}, ${editAddressObj.state} - ${editAddressObj.pincode}` 
        : editAddressObj.street;
        
      const res = await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/auth/profile`, 
        { name: editName, address: fullAddress, phone: editPhone },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUserData(res.data);
      setIsEditing(false);
    } catch (err) {
      alert("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  
  const handleCancelOrder = async (orderId: number) => {
    if (cancellingOrderId === orderId) return;
    if (!window.confirm("Are you sure you want to cancel this order? This cannot be undone.")) return;
    try {
      setCancellingOrderId(orderId);
      const token = localStorage.getItem("token");
      await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/orders/${orderId}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Order cancelled successfully");
      setSelectedOrder(null);
      fetchProfile();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to cancel order");
    } finally {
      setCancellingOrderId(null);
    }
  };

  
  const fetchQueries = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/customer/queries`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQueries(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const countWords = (text: string) => text ? text.trim().split(/\s+/).filter(Boolean).length : 0;

  const handleCreateQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!querySubject || !queryMessage) return;
    const wordCount = countWords(queryMessage);
    if (wordCount > 100) {
      alert(`Query message cannot exceed 100 words per message (Current: ${wordCount} words).`);
      return;
    }
    setIsSubmittingQuery(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/customer/queries`, {
        subject: querySubject, message: queryMessage, authorId: queryAuthorId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsQueryModalOpen(false);
      setQuerySubject('');
      setQueryMessage('');
      fetchQueries();
      alert("Query submitted successfully!");
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to submit query");
    } finally {
      setIsSubmittingQuery(false);
    }
  };

  const handleCustomerReply = async (queryId: number) => {
    if (!replyText[queryId]?.trim()) return;
    const wordCount = countWords(replyText[queryId]);
    if (wordCount > 100) {
      alert(`Reply message cannot exceed 100 words per message (Current: ${wordCount} words).`);
      return;
    }
    setIsReplying({ ...isReplying, [queryId]: true });
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/customer/queries/${queryId}/reply`, {
        reply: replyText[queryId]
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReplyText({ ...replyText, [queryId]: '' });
      fetchQueries();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to send reply");
    } finally {
      setIsReplying({ ...isReplying, [queryId]: false });
    }
  };

  const openQueryForOrder = (orderId: number, author: any, bookTitle?: string) => {
    setQuerySubject(`Issue with Order #${orderId}${bookTitle ? ` - ${bookTitle}` : ''}`);
    setQueryMessage('');
    setQueryAuthor(author || null);
    setQueryAuthorId(author?.id || null);
    setIsQueryModalOpen(true);
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackModalOpen) return;
    const itemId = feedbackModalOpen.itemId;
    setAcknowledging(itemId);
    
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/order-items/${itemId}/acknowledge`, {
        condition: feedbackCondition,
        rating: feedbackRating,
        comments: feedbackComments
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeedbackModalOpen(null);
      setFeedbackCondition("Excellent");
      setFeedbackRating(5);
      setFeedbackComments("");
      fetchProfile();
    } catch (err) {
      alert("Failed to acknowledge order");
      console.error(err);
    } finally {
      setAcknowledging(null);
    }
  };

  if (loading) return (
    <main style={{ fontFamily: "var(--font-body)", background: "#fafafa", minHeight: "100vh", padding: "10rem 1.10rem" }}>
      <style>{`@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}.skel{background:linear-gradient(90deg,#eee 25%,#e0e0e0 50%,#eee 75%);background-size:800px 100%;animation:shimmer 1.5s infinite linear;border-radius:4px}`}</style>
      <div style={{ maxWidth: 1300, margin: "0 auto" }}>
        <div className="skel" style={{ width: 220, height: 28, marginBottom: 8 }}></div>
        <div className="skel" style={{ width: 280, height: 14, marginBottom: 40 }}></div>
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "2rem" }} className="profile-grid">
          <div style={{ background: "#fff", border: "1px solid #eaeaea", padding: "2rem" }}>
            <div className="skel" style={{ width: 64, height: 64, borderRadius: "50%", marginBottom: 16 }}></div>
            <div className="skel" style={{ width: "80%", height: 18, marginBottom: 8 }}></div>
            <div className="skel" style={{ width: "60%", height: 14, marginBottom: 24 }}></div>
            <div style={{ borderTop: "1px solid #eaeaea", paddingTop: 16 }}>
              {[1,2,3].map(i => <div key={i} className="skel" style={{ width: "100%", height: 14, marginBottom: 10 }}></div>)}
            </div>
          </div>
          <div style={{ background: "#fff", border: "1px solid #eaeaea" }}>
            <div style={{ padding: "1.5rem", borderBottom: "1px solid #eaeaea" }}>
              <div className="skel" style={{ width: 140, height: 20 }}></div>
            </div>
            {[1,2,3].map(i => (
              <div key={i} style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #f0f0f0", display: "flex", gap: 24 }}>
                <div className="skel" style={{ width: 80, height: 14 }}></div>
                <div className="skel" style={{ width: 100, height: 14 }}></div>
                <div className="skel" style={{ width: 60, height: 14 }}></div>
                <div className="skel" style={{ width: 80, height: 14 }}></div>
                <div className="skel" style={{ width: 90, height: 28, marginLeft: "auto" }}></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );

  return (
    <>

      {/* Blinking Top Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 z-50 overflow-hidden pointer-events-none">
        {isRefreshing && <div className="h-full bg-paa-navy animate-[pulse_0.5s_ease-in-out_infinite] w-full" />}
      </div>

      {/* Query Modal */}
      {isQueryModalOpen && (
        <div className="fixed inset-0 bg-paa-navy/80 backdrop-blur-sm z-[1100] flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full p-6">
            <h2 className="text-xl font-serif text-paa-navy mb-4">Raise a Query</h2>
            
            {queryAuthor && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded">
                <p className="text-sm font-bold text-paa-navy mb-2">Before raising a query, you can contact the author directly:</p>
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-blue-800">{queryAuthor.name}</span>
                  {queryAuthor.whatsapp && (
                    <a href={`https://wa.me/${queryAuthor.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-green-700 flex items-center gap-2 hover:underline">
                      <MessageSquare size={14} /> WhatsApp: {queryAuthor.whatsapp}
                    </a>
                  )}
                  {queryAuthor.email && (
                    <a href={`mailto:${queryAuthor.email}`} className="text-sm font-medium text-blue-700 flex items-center gap-2 hover:underline">
                      <Mail size={14} /> {queryAuthor.email}
                    </a>
                  )}
                  {queryAuthor.phone && !queryAuthor.whatsapp && (
                    <a href={`tel:${queryAuthor.phone}`} className="text-sm font-medium text-gray-700 flex items-center gap-2 hover:underline">
                      <Phone size={14} /> Call: {queryAuthor.phone}
                    </a>
                  )}
                </div>
              </div>
            )}
            
            <FocusTrap focusTrapOptions={{ initialFocus: false, escapeDeactivates: true, clickOutsideDeactivates: true }}>
<form onSubmit={handleCreateQuery} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-paa-navy mb-1">Subject / Order ID *</label>
                <input required type="text" value={querySubject} onChange={e => setQuerySubject(e.target.value)} className="w-full border p-2 text-sm outline-none" placeholder="e.g. Issue with Order #123" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-paa-navy mb-1">Message *</label>
                <textarea required rows={4} value={queryMessage} onChange={e => setQueryMessage(e.target.value)} className="w-full border p-2 text-sm outline-none resize-y" placeholder="Describe your issue..." />
              </div>
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setIsQueryModalOpen(false)} className="flex-1 py-2 bg-gray-200 text-xs font-bold uppercase">Cancel</button>
                <button type="submit" disabled={isSubmittingQuery} className="flex-1 py-2 bg-paa-navy text-white text-xs font-bold uppercase hover:bg-paa-gold hover:text-paa-navy">{isSubmittingQuery ? 'Submitting...' : 'Submit'}</button>
              </div>
            </form>
</FocusTrap>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {feedbackModalOpen && (
        <div className="fixed inset-0 bg-paa-navy/80 backdrop-blur-sm z-[1100] flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-xl font-serif text-paa-navy mb-2">Delivery Feedback</h2>
            <p className="text-sm text-gray-600 mb-6">How was your experience for <span className="font-bold">"{feedbackModalOpen.title}"</span>?</p>
            <FocusTrap focusTrapOptions={{ initialFocus: false, escapeDeactivates: true, clickOutsideDeactivates: true }}>
<form onSubmit={handleFeedbackSubmit} className="space-y-4">
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-paa-navy mb-1">Book Condition *</label>
                  <select required value={feedbackCondition} onChange={e => setFeedbackCondition(e.target.value)} className="w-full border p-2 text-sm outline-none bg-white">
                    <option value="Excellent">Excellent - Mint condition</option>
                    <option value="Good">Good - Minor wear</option>
                    <option value="Average">Average - Noticeable wear</option>
                    <option value="Damaged">Damaged - Creased, torn, or wet</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-paa-navy mb-1">Delivery Speed Rating *</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button type="button" key={star} onClick={() => setFeedbackRating(star)} className={`text-2xl ${feedbackRating >= star ? 'text-yellow-400' : 'text-gray-200'}`}>
                        ★
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-paa-navy mb-1">Delivery Comments (Optional)</label>
                  <textarea rows={3} value={feedbackComments} onChange={e => setFeedbackComments(e.target.value)} className="w-full border p-2 text-sm outline-none resize-y bg-white" placeholder="Tell us about the packaging, delivery time, etc." />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setFeedbackModalOpen(null)} className="flex-1 py-3 bg-gray-200 text-xs font-bold uppercase">Cancel</button>
                <button type="submit" disabled={acknowledging === feedbackModalOpen.itemId} className="flex-1 py-3 bg-paa-navy text-white text-xs font-bold uppercase hover:bg-paa-gold hover:text-paa-navy">
                  {acknowledging === feedbackModalOpen.itemId ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </form>
</FocusTrap>
          </div>
        </div>
      )}


    <main style={{ fontFamily: "var(--font-body)", minHeight: "calc(100vh - 64px)", background: "#fafafa" }} className="px-4 pt-32 pb-8 md:px-6 md:pt-40 md:pb-16">
      <div style={{ maxWidth: 1300, margin: "0 auto", width: "100%" }}>
        
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#555", marginBottom: "0.8rem" }}>My Account</div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.8rem, 3vw, 2.2rem)", fontWeight: 400, color: "#111", lineHeight: 1.2, letterSpacing: "-0.01em" }}>
              Welcome back, <span style={{ fontStyle: "italic", color: "#b44d28" }}>{userData?.name.split(' ')[0]}</span>
            </h1>
          </div>
          <button
            onClick={handleLogout}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "transparent", color: "#555", border: "1px solid #ddd", padding: "0.5rem 1rem", fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 0.2s ease" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#111"; e.currentTarget.style.color = "#111"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#ddd"; e.currentTarget.style.color = "#555"; }}
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "280px minmax(0, 1fr)", gap: "2rem" }} className="profile-grid">
          
          <div>
            <div style={{ background: "#fff", border: "1px solid #eaeaea", padding: "2rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ width: 56, height: 56, background: "#f5f5f5", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
                  <User size={28} color="#111" />
                </div>
                {!isEditing ? (
                  <button onClick={() => setIsEditing(true)} style={{ background: "none", border: "1px solid #ddd", padding: "0.35rem 0.7rem", fontSize: 11, fontWeight: 500, cursor: "pointer", color: "#333", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Edit
                  </button>
                ) : (
                  <button onClick={handleSaveProfile} disabled={saving} style={{ background: "#111", border: "none", padding: "0.35rem 0.7rem", fontSize: 11, fontWeight: 500, cursor: "pointer", color: "#fff", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {saving ? "Saving..." : "Save"}
                  </button>
                )}
              </div>
              
              {!isEditing ? (
                <>
                  <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 400, color: "#111", marginBottom: "0.2rem" }}>{userData?.name}</h2>
                  <div style={{ fontSize: 13, color: "#555", marginBottom: "1.5rem" }}>{userData?.email}</div>
                </>
              ) : (
                <div style={{ marginBottom: "1.5rem" }}>
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} style={{ width: "100%", padding: "0.5rem", border: "none", borderBottom: "1px solid #ddd", marginBottom: "0.5rem", fontSize: 14, fontWeight: 500, outline: "none", background: "transparent" }} placeholder="Your Name" />
                  <div style={{ fontSize: 13, color: "#555" }}>{userData?.email} (Cannot be changed)</div>
                </div>
              )}
              
              <div style={{ borderTop: "1px solid #eaeaea", paddingTop: "1.5rem" }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1rem" }}>Account Details</div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#111", marginBottom: "0.6rem" }}>
                  <span style={{ color: "#555" }}>Role</span>
                  <span style={{ fontWeight: 500 }}>Reader</span>
                </div>
                {isEditing ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", marginBottom: "0.6rem" }}>
                    <span style={{ fontSize: 13, color: "#555" }}>Phone</span>
                    <input type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} style={{ width: "100%", padding: "0.5rem", border: "1px solid #ddd", fontSize: 13, outline: "none" }} placeholder="Your Phone Number" />
                  </div>
                ) : (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#111", marginBottom: "0.6rem" }}>
                    <span style={{ color: "#555" }}>Phone</span>
                    <span style={{ fontWeight: 500 }}>{userData?.phone || "—"}</span>
                  </div>
                )}
                {isEditing ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.6rem" }}>
                    <span style={{ fontSize: 13, color: "#555", fontWeight: 600 }}>Delivery Address</span>
                    <input type="text" value={editAddressObj.houseNo} onChange={(e) => setEditAddressObj({...editAddressObj, houseNo: e.target.value})} style={{ width: "100%", padding: "0.5rem", border: "1px solid #ddd", fontSize: 13, outline: "none" }} placeholder="Building / House No. *" required />
                    <input type="text" value={editAddressObj.street} onChange={(e) => setEditAddressObj({...editAddressObj, street: e.target.value})} style={{ width: "100%", padding: "0.5rem", border: "1px solid #ddd", fontSize: 13, outline: "none" }} placeholder="Street Address *" required />
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <input type="text" value={editAddressObj.city} onChange={(e) => setEditAddressObj({...editAddressObj, city: e.target.value})} style={{ width: "50%", padding: "0.5rem", border: "1px solid #ddd", fontSize: 13, outline: "none" }} placeholder="City *" required />
                      <input type="text" value={editAddressObj.pincode} onChange={(e) => setEditAddressObj({...editAddressObj, pincode: e.target.value.replace(/[^0-9]/g, '')})} maxLength={6} style={{ width: "50%", padding: "0.5rem", border: "1px solid #ddd", fontSize: 13, outline: "none" }} placeholder="PIN Code *" required />
                    </div>
                    <select value={editAddressObj.state} onChange={(e) => setEditAddressObj({...editAddressObj, state: e.target.value})} style={{ width: "100%", padding: "0.5rem", border: "1px solid #ddd", fontSize: 13, outline: "none", background: "#fff" }} required>
                      <option value="" disabled>Select State *</option>
                      {["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Jammu and Kashmir"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                ) : (
                  userData?.address && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#111", marginBottom: "0.6rem" }}>
                      <span style={{ color: "#555" }}>Address</span>
                      <span style={{ fontWeight: 500, textAlign: "right", maxWidth: "60%" }}>{userData.address}</span>
                    </div>
                  )
                )}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#111" }}>
                  <span style={{ color: "#555" }}>Member Since</span>
                  <span style={{ fontWeight: 500 }}>{new Date(userData?.createdAt || Date.now()).getFullYear()}</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div style={{ background: "#fff", border: "1px solid #eaeaea", overflow: "hidden" }}>
              <div style={{ padding: "1.5rem", borderBottom: "1px solid #eaeaea", display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <Package size={16} color="#111" />
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 500, color: "#111", letterSpacing: "-0.01em" }}>Your Orders</h2>
              </div>
              
              {orders.length === 0 ? (
                <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
                  <div style={{ width: 48, height: 48, background: "#f5f5f5", borderRadius: "50%", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
                    <Package size={20} color="#111" />
                  </div>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 400, color: "#111", marginBottom: "0.5rem" }}>No orders placed yet</h3>
                  <p style={{ fontSize: 13, color: "#555", marginBottom: "2rem" }}>Browse our curated selection and find your next read.</p>
                  <Link to="/catalogue" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", border: "1px solid #111", color: "#111", textDecoration: "none", padding: "0.6rem 1.4rem", fontSize: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", transition: "all 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#111"; e.currentTarget.style.color = "#fff"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#111"; }}>
                    Explore Catalogue <ArrowRight size={12} />
                  </Link>
                </div>
              ) : (
                <>
                  <div className="hidden lg:block overflow-x-auto w-full">
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "#fafafa", borderBottom: "1px solid #eaeaea", textAlign: "left" }}>
                          <th style={{ padding: "1rem 1.5rem", fontSize: 11, fontWeight: 500, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em" }}>Order ID</th>
                          <th style={{ padding: "1rem 1.5rem", fontSize: 11, fontWeight: 500, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em" }}>Date</th>
                          <th style={{ padding: "1rem 1.5rem", fontSize: 11, fontWeight: 500, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em" }}>Total</th>
                          <th style={{ padding: "1rem 1.5rem", fontSize: 11, fontWeight: 500, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em" }}>Status</th>
                          <th style={{ padding: "1rem 1.5rem" }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((o) => {
                          const orderQueries = queries.filter(q => q.subject.includes(o.id.toString()));
                          const isQueriesExpanded = expandedQueriesOrder === o.id;
                          return (
                            <React.Fragment key={o.id}>
                              <tr style={{ background: "#fff", borderBottom: "1px solid #f0f0f0" }}>
                                <td style={{ padding: "1.2rem 1.5rem", fontFamily: "var(--font-mono)", fontSize: 13, color: "#111", fontWeight: 600 }}>
                                  #PAA-{o.id.toString().padStart(4, '0')}
                                </td>
                                <td style={{ padding: "1.2rem 1.5rem", fontSize: 12, color: "#555" }}>
                                  {new Date(o.createdAt).toLocaleDateString()}
                                </td>
                                <td style={{ padding: "1.2rem 1.5rem", fontSize: 13, fontWeight: 600, color: "#111" }}>
                                  ₹{o.amount}
                                </td>
                                <td style={{ padding: "1.2rem 1.5rem" }}>
                                  <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                                    {o.items?.map((item: any, idx: number) => (
                                      <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: "0.2rem", flexDirection: "column" }}>
                                        <span style={{ fontSize: 13, color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }} title={item.book?.title}>
                                          {idx + 1}. {item.book?.title}
                                        </span>
                                        <span style={{ 
                                          color: item.status.includes('Pending') ? '#b44d28' : item.status === 'Completed' ? '#2e7d32' : item.status === 'Rejected' ? '#c62828' : '#1565c0', 
                                          fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em"
                                        }}>
                                          {item.status}
                                        </span>
                                        {item.status === 'Rejected' && item.rejectionReason && (
                                          <div style={{ marginTop: "0.1rem", fontSize: 10, color: "#c62828", fontStyle: "italic" }}>Reason: {item.rejectionReason}</div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </td>
                                <td style={{ padding: "1.2rem 1.5rem", verticalAlign: "middle", textAlign: "right", display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                                  {orderQueries.length > 0 && (
                                    <button 
                                      onClick={() => setExpandedQueriesOrder(isQueriesExpanded ? null : o.id)} 
                                      style={{ background: isQueriesExpanded ? "#f5f5f5" : "#fff", border: "1px solid #ddd", color: "#111", padding: "0.45rem 0.9rem", fontSize: 11, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.05em", transition: "all 0.2s" }}
                                    >
                                      {isQueriesExpanded ? 'Hide Query' : 'View Query'}
                                    </button>
                                  )}
                                  {o.items?.some((i: any) => i.status === 'Dispatched') && (
                                    <button onClick={() => {
                                      const item = o.items.find((i: any) => i.status === 'Dispatched');
                                      setFeedbackModalOpen({ itemId: item.id, title: `Package from ${item.book?.author?.name || 'Author'}` });
                                    }} style={{ background: "#166534", border: "1px solid #166534", color: "#fff", padding: "0.45rem 0.9rem", fontSize: 11, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.05em", transition: "all 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#14532d"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "#166534"; }}>
                                      <Check size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-top' }} /> I Received This
                                    </button>
                                  )}
                                  {o.items?.some((i: any) => i.status === 'Delivered') && (
                                    <button onClick={() => {
                                      const item = o.items.find((i: any) => i.status === 'Delivered');
                                      window.location.href = `/book/${item.bookId}#reviews`;
                                    }} style={{ background: "#d97706", border: "1px solid #d97706", color: "#fff", padding: "0.45rem 0.9rem", fontSize: 11, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.05em", transition: "all 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#b45309"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "#d97706"; }}>
                                      <Star size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-top' }} /> Write Review
                                    </button>
                                  )}
                                  <button onClick={() => setSelectedOrder(o)} style={{ background: "transparent", border: "1px solid #111", color: "#111", padding: "0.45rem 0.9rem", fontSize: 11, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.05em", transition: "all 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#111"; e.currentTarget.style.color = "#fff"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#111"; }}>View Details</button>
                                </td>
                              </tr>
                              {isQueriesExpanded && orderQueries.length > 0 && (
                                <tr>
                                  <td colSpan={5} style={{ padding: "1.5rem", background: "#fafafa", borderBottom: "1px solid #eaeaea" }}>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                      {orderQueries.map((q, idx) => (
                                        <div key={idx} style={{ padding: "1.5rem", background: "#fff", border: "1px solid #eaeaea", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.8rem", alignItems: "flex-start" }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                              <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", padding: "0.2rem 0.6rem", background: q.status === 'Resolved' ? '#dcfce7' : q.status === 'Answered' ? '#dbeafe' : '#ffedd5', color: q.status === 'Resolved' ? '#166534' : q.status === 'Answered' ? '#1e40af' : '#9a3412', borderRadius: "10px" }}>
                                                #TKT-{q.id.toString().padStart(4, '0')}
                                              </span>
                                              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#111", lineHeight: 1.4 }}>{q.subject}</h4>
                                            </div>
                                            <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", padding: "0.2rem 0.6rem", background: q.status === 'Resolved' ? '#dcfce7' : q.status === 'Answered' ? '#dbeafe' : '#ffedd5', color: q.status === 'Resolved' ? '#166534' : q.status === 'Answered' ? '#1e40af' : '#9a3412', borderRadius: "10px", flexShrink: 0, whiteSpace: "nowrap", marginLeft: "1rem" }}>{q.status === 'Resolved' ? 'Closed' : q.status === 'Answered' ? 'Opened' : 'New'}</span>
                                          </div>
                                          <QueryThreadDisplay query={q} currentUserType="Customer" />
                                          
                                          {q.status !== 'Resolved' && (
                                            <div className="mt-4 flex gap-2">
                                              <textarea 
                                                value={replyText[q.id] || ''} 
                                                onChange={e => setReplyText({ ...replyText, [q.id]: e.target.value })} 
                                                placeholder="Add a reply..." 
                                                className="flex-1 border p-2 text-sm outline-none resize-y"
                                                rows={2}
                                              />
                                              <button 
                                                onClick={() => handleCustomerReply(q.id)} 
                                                disabled={isReplying[q.id]}
                                                className="bg-paa-navy text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-paa-gold hover:text-paa-navy transition-colors shrink-0 disabled:opacity-50"
                                              >
                                                {isReplying[q.id] ? 'Sending...' : 'Reply'}
                                              </button>
                                            </div>
                                          )}
                                          
                                          <div style={{ fontSize: 11, color: "#999", marginTop: "1rem", textAlign: "right" }}>{new Date(q.createdAt).toLocaleString()}</div>
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile View (Cards) */}
                  <div className="lg:hidden flex flex-col gap-4 p-4 bg-gray-50/30">
                    {orders.map((o) => {
                      const orderQueries = queries.filter(q => q.subject.includes(o.id.toString()));
                      const isQueriesExpanded = expandedQueriesOrder === o.id;

                      return (
                        <div key={o.id} className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col gap-3 shadow-sm">
                          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <div>
                              <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Order ID</div>
                              <div className="font-mono text-sm font-bold text-paa-navy">#PAA-{o.id.toString().padStart(4, '0')}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Date</div>
                              <div className="text-sm font-bold text-paa-navy">{new Date(o.createdAt).toLocaleDateString()}</div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-3">
                            {o.items?.map((item: any, idx: number) => (
                              <div key={item.id} className="flex justify-between items-start gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <span className="text-xs font-medium text-paa-navy leading-tight flex-1">
                                  {idx + 1}. {item.book?.title}
                                </span>
                                <div className="flex flex-col items-end">
                                  <span style={{ 
                                    color: item.status.includes('Pending') ? '#b44d28' : item.status === 'Completed' ? '#2e7d32' : item.status === 'Rejected' ? '#c62828' : '#1565c0', 
                                  }} className="text-[10px] font-bold uppercase tracking-widest text-right">
                                    {item.status}
                                  </span>
                                  {item.status === 'Rejected' && item.rejectionReason && (
                                    <div className="text-[9px] text-red-600 italic text-right mt-1">Reason: {item.rejectionReason}</div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="flex flex-wrap justify-between items-center gap-2 mt-2 pt-3 border-t border-gray-100">
                            <div className="text-sm font-bold text-paa-navy">Total: ₹{o.amount}</div>
                            <div className="flex flex-wrap gap-2 justify-end w-full sm:w-auto">
                              {orderQueries.length > 0 && (
                                <button
                                  onClick={() => setExpandedQueriesOrder(isQueriesExpanded ? null : o.id)}
                                  className="bg-white border border-gray-300 text-gray-900 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors hover:bg-gray-100"
                                >
                                  {isQueriesExpanded ? 'Hide Query' : 'View Query'}
                                </button>
                              )}
                              {o.items?.some((i: any) => i.status === 'Dispatched') && (
                                <button onClick={() => {
                                  const item = o.items.find((i: any) => i.status === 'Dispatched');
                                  setFeedbackModalOpen({ itemId: item.id, title: `Package from ${item.book?.author?.name || 'Author'}` });
                                }} className="bg-green-700 text-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors hover:bg-green-800">
                                  <Check size={12} className="inline mr-1 -mt-0.5" /> Received
                                </button>
                              )}
                              {o.items?.some((i: any) => i.status === 'Delivered') && (
                                <button onClick={() => {
                                  const item = o.items.find((i: any) => i.status === 'Delivered');
                                  window.location.href = `/book/${item.bookId}#reviews`;
                                }} className="bg-amber-600 text-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors hover:bg-amber-700">
                                  <Star size={12} className="inline mr-1 -mt-0.5" /> Review
                                </button>
                              )}
                              <button onClick={() => setSelectedOrder(o)} className="bg-transparent border border-paa-navy text-paa-navy px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors hover:bg-paa-navy hover:text-white">View Details</button>
                            </div>
                          </div>

                          {/* Expanded Mobile Query Threads */}
                          {isQueriesExpanded && orderQueries.length > 0 && (
                            <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs flex flex-col gap-3">
                              {orderQueries.map((q, idx) => (
                                <div key={idx} className="p-3 bg-white border border-gray-200 rounded-lg shadow-2xs">
                                  <div className="flex justify-between items-start mb-2 gap-2">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${q.status === 'Resolved' ? 'bg-green-100 text-green-800' : q.status === 'Answered' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                                        #TKT-{q.id.toString().padStart(4, '0')}
                                      </span>
                                      <h4 className="font-bold text-gray-900 text-xs">{q.subject}</h4>
                                    </div>
                                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${q.status === 'Resolved' ? 'bg-green-100 text-green-800' : q.status === 'Answered' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                                      {q.status === 'Resolved' ? 'Closed' : q.status === 'Answered' ? 'Opened' : 'New'}
                                    </span>
                                  </div>

                                  <QueryThreadDisplay query={q} currentUserType="Customer" />

                                  {q.status !== 'Resolved' && (
                                    <div className="mt-3 flex flex-col gap-2">
                                      <textarea
                                        value={replyText[q.id] || ''}
                                        onChange={e => setReplyText({ ...replyText, [q.id]: e.target.value })}
                                        placeholder="Add a reply..."
                                        className="w-full border p-2 text-xs outline-none rounded resize-y"
                                        rows={2}
                                      />
                                      <button
                                        onClick={() => handleCustomerReply(q.id)}
                                        disabled={isReplying[q.id]}
                                        className="bg-paa-navy text-white px-3 py-1.5 text-xs font-bold uppercase tracking-widest hover:bg-paa-gold hover:text-paa-navy transition-colors rounded disabled:opacity-50 self-end"
                                      >
                                        {isReplying[q.id] ? 'Sending...' : 'Reply'}
                                      </button>
                                    </div>
                                  )}
                                  <div className="text-[10px] text-gray-400 mt-2 text-right">{new Date(q.createdAt).toLocaleString()}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>



        </div>
      </div>      {selectedOrder && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
          <div style={{ background: "#fff", border: "1px solid #ddd", width: "100%", maxWidth: 1200, padding: "1.5rem md:2.5rem", maxHeight: "90vh", overflowY: "auto", margin: "0 auto" }} className="p-4 md:p-10">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", borderBottom: "1px solid #eaeaea", paddingBottom: "1rem" }}>
              <h2 style={{ fontSize: 20, fontWeight: 400, color: "#111", fontFamily: "var(--font-display)" }}>Order Details</h2>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1rem" }}>
                {(() => {
                  const canCancel = selectedOrder.items?.length > 0 && !selectedOrder.items.some((i: any) => {
                    const s = (i.status || '').trim().toLowerCase();
                    return ['dispatched', 'shipped', 'completed', 'delivered', 'cancelled', 'rejected'].includes(s);
                  });
                  if (!canCancel) return null;
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                       <span style={{ fontSize: 10, color: "#777", fontStyle: "italic", maxWidth: 120, lineHeight: 1.2, textAlign: "right" }}>Cannot cancel once dispatched.</span>
                       <button 
                         onClick={() => handleCancelOrder(selectedOrder.id)} 
                         disabled={cancellingOrderId === selectedOrder.id}
                         style={{ 
                           background: "transparent", 
                           color: "#c62828", 
                           border: "1px solid #c62828", 
                           padding: "0.4rem 0.8rem", 
                           fontSize: 11, 
                           fontWeight: 500, 
                           cursor: cancellingOrderId === selectedOrder.id ? "not-allowed" : "pointer", 
                           textTransform: "uppercase", 
                           letterSpacing: "0.05em",
                           opacity: cancellingOrderId === selectedOrder.id ? 0.5 : 1
                         }}>
                           {cancellingOrderId === selectedOrder.id ? "Cancelling..." : "Cancel Order"}
                       </button>
                    </div>
                  );
                })()}
                <button onClick={() => setSelectedOrder(null)} style={{ background: "none", border: "none", fontSize: 28, cursor: "pointer", color: "#777", padding: "0 0.5rem" }}>&times;</button>
              </div>
            </div>
            
            <div style={{ marginBottom: "2rem", padding: "1.5rem", background: "#fafafa", border: "1px solid #eaeaea" }}>
              <p style={{ margin: "0 0 0.6rem 0", fontSize: 13, color: "#111" }}><strong>Order ID:</strong> <span style={{ fontFamily: "var(--font-mono)" }}>#PAA-{selectedOrder.id.toString().padStart(4, '0')}</span></p>
              <p style={{ margin: "0 0 0.6rem 0", fontSize: 13, color: "#111" }}><strong>Date:</strong> {new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
              <p style={{ margin: "0 0 0.6rem 0", fontSize: 13, color: "#111" }}><strong>Total Amount:</strong> ₹{selectedOrder.amount}</p>
              <p style={{ margin: "0", fontSize: 13, color: "#111" }}><strong>Delivery Address:</strong> {selectedOrder.address || userData?.address}</p>
            </div>
            
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 400, color: "#111", marginBottom: "1.2rem" }}>Author Packages</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {Object.values(selectedOrder.items?.reduce((acc: any, item: any) => {
                const authorId = item.book?.authorId || 'unknown';
                if (!acc[authorId]) {
                  acc[authorId] = { author: item.book?.author, status: item.status, trackingNumber: item.trackingNumber, items: [], authorId };
                }
                acc[authorId].items.push(item);
                return acc;
              }, {}) || {}).map((group: any, idx: number) => (
                <div key={idx} style={{ border: "1px solid #eaeaea", padding: "1.5rem", background: "#fff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
                    <div>
                      <h4 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 500, color: "#111", marginBottom: "0.2rem" }}>Package from {group.author?.name || 'Author'}</h4>
                    </div>
                    <span style={{ 
                      color: group.status.includes('Pending') ? '#b44d28' : group.status === 'Completed' ? '#2e7d32' : '#1565c0', 
                      fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em"
                    }}>
                      {group.status}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
                    {group.items.map((item: any) => {
                      const allBooks = [
                        ...(fictionData.fiction_catalogue || []).flatMap((a: any) => a.books || []),
                        ...(nonFictionData.non_fiction_catalogue || []).flatMap((a: any) => a.books || [])
                      ];
                      const matchedBook = allBooks.find(b => b.title === item.book?.title);
                      return (
                        <div key={item.id} className="flex gap-4 p-4 border border-gray-100 rounded bg-gray-50 items-start">
                          {matchedBook && matchedBook.cover_image_url ? (
                            <img src={matchedBook.cover_image_url} alt={item.book?.title} className="w-16 h-24 object-cover rounded shadow-sm border border-gray-200 shrink-0" />
                          ) : (
                            <div className="w-16 h-24 bg-gray-200 rounded shadow-sm border border-gray-300 flex items-center justify-center shrink-0">
                              <BookOpen size={20} className="text-gray-400" />
                            </div>
                          )}
                          <div className="flex flex-col h-full justify-between">
                            <div>
                              {matchedBook ? (
                                <Link to={`/book/${matchedBook.id}`} className="text-sm font-bold text-gray-800 hover:text-blue-600 transition-colors leading-snug line-clamp-2" target="_blank">{item.book?.title}</Link>
                              ) : (
                                <span className="text-sm font-bold text-gray-800 leading-snug line-clamp-2">{item.book?.title}</span>
                              )}
                              <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-medium">Qty: {item.quantity}</div>
                            </div>
                            <div className="text-sm font-bold text-paa-navy mt-2">₹{(item.book?.mrp || 0) * item.quantity}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
 
                  <OrderFulfillmentTimeline currentStatus={group.status} trackingNumber={group.trackingNumber} />
 
                  <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px dashed #ddd", display: "flex", flexWrap: "wrap", gap: "1rem", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 500, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.6rem" }}>Contact Author</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                        {group.author?.whatsapp && (
                          <a href={`https://wa.me/${group.author.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "#2e7d32", textDecoration: "none", fontSize: 12, fontWeight: 500, background: "#f1f8e9", padding: "0.4rem 0.8rem", border: "1px solid #c5e1a5" }}>
                            <MessageSquare size={13} /> WhatsApp: {group.author.whatsapp}
                          </a>
                        )}
                        {group.author?.email && (
                          <a href={`mailto:${group.author.email}`} style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "#1565c0", textDecoration: "none", fontSize: 12, fontWeight: 500, background: "#e3f2fd", padding: "0.4rem 0.8rem", border: "1px solid #90caf9" }}>
                            <Mail size={13} /> {group.author.email}
                          </a>
                        )}
                        {group.author?.phone && !group.author?.whatsapp && (
                          <a href={`tel:${group.author.phone}`} style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "#333", textDecoration: "none", fontSize: 12, fontWeight: 500, background: "#f5f5f5", padding: "0.4rem 0.8rem", border: "1px solid #e0e0e0" }}>
                            <Phone size={13} /> Call: {group.author.phone}
                          </a>
                        )}
                      </div>
                    </div>
 
                      <div className="flex flex-wrap gap-2">
                        {group.status === 'Dispatched' && group.items.length > 0 && (
                          <button 
                            onClick={() => setFeedbackModalOpen({ itemId: group.items[0].id, title: `Package from ${group.author?.name || 'Author'}` })}
                            disabled={acknowledging === group.items[0].id}
                            style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "#2e7d32", color: "#fff", border: "none", padding: "0.6rem 1.2rem", fontSize: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer", opacity: acknowledging === group.items[0].id ? 0.7 : 1 }}
                          >
                            <Check size={14} strokeWidth={2.5} /> I Received This
                          </button>
                        )}
                        {!queries.some(q => q.subject === `Issue with Order #${selectedOrder.id} - Package from ${group.author?.name}` && q.status !== 'Resolved') && (
                          <button onClick={() => { setSelectedOrder(null); openQueryForOrder(selectedOrder.id, group.author, `Package from ${group.author?.name}`); }} style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "transparent", color: "#c62828", border: "1px solid #c62828", padding: "0.5rem 1rem", fontSize: 11, fontWeight: 500, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em" }}><MessageSquare size={13} /> Report Issue / Late Delivery</button>
                        )}
                      </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .profile-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
    </>
  );
}
