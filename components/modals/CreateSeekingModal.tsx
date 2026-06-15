'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Modal from './Modal';
import type { Zone } from '@/types';
import { createSeekingSchema } from '@/lib/schemas';
import CustomSelect from '@/components/CustomSelect';

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
                { value: 'any', label: 'Any' },
                { value: 'single_room', label: 'Single Room' },
                { value: 'shared_room', label: 'Shared Room' },
                { value: 'full_mess', label: 'Full Mess' },
                { value: 'sublet', label: 'Sublet' }
              ]}
            />
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
            <CustomSelect
              name="preferred_gender"
              value={formData.preferred_gender}
              onChange={val => setFormData({...formData, preferred_gender: val})}
              options={[
                { value: 'any', label: 'Any / Don\'t Care' },
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' }
              ]}
            />
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
