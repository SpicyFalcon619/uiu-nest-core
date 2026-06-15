import React, { useState } from 'react';
import Modal from './Modal';
import { ZoomIn, ZoomOut, Download } from 'lucide-react';

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentUrl: string | null;
  documentType?: string; // e.g., 'National ID', 'Passport'
}

export default function DocumentViewerModal({ isOpen, onClose, documentUrl, documentType = 'Document' }: DocumentViewerModalProps) {
  const [zoom, setZoom] = useState(100);

  if (!isOpen || !documentUrl) return null;

  const isImage = documentUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i);
  const isPdf = documentUrl.match(/\.(pdf)$/i);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 20, 300));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 20, 10));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`View ${documentType}`} maxWidth="800px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 0' }}>
        
        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--surface-hover)', padding: '12px 16px', borderRadius: 'var(--radius)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button type="button" onClick={handleZoomOut} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--navy)', display: 'flex' }}>
              <ZoomOut size={20} />
            </button>
            
            <input 
              type="range" 
              min="10" 
              max="300" 
              value={zoom} 
              onChange={(e) => setZoom(Number(e.target.value))}
              style={{ width: '150px' }}
            />
            
            <button type="button" onClick={handleZoomIn} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--navy)', display: 'flex' }}>
              <ZoomIn size={20} />
            </button>
            
            <span style={{ fontSize: '14px', fontWeight: 600, minWidth: '48px', color: 'var(--navy)' }}>{zoom}%</span>
          </div>

          <a href={documentUrl} target="_blank" rel="noreferrer" download className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={16} /> Open/Download
          </a>
        </div>

        {/* Viewer Container */}
        <div style={{ 
          border: '1px solid var(--border)', 
          borderRadius: 'var(--radius-lg)', 
          height: '600px', 
          overflow: 'auto',
          backgroundColor: '#e5e7eb', // subtle gray background for contrast
          display: 'flex',
          justifyContent: zoom <= 100 ? 'center' : 'flex-start',
          alignItems: zoom <= 100 ? 'center' : 'flex-start'
        }}>
          {isImage ? (
            <img 
              src={documentUrl} 
              alt="Verification Document" 
              style={{ 
                width: `${zoom}%`, 
                height: 'auto', 
                transition: 'width 0.2s ease-out',
                display: 'block'
              }} 
            />
          ) : isPdf ? (
            <iframe 
              src={`${documentUrl}#zoom=${zoom}`} 
              style={{ width: '100%', height: '100%', border: 'none' }} 
              title="PDF Document"
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray)' }}>
              <p>Preview not available for this file type.</p>
              <a href={documentUrl} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ marginTop: '16px' }}>Download to View</a>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
