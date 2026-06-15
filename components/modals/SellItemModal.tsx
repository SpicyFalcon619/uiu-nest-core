'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Modal from './Modal';
import type { Zone } from '@/types';
import { createItemSchema } from '@/lib/schemas';
import CustomSelect from '@/components/CustomSelect';
import { uploadExchangeItemPhoto } from '@/app/actions/upload';

interface SellItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  zones: Zone[];
  onSuccess?: () => void;
}

export default function SellItemModal({ isOpen, onClose, zones, onSuccess }: SellItemModalProps) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    category: 'furniture',
    item_condition: 'good',
    asking_price: '',
    zone_id: '',
    listing_id: '',
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const validation = createItemSchema.safeParse({
      ...formData,
      asking_price: Number(formData.asking_price)
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

    let photo_url = null;
    if (file) {
      try {
        const fileData = new FormData();
        fileData.append('file', file);
        const result = await uploadExchangeItemPhoto(fileData);
        photo_url = result.path;
      } catch (err: any) {
        toast.error('Failed to upload image: ' + err.message);
        setLoading(false);
        return;
      }
    }

    const { error: submitError } = await supabase.from('items').insert({
      seller_id: user.id,
      title: formData.title,
      category: formData.category,
      item_condition: formData.item_condition,
      asking_price: validation.data.asking_price,
      zone_id: parseInt(formData.zone_id),
      description: formData.description,
      status: 'available',
      photo_url: photo_url
      // listing_id could be added here if linked
    });

    if (submitError) {
      toast.error(submitError.message);
      setLoading(false);
      return;
    }

    toast.success('Item listed successfully!');
    setLoading(false);
    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sell an Item" maxWidth="600px">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Title</label>
          <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required placeholder="e.g. Study Table with Drawers" />
        </div>
        
        <div className="grid-2">
          <div className="form-group">
            <label>Category</label>
            <CustomSelect
              name="category"
              value={formData.category}
              onChange={val => setFormData({...formData, category: val})}
              options={[
                { value: 'furniture', label: 'Furniture' },
                { value: 'appliances', label: 'Appliances' },
                { value: 'electronics', label: 'Electronics' },
                { value: 'kitchen', label: 'Kitchen' },
                { value: 'study', label: 'Study' }
              ]}
            />
          </div>
          <div className="form-group">
            <label>Condition</label>
            <CustomSelect
              name="item_condition"
              value={formData.item_condition}
              onChange={val => setFormData({...formData, item_condition: val})}
              options={[
                { value: 'new', label: 'New' },
                { value: 'like_new', label: 'Like New' },
                { value: 'good', label: 'Good' },
                { value: 'fair', label: 'Fair' }
              ]}
            />
          </div>
        </div>
        
        <div className="grid-2">
          <div className="form-group">
            <label>Price (৳)</label>
            <input type="number" value={formData.asking_price} onChange={e => setFormData({...formData, asking_price: e.target.value})} required min="0" />
          </div>
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
        </div>
        
        <div className="form-group">
          <label>Description</label>
          <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required placeholder="Describe the item condition, size, age, etc." rows={3}></textarea>
        </div>
        
        <div className="form-group">
          <label>Item Photo (Optional)</label>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} />
        </div>
        
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Posting...' : 'Post Item for Sale'}</button>
        </div>
      </form>
    </Modal>
  );
}
