'use client';

import { useState } from 'react';
import { FileText, CheckCircle, CreditCard } from 'lucide-react';
import type { MonthlyBill } from '@/types';
import { fmt } from '@/lib/utils';
import CreateBillModal from '@/components/modals/CreateBillModal';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function BillsContent({ 
  initialBills, 
  role,
  userId,
  myListings
}: { 
  initialBills: MonthlyBill[]; 
  role: string;
  userId: string;
  myListings: any[];
}) {
  const [bills, setBills] = useState<MonthlyBill[]>(initialBills);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handlePay = async (paymentId: number) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('bill_payments')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('payment_id', paymentId);
      
    if (error) {
      toast.error('Failed to process payment');
    } else {
      toast.success('Payment successful!');
      // Update local state
      setBills(bills.map(b => ({
        ...b,
        payments: b.payments.map(p => 
          p.payment_id === paymentId ? { ...p, status: 'paid', paid_at: new Date().toISOString() } : p
        )
      })));
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, color: 'var(--navy)' }}>Monthly Bills Overview</h2>
        {role === 'landlord' && (
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            + Generate New Bill
          </button>
        )}
      </div>

      {bills.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <FileText size={48} color="var(--gray)" style={{ marginBottom: '16px', opacity: 0.5 }} />
          <h3 style={{ color: 'var(--gray)' }}>No bills found</h3>
          {role === 'landlord' && <p style={{ color: 'var(--gray)' }}>Generate a bill for your properties to see them here.</p>}
        </div>
      ) : (
        <div className="grid-2">
          {bills.map(bill => (
            <div key={bill.bill_id || bill.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--navy)' }}>{bill.bill_month || bill.month}</h3>
                  <div style={{ fontSize: '14px', color: 'var(--gray)', marginTop: '4px' }}>
                    {(bill as any).listing?.title}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)' }}>{fmt(bill.total)}</div>
                  <div style={{ fontSize: '12px', color: 'var(--gray)' }}>{fmt(bill.perPerson)} per person</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px', fontSize: '13px' }}>
                <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}>Electricity: {fmt(bill.electricity)}</span>
                <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}>Gas: {fmt(bill.gas)}</span>
                <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}>Water: {fmt(bill.water)}</span>
                <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}>Internet: {fmt(bill.internet)}</span>
                <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}>Other: {fmt(bill.other)}</span>
              </div>

              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>Payment Status</h4>
              <div className="table-responsive" style={{ border: 'none', boxShadow: 'none' }}>
                <table className="table" style={{ fontSize: '13px' }}>
                  <tbody>
                    {bill.payments?.map(p => (
                      <tr key={p.payment_id || p.id}>
                        <td style={{ padding: '8px 0' }}>{(p.resident as any)?.name || p.resident || 'Resident'}</td>
                        <td style={{ padding: '8px 0', textAlign: 'right' }}>
                          {p.status === 'paid' ? (
                            <span style={{ color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                              <CheckCircle size={14} /> Paid
                            </span>
                          ) : (
                            role === 'student' ? (
                              <button 
                                className="btn btn-primary btn-sm" 
                                style={{ padding: '4px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => handlePay(p.payment_id || p.id)}
                              >
                                <CreditCard size={14} /> Pay Now
                              </button>
                            ) : (
                              <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Unpaid</span>
                            )
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateBillModal 
          myListings={myListings}
          onClose={() => setShowCreateModal(false)}
          onSuccess={(newBill) => setBills([newBill, ...bills])}
        />
      )}
    </div>
  );
}
