'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Modal from './Modal';
import type { Zone } from '@/types';
import { createListingSchema } from '@/lib/schemas';
import CustomSelect from '@/components/CustomSelect';

interface CreateListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateListingModal({ isOpen, onClose, onSuccess }: CreateListingModalProps) {
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
    base_rent: '',
    description: ''
  });

  useEffect(() => {
    if (isOpen && zones.length === 0) {
      const fetchZones = async () => {
        const supabase = createClient();
        const { data } = await supabase.from('zones').select('*').order('zone_name');
        if (data) setZones(data);
      };
      fetchZones();
    }
  }, [isOpen, zones.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const validation = createListingSchema.safeParse({
      ...formData,
      total_rooms: Number(formData.total_rooms),
      base_rent: Number(formData.base_rent)
    });

    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error('You must be logged in.');
      setLoading(false);
      return;
    }

    // Basic insert (assuming default coordinates for now, or you'd use a map picker)
    const { data: listing, error: submitError } = await supabase.from('listings').insert({
      user_id: user.id,
      title: formData.title,
      address: formData.address,
      zone_id: parseInt(formData.zone_id),
      property_type: formData.property_type,
      listing_type: formData.listing_type,
      gender_pref: formData.gender_pref,
      total_rooms: formData.total_rooms,
      description: formData.description,
      lat: 23.797900, // Default to UIU for now
      lng: 90.449700,
      status: 'available'
    }).select().single();

    if (submitError) {
      toast.error(submitError.message);
      setLoading(false);
      return;
    }

    // Insert utility costs (base rent)
    await supabase.from('utility_costs').insert({
      listing_id: listing.listing_id,
      base_rent: parseFloat(formData.base_rent),
      total_monthly: parseFloat(formData.base_rent) // simplified for now
    });

    // Insert empty amenities
    await supabase.from('listing_amenities').insert({
      listing_id: listing.listing_id
    });

    setLoading(false);
    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Listing" maxWidth="600px">
      <form onSubmit={handleSubmit}>

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
            <label>Base Rent (৳)</label>
            <input type="number" value={formData.base_rent} onChange={e => setFormData({...formData, base_rent: e.target.value})} required />
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
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Create'}</button>
        </div>
      </form>
    </Modal>
  );
}
