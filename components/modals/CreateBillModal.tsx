'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { createBillSchema } from '@/lib/schemas';
import CustomSelect from '@/components/CustomSelect';

export default function CreateBillModal({
  myListings,
  userId,
  onClose,
  onSuccess
}: {
  myListings: any[];
  userId: string;
  onClose: () => void;
  onSuccess: (newBill: any) => void;
}) {
  const hasListings = myListings.length > 0;

  const [form, setForm] = useState({
    listing_id: hasListings ? String(myListings[0].listing_id || myListings[0].id) : '',
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

    let residents: any[] = [];

    if (hasListings && form.listing_id) {
      // Landlord flow: pull accepted residents for the chosen listing
      const { data } = await supabase
        .from('applications')
        .select('applicant_id, applicant:profiles!applications_applicant_id_fkey(name)')
        .eq('listing_id', form.listing_id)
        .eq('status', 'accepted');
      residents = data || [];
    }

    // If no residents found (no listing, or empty listing), bill is for the creator alone
    const residentCount = residents.length > 0 ? residents.length : 1;
    const perPerson = Math.round(total / residentCount);

    const validation = createBillSchema.safeParse({
      ...form,
      listing_id: form.listing_id ? Number(form.listing_id) : null,
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
        ...(validation.data.listing_id ? { listing_id: validation.data.listing_id } : {}),
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

    // Insert payment records
    const paymentInserts = residents.length > 0
      ? residents.map(r => ({ bill_id: newBill.bill_id, resident_user_id: r.applicant_id, status: 'unpaid' }))
      : [{ bill_id: newBill.bill_id, resident_user_id: userId, status: 'unpaid' }];

    const { data: newPayments } = await supabase
      .from('bill_payments')
      .insert(paymentInserts)
      .select(`*, resident:profiles!bill_payments_resident_user_id_fkey(name)`);

    toast.success('Bill generated successfully!');
    onSuccess({ ...newBill, payments: newPayments || [] });
    onClose();
  };

  return (
    <div className="modal-bg open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 520, padding: 36, position: 'relative' }}>
        <button className="modal-close" onClick={onClose} type="button"><X size={18} /></button>
        <h3 style={{ marginBottom: 20 }}>Generate New Monthly Bill</h3>

        <form onSubmit={handleSubmit}>
          {hasListings && (
            <div className="form-group">
              <label>Select Property</label>
              <CustomSelect
                name="listing_id"
                value={form.listing_id}
                onChange={val => setForm({...form, listing_id: val})}
                options={myListings.map(l => ({ value: String(l.listing_id || l.id), label: l.title }))}
              />
            </div>
          )}

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

          <div style={{ background: 'var(--emerald-soft)', padding: '14px 18px', borderRadius: 10, borderLeft: '3px solid var(--emerald)', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: 'var(--ink)' }}>Total Calculated Bill:</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--emerald)' }}>৳ {total.toLocaleString()}</span>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Generating...' : 'Generate Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
