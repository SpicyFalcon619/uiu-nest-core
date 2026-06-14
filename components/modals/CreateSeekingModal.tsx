'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Modal from './Modal';
import type { Zone } from '@/types';
import { createSeekingSchema } from '@/lib/schemas';

interface CreateSeekingModalProps {
  isOpen: boolean;
  onClose: () => void;
  zones: Zone[];
  onSuccess?: () => void;
}

export default function CreateSeekingModal({ isOpen, onClose, zones, onSuccess }: CreateSeekingModalProps) {
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    zone_id: '',
    budget_min: '',
    budget_max: '',
    property_type: 'single_room',
    preferred_gender: 'any',
    move_in_date: '',
    requirements: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const validation = createSeekingSchema.safeParse({
      ...formData,
      budget_min: Number(formData.budget_min),
      budget_max: Number(formData.budget_max)
    });

    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error('You must be logged in to post.');
      setLoading(false);
      return;
    }

    const { error: submitError } = await supabase.from('seeking_posts').insert({
      user_id: user.id,
      zone_id: parseInt(formData.zone_id),
      budget_min: validation.data.budget_min,
      budget_max: validation.data.budget_max,
      property_type: formData.property_type,
      preferred_gender: formData.preferred_gender,
      move_in_date: formData.move_in_date || null,
      requirements: formData.requirements,
      status: 'active'
    });

    if (submitError) {
      toast.error(submitError.message);
      setLoading(false);
      return;
    }

    toast.success('Seeking post created successfully!');
    setLoading(false);
    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Seeking Post" maxWidth="600px">
      <form onSubmit={handleSubmit}>
        
        <div className="grid-2">
          <div className="form-group">
            <label>Looking for in</label>
            <div className="custom-select-wrapper">
              <select value={formData.zone_id} onChange={e => setFormData({...formData, zone_id: e.target.value})} required>
                <option value="">Select Zone...</option>
                {zones.map(z => (
                  <option key={z.zone_id} value={z.zone_id}>{z.zone_name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Property Type</label>
            <div className="custom-select-wrapper">
              <select value={formData.property_type} onChange={e => setFormData({...formData, property_type: e.target.value})} required>
                <option value="any">Any</option>
                <option value="single_room">Single Room</option>
                <option value="shared_room">Shared Room</option>
                <option value="full_mess">Full Mess</option>
                <option value="sublet">Sublet</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="grid-2">
          <div className="form-group">
            <label>Min Budget (৳)</label>
            <input type="number" value={formData.budget_min} onChange={e => setFormData({...formData, budget_min: e.target.value})} required min="0" />
          </div>
          <div className="form-group">
            <label>Max Budget (৳)</label>
            <input type="number" value={formData.budget_max} onChange={e => setFormData({...formData, budget_max: e.target.value})} required min="1" />
          </div>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label>Preferred Gender</label>
            <div className="custom-select-wrapper">
              <select value={formData.preferred_gender} onChange={e => setFormData({...formData, preferred_gender: e.target.value})} required>
                <option value="any">Any / Don't Care</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Approx. Move-in Date</label>
            <input type="date" value={formData.move_in_date} onChange={e => setFormData({...formData, move_in_date: e.target.value})} />
          </div>
        </div>
        
        <div className="form-group">
          <label>Requirements / Notes (Optional)</label>
          <textarea 
            value={formData.requirements} 
            onChange={e => setFormData({...formData, requirements: e.target.value})} 
            placeholder="e.g. Non-smoker, quiet environment, attached bath preferred..." 
            rows={3}
          ></textarea>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Posting...' : 'Post Seeking Ad'}</button>
        </div>
      </form>
    </Modal>
  );
}
