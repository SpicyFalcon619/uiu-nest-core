'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Modal from './Modal';
import type { Zone } from '@/types';

interface EditListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: number;
  onSuccess?: () => void;
}

export default function EditListingModal({ isOpen, onClose, listingId, onSuccess }: EditListingModalProps) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    address: '',
    zone_id: '',
    property_type: 'single_room',
    listing_type: 'peer_listing',
    gender_pref: 'any',
    total_rooms: 1,
    status: 'available',
    description: ''
  });

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        const supabase = createClient();
        
        // Fetch Zones
        const { data: zData } = await supabase.from('zones').select('*').order('zone_name');
        if (zData) setZones(zData);

        // Fetch existing listing
        const { data: lData } = await supabase.from('listings').select('*').eq('listing_id', listingId).single();
        if (lData) {
          setFormData({
            title: lData.title,
            address: lData.address,
            zone_id: lData.zone_id.toString(),
            property_type: lData.property_type,
            listing_type: lData.listing_type,
            gender_pref: lData.gender_pref,
            total_rooms: lData.total_rooms,
            status: lData.status,
            description: lData.description || ''
          });
        }
      };
      fetchData();
    }
  }, [isOpen, listingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();

    const { error: submitError } = await supabase.from('listings').update({
      title: formData.title,
      address: formData.address,
      zone_id: parseInt(formData.zone_id),
      property_type: formData.property_type,
      listing_type: formData.listing_type,
      gender_pref: formData.gender_pref,
      total_rooms: formData.total_rooms,
      status: formData.status,
      description: formData.description,
    }).eq('listing_id', listingId);

    setLoading(false);

    if (submitError) {
      setError(submitError.message);
      return;
    }

    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Listing" maxWidth="600px">
      <form onSubmit={handleSubmit}>
        {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}

        <div className="form-group">
          <label>Title</label>
          <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label>Zone</label>
            <div className="custom-select-wrapper">
              <select value={formData.zone_id} onChange={e => setFormData({...formData, zone_id: e.target.value})} required>
                <option value="">Select Zone...</option>
                {zones.map(z => <option key={z.zone_id} value={z.zone_id}>{z.zone_name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Property Type</label>
            <div className="custom-select-wrapper">
              <select value={formData.property_type} onChange={e => setFormData({...formData, property_type: e.target.value})}>
                <option value="single_room">Single Room</option>
                <option value="shared_room">Shared Room</option>
                <option value="full_mess">Full Mess</option>
                <option value="sublet">Sublet</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>Address</label>
          <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required />
        </div>
        
        <div className="grid-2">
          <div className="form-group">
            <label>Status</label>
            <div className="custom-select-wrapper">
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="soon_vacant">Soon Vacant</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Total Rooms</label>
            <input type="number" value={formData.total_rooms} onChange={e => setFormData({...formData, total_rooms: parseInt(e.target.value)})} min={1} required />
          </div>
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3}></textarea>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </form>
    </Modal>
  );
}
