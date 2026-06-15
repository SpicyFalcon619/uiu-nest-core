'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { createBillSchema } from '@/lib/schemas';
import CustomSelect from '@/components/CustomSelect';

export default function CreateBillModal({ 
  myListings, 
  onClose, 
  onSuccess 
}: { 
  myListings: any[];
  onClose: () => void;
  onSuccess: (newBill: any) => void;
}) {
  const [form, setForm] = useState({
    listing_id: myListings.length > 0 ? myListings[0].listing_id || myListings[0].id : '',
    bill_month: '',
    electricity: 0,
    gas: 0,
    water: 0,
    internet: 0,
    other: 0,
  });
  
  const [loading, setLoading] = useState(false);

  const total = Number(form.electricity) + Number(form.gas) + Number(form.water) + Number(form.internet) + Number(form.other);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    
    // First, find how many residents are in this listing to calculate per_person
    const { data: residents } = await supabase
      .from('applications')
      .select('applicant_id, applicant:profiles!applications_applicant_id_fkey(name)')
      .eq('listing_id', form.listing_id)
      .eq('status', 'accepted');
      
    // Including the owner in some cases? Or maybe just applicants
    const residentCount = (residents?.length || 0);
    const perPerson = residentCount > 0 ? total / residentCount : total;

    const validation = createBillSchema.safeParse({
      ...form,
      listing_id: Number(form.listing_id),
      electricity: Number(form.electricity),
      gas: Number(form.gas),
      water: Number(form.water),
      internet: Number(form.internet),
      other: Number(form.other),
      total,
      perPerson
    });

    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      setLoading(false);
      return;
    }

    // Insert bill
    const { data: newBill, error: billError } = await supabase
      .from('monthly_bills')
      .insert({
        listing_id: validation.data.listing_id,
        bill_month: validation.data.bill_month,
        electricity: validation.data.electricity,
        gas: validation.data.gas,
        water: validation.data.water,
        internet: validation.data.internet,
        other: validation.data.other,
        total: validation.data.total,
        per_person: validation.data.perPerson
      })
      .select(`*, listing:listings(title)`)
      .single();

    if (billError) {
      toast.error(billError.message);
      setLoading(false);
      return;
    }

    // Insert payment records for each resident
    let payments: any[] = [];
    if (residents && residents.length > 0) {
      const paymentInserts = residents.map(r => ({
        bill_id: newBill.bill_id,
        resident_user_id: r.applicant_id,
        status: 'unpaid'
      }));
      
      const { data: newPayments } = await supabase
        .from('bill_payments')
        .insert(paymentInserts)
        .select(`*, resident:profiles!bill_payments_resident_user_id_fkey(name)`);
        
      if (newPayments) payments = newPayments;
    }

    toast.success('Bill generated successfully!');
    onSuccess({ ...newBill, payments });
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h3>Generate New Monthly Bill</h3>
          <button className="btn-close" onClick={onClose}><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Select Property</label>
            <CustomSelect
              name="listing_id"
              value={form.listing_id}
              onChange={val => setForm({...form, listing_id: val})}
              options={myListings.length === 0 
                ? [{ value: '', label: 'No active listings found' }]
                : myListings.map(l => ({ value: String(l.listing_id || l.id), label: l.title }))
              }
            />
          </div>

          <div className="form-group">
            <label>Bill Month</label>
            <input 
              type="text" 
              placeholder="e.g. June 2024" 
              value={form.bill_month} 
              onChange={e => setForm({...form, bill_month: e.target.value})} 
              required 
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label>Electricity (BDT)</label>
              <input type="number" min="0" value={form.electricity} onChange={e => setForm({...form, electricity: e.target.value as any})} />
            </div>
            <div className="form-group">
              <label>Gas (BDT)</label>
              <input type="number" min="0" value={form.gas} onChange={e => setForm({...form, gas: e.target.value as any})} />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label>Water (BDT)</label>
              <input type="number" min="0" value={form.water} onChange={e => setForm({...form, water: e.target.value as any})} />
            </div>
            <div className="form-group">
              <label>Internet (BDT)</label>
              <input type="number" min="0" value={form.internet} onChange={e => setForm({...form, internet: e.target.value as any})} />
            </div>
          </div>

          <div className="form-group">
            <label>Other / Maintenance (BDT)</label>
            <input type="number" min="0" value={form.other} onChange={e => setForm({...form, other: e.target.value as any})} />
          </div>

          <div style={{ background: '#f1f5f9', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: 'var(--navy)' }}>Total Calculated Bill:</span>
            <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)' }}>৳ {total}</span>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || myListings.length === 0}>
              {loading ? 'Generating...' : 'Generate Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
