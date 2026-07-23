import React from 'react';
import { Check, Clock, Package, Truck, Home, ThumbsUp, X } from 'lucide-react';

export function OrderFulfillmentTimeline({ currentStatus, trackingNumber }: { currentStatus: string, trackingNumber?: string }) {
  const isRejected = currentStatus === 'Rejected';

  const stages = isRejected ? [
    { id: 'Pending Verification', label: 'Order Placed', icon: <Clock size={14} />, color: '#2e7d32' },
    { id: 'Rejected', label: 'Order Rejected', icon: <X size={14} />, color: '#c62828' }
  ] : [
    { id: 'Pending Verification', label: 'Order Placed', icon: <Clock size={14} />, color: '#10b981' },
    { id: 'Approved', label: 'Payment Verified', icon: <Check size={14} />, color: '#10b981' },
    { id: 'Accepted', label: 'Accepted by Author', icon: <ThumbsUp size={14} />, color: '#10b981' },
    { id: 'Dispatched', label: 'Dispatched', icon: <Package size={14} />, color: '#10b981' },
    { id: 'Completed', label: 'Delivered', icon: <Home size={14} />, color: '#10b981' }
  ];

  const getActiveIndex = () => {
    if (isRejected) return 1;

    const statusNorm = (currentStatus || '').trim().toLowerCase();

    if (['completed', 'delivered'].includes(statusNorm)) {
      return 4; // Delivered
    }
    if (['dispatched', 'shipped'].includes(statusNorm)) {
      return 3; // Dispatched
    }
    if (['accepted', 'author accepted', 'accepted by author'].includes(statusNorm)) {
      return 2; // Accepted by Author
    }
    if (['approved', 'payment verified', 'verified'].includes(statusNorm)) {
      return 1; // Payment Verified
    }
    if (['pending', 'pending verification', 'order placed'].includes(statusNorm)) {
      return 0; // Order Placed
    }

    const exactMatch = stages.findIndex(s => s.id.toLowerCase() === statusNorm);
    if (exactMatch !== -1) return exactMatch;

    return 0;
  };

  const activeIndex = getActiveIndex();
  const themeColor = isRejected ? '#c62828' : '#10b981';

  return (
    <div style={{ padding: '1.5rem', background: '#fff', border: '1px solid #eaeaea', marginTop: '1rem' }}>
      <h4 style={{ fontSize: 13, fontWeight: 500, color: '#111', marginBottom: '1.5rem', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Fulfillment Timeline
      </h4>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
        {/* Progress Bar Background */}
        <div style={{ position: 'absolute', top: 16, left: '6%', right: '6%', height: 2, background: '#eaeaea', zIndex: 1 }} />
        
        {/* Active Progress Bar */}
        <div style={{ 
          position: 'absolute', top: 16, left: '6%', 
          width: `calc(${(activeIndex / (stages.length - 1)) * 88}% )`, 
          height: 2, background: themeColor, zIndex: 2, transition: 'width 0.4s ease' 
        }} />

        {stages.map((stage, idx) => {
          const isActive = idx <= activeIndex;
          const isCurrent = idx === activeIndex;

          let nodeBg = '#fff';
          let nodeBorder = '2px solid #eaeaea';
          let nodeColor = '#aaa';

          if (isActive) {
            nodeBg = isCurrent ? stage.color : '#2e7d32'; // completed stages are green
            nodeBorder = `2px solid ${isCurrent ? stage.color : '#2e7d32'}`;
            nodeColor = '#fff';
          }

          return (
            <div key={stage.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 3, width: `${100 / stages.length}%` }}>
              <div style={{ 
                width: 32, height: 32, borderRadius: '50%', 
                background: nodeBg, 
                border: nodeBorder,
                color: nodeColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '0.75rem',
                transition: 'all 0.3s ease'
              }}>
                {isCurrent && isRejected ? <X size={14} strokeWidth={2.5} /> : (isActive ? <Check size={14} strokeWidth={2.5} /> : stage.icon)}
              </div>
              <span style={{ 
                fontSize: 10, fontWeight: isCurrent ? 600 : 500, 
                color: isCurrent ? '#111' : '#555', 
                textAlign: 'center', lineHeight: 1.2,
                textTransform: 'uppercase',
                letterSpacing: '0.02em'
              }}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      {trackingNumber && !isRejected && (
        <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#fafafa', border: '1px solid #eaeaea', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Package size={16} color="#111" />
          <div>
            <div style={{ fontSize: 11, color: '#555', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tracking Number</div>
            <div style={{ fontSize: 13, color: '#111', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{trackingNumber}</div>
          </div>
        </div>
      )}
    </div>
  );
}
