'use client';

import { useState } from 'react';
import { FileText, CheckCircle, XCircle, CreditCard, Building2, Calendar, Zap, Flame, Droplets, Wifi, Package, ChevronDown, ChevronRight } from 'lucide-react';
import type { MonthlyBill } from '@/types';
import { fmt } from '@/lib/utils';
import CreateBillModal from '@/components/modals/CreateBillModal';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

function StatusPill({ status }: { status: 'paid' | 'unpaid' }) {
  return status === 'paid'
    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600, fontSize: 12, color: '#166534', background: '#DCFCE7', borderRadius: 20, padding: '3px 10px' }}><CheckCircle size={12} /> Paid</span>
    : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600, fontSize: 12, color: '#BE3D2F', background: '#FEE2E2', borderRadius: 20, padding: '3px 10px' }}><XCircle size={12} /> Unpaid</span>;
}

function CostRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink-mid)' }}>{icon}{label}</span>
      <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{fmt(value)}</span>
    </div>
  );
}

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
  const [expanded, setExpanded] = useState<Set<number>>(new Set([initialBills[0]?.bill_id ?? initialBills[0]?.id]));

  const toggleExpanded = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handlePay = async (paymentId: number) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('bill_payments')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('payment_id', paymentId);

    if (error) {
      toast.error('Failed to process payment');
    } else {
      toast.success('Payment recorded!');
      setBills(bills.map(b => ({
        ...b,
        payments: b.payments.map(p =>
          (p.payment_id || p.id) === paymentId ? { ...p, status: 'paid' as const, paid_at: new Date().toISOString() } : p
        )
      })));
    }
  };

  // Summary stats
  const totalBills = bills.length;
  const myPayments = bills.flatMap(b => b.payments.filter(p => p.resident_user_id === userId || role === 'landlord'));
  const totalOwed = myPayments.reduce((s, p) => s + (p.status === 'unpaid' ? 1 : 0), 0);

  return (
    <div>
      {/* ── Header + action ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', color: 'var(--navy)' }}>Bills Manager</h2>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-muted)' }}>
            {role === 'landlord' ? 'Track utility bills for all your properties.' : 'View and pay your monthly utility bills.'}
          </p>
        </div>
        {role === 'landlord' && (
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>+ Generate Bill</button>
        )}
      </div>

      {/* ── Summary cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        <div className="card" style={{ padding: '16px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--emerald)' }}>{totalBills}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>Total Bills</div>
        </div>
        <div className="card" style={{ padding: '16px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#166534' }}>{myPayments.filter(p => p.status === 'paid').length}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>Payments Made</div>
        </div>
        <div className="card" style={{ padding: '16px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: totalOwed > 0 ? '#BE3D2F' : '#166534' }}>{totalOwed}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>Pending Payments</div>
        </div>
      </div>

      {/* ── Bill list ── */}
      {bills.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <FileText size={48} color="var(--ink-muted)" style={{ marginBottom: 16, opacity: 0.4 }} />
          <h3 style={{ color: 'var(--ink-mid)', marginBottom: 8 }}>No bills yet</h3>
          {role === 'landlord' && (
            <p style={{ color: 'var(--ink-muted)', marginBottom: 20, fontSize: 14 }}>Generate a bill for your properties to get started.</p>
          )}
          {role === 'landlord' && (
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>+ Generate First Bill</button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {bills.map(bill => {
            const id = bill.bill_id ?? bill.id;
            const isOpen = expanded.has(id);
            const paidCount = bill.payments.filter(p => p.status === 'paid').length;
            const totalCount = bill.payments.length;
            const allPaid = totalCount > 0 && paidCount === totalCount;
            const myPayment = bill.payments.find(p => p.resident_user_id === userId);

            return (
              <div key={id} className="card" style={{ padding: 0, overflow: 'hidden', border: allPaid ? '1.5px solid #86efac' : '1px solid var(--border)' }}>
                {/* Collapsed header — always visible */}
                <button
                  onClick={() => toggleExpanded(id)}
                  style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                    {isOpen ? <ChevronDown size={16} color="var(--ink-muted)" /> : <ChevronRight size={16} color="var(--ink-muted)" />}
                    <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 8, background: 'var(--emerald-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Building2 size={16} color="var(--emerald)" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {(bill as any).listing?.title || 'Property'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, fontSize: 12, color: 'var(--ink-muted)' }}>
                        <Calendar size={11} />
                        {bill.bill_month || bill.month}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                    {role === 'student' && myPayment && <StatusPill status={myPayment.status} />}
                    {role === 'landlord' && (
                      <span style={{ fontSize: 12, color: allPaid ? '#166534' : 'var(--ink-muted)', fontWeight: 600 }}>
                        {paidCount}/{totalCount} paid
                      </span>
                    )}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--emerald)' }}>{fmt(bill.total)}</div>
                      {bill.perPerson > 0 && totalCount > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{fmt(bill.perPerson)}/person</div>
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded body */}
                {isOpen && (
                  <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 16 }}>
                      {/* Cost breakdown */}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink-muted)', marginBottom: 8 }}>Breakdown</div>
                        <CostRow icon={<Zap size={13} />} label="Electricity" value={bill.electricity} />
                        <CostRow icon={<Flame size={13} />} label="Gas" value={bill.gas} />
                        <CostRow icon={<Droplets size={13} />} label="Water" value={bill.water} />
                        <CostRow icon={<Wifi size={13} />} label="Internet" value={bill.internet} />
                        <CostRow icon={<Package size={13} />} label="Other" value={bill.other} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0 0', marginTop: 4, fontSize: 14, fontWeight: 700 }}>
                          <span style={{ color: 'var(--ink)' }}>Total</span>
                          <span style={{ color: 'var(--emerald)', fontSize: 16 }}>{fmt(bill.total)}</span>
                        </div>
                      </div>

                      {/* Payment status */}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink-muted)', marginBottom: 8 }}>Payment Status</div>
                        {bill.payments.length === 0 ? (
                          <p style={{ color: 'var(--ink-muted)', fontSize: 13 }}>No residents assigned.</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {bill.payments.map(p => {
                              const pid = p.payment_id ?? p.id;
                              const isMe = p.resident_user_id === userId;
                              const residentName = (p.resident as any)?.name || p.resident || 'Resident';
                              return (
                                <div key={pid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 8, background: 'var(--surface-2)', gap: 8 }}>
                                  <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--ink)', flex: 1 }}>
                                    {residentName}{isMe ? <span style={{ color: 'var(--emerald)', fontSize: 11, fontWeight: 700, marginLeft: 6 }}>You</span> : ''}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <StatusPill status={p.status} />
                                    {p.status === 'unpaid' && (role === 'student' && isMe) && (
                                      <button
                                        className="btn btn-primary btn-sm"
                                        style={{ padding: '4px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                        onClick={() => handlePay(pid)}
                                      >
                                        <CreditCard size={12} /> Pay
                                      </button>
                                    )}
                                    {p.status === 'paid' && p.paid_at && (
                                      <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{new Date(p.paid_at).toLocaleDateString()}</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCreateModal && (
        <CreateBillModal
          myListings={myListings}
          onClose={() => setShowCreateModal(false)}
          onSuccess={(newBill) => {
            setBills([newBill, ...bills]);
            setExpanded(prev => new Set([...prev, newBill.bill_id ?? newBill.id]));
          }}
        />
      )}
    </div>
  );
}
