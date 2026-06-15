export default function Loading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
      <div className="spinner" style={{ 
        width: '48px', 
        height: '48px', 
        border: '4px solid var(--border)', 
        borderTopColor: 'var(--emerald)', 
        borderRadius: '50%', 
        animation: 'spin 1s linear infinite' 
      }}></div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{ fontWeight: 600, color: 'var(--navy)' }}>Loading...</div>
    </div>
  );
}
