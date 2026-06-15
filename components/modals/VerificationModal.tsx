import React, { useState } from 'react';
import Modal from './Modal';
import CustomSelect from '../CustomSelect';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: () => void;
}

export default function VerificationModal({ isOpen, onClose, userId, onSuccess }: VerificationModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nid_type: 'National ID',
    description: ''
  });
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please upload a document photo or scan.');
      return;
    }

    setLoading(true);

    try {
      // 1. Upload to uiunest bucket -> [userId]/verifications folder (required for Storage RLS!)
      const ext = file.name.split('.').pop();
      const filePath = `${userId}/verifications/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('uiunest')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw new Error('Storage Upload: ' + uploadError.message);

      // 2. Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('uiunest')
        .getPublicUrl(filePath);

      const documentPath = publicUrlData.publicUrl;

      // 3. Insert row into verifications
      const { error: insertError } = await supabase
        .from('verifications')
        .insert({
          user_id: userId,
          nid_type: formData.nid_type,
          document_path: documentPath,
          description: formData.description
        });

      if (insertError) throw new Error('Database Insert: ' + insertError.message);

      toast.success('Verification submitted! An admin will review it shortly.');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit verification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Submit Identity Verification">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0' }}>
        
        <div style={{ backgroundColor: 'var(--surface-hover)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <h4 style={{ margin: '0 0 8px 0', color: 'var(--navy)', fontSize: '15px' }}>Why is this required?</h4>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--gray)' }}>
            To keep UIUNest safe, everyone must verify their identity before creating listings or communicating with landlords. Your documents are securely stored and only accessible by administrators.
          </p>
        </div>

        <div className="form-group">
          <label>Document Type *</label>
          <CustomSelect
            value={formData.nid_type}
            onChange={(v) => setFormData({ ...formData, nid_type: v })}
            options={[
              { value: 'National ID', label: 'National ID Card' },
              { value: 'Passport', label: 'Passport' },
              { value: 'Driving License', label: 'Driving License' }
            ]}
          />
        </div>

        <div className="form-group">
          <label>Upload Document (Photo/Scan) *</label>
          <div style={{ 
            border: '2px dashed var(--border)', 
            borderRadius: 'var(--radius-lg)', 
            padding: '24px', 
            textAlign: 'center',
            backgroundColor: 'var(--surface)',
            cursor: 'pointer'
          }}>
            <input 
              type="file" 
              accept="image/*,.pdf" 
              onChange={e => setFile(e.target.files?.[0] || null)}
              required
              style={{ display: 'block', margin: '0 auto' }}
            />
            {file && <p style={{ marginTop: '12px', fontSize: '14px', color: 'var(--success)' }}>Selected: {file.name}</p>}
          </div>
        </div>

        <div className="form-group">
          <label>Additional Information (Optional)</label>
          <textarea 
            className="form-control" 
            placeholder="Any extra details we should know? (e.g. Back side of NID is included in a merged PDF)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            style={{ width: '100%', resize: 'vertical' }}
          ></textarea>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn btn-gold" disabled={loading}>
            {loading ? 'Uploading...' : 'Submit Verification'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
