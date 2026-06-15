'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Modal from './Modal';
import type { Zone } from '@/types';
import CustomSelect from '@/components/CustomSelect';

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
            <CustomSelect
              name="zone_id"
              value={formData.zone_id}
              onChange={val => setFormData({...formData, zone_id: val})}
              options={[
                { value: '', label: 'Select Zone...' },
                ...zones.map(z => ({ value: z.zone_id.toString(), label: z.zone_name }))
              ]}
            />
          </div>
          <div className="form-group">
            <label>Property Type</label>
            <CustomSelect
              name="property_type"
              value={formData.property_type}
              onChange={val => setFormData({...formData, property_type: val})}
              options={[
                { value: 'single_room', label: 'Single Room' },
                { value: 'shared_room', label: 'Shared Room' },
                { value: 'full_mess', label: 'Full Mess' },
                { value: 'sublet', label: 'Sublet' }
              ]}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Address</label>
          <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required />
        </div>
        
        <div className="grid-2">
          <div className="form-group">
            <label>Status</label>
            <CustomSelect
              name="status"
              value={formData.status}
              onChange={val => setFormData({...formData, status: val})}
              options={[
                { value: 'available', label: 'Available' },
                { value: 'occupied', label: 'Occupied' },
                { value: 'soon_vacant', label: 'Soon Vacant' }
              ]}
            />
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
