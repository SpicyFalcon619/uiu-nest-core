'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { AdminStats, Complaint, Verification } from '@/types';
import { ShieldAlert, UserCheck, TrendingUp, Home, CheckCircle, XCircle } from 'lucide-react';
import { statusBadge } from '@/lib/utils';

export default function AdminContent({ 
  stats, 
  initialVerifications, 
  initialComplaints 
}: { 
  stats: AdminStats;
  initialVerifications: Verification[];
  initialComplaints: Complaint[];
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [verifications, setVerifications] = useState(initialVerifications);
  const [complaints, setComplaints] = useState(initialComplaints);

  const handleVerifAction = async (id: number, status: 'approved' | 'rejected') => {
    const supabase = createClient();
    const { error } = await supabase
      .from('verifications')
      .update({ status })
      .eq('verification_id', id);

    if (error) {
      toast.error('Action failed');
    } else {
      toast.success(`Verification ${status}`);
      setVerifications(verifications.map(v => v.verification_id === id ? { ...v, status } : v));
    }
  };

  const handleComplaintAction = async (id: number, status: 'resolved' | 'dismissed') => {
    const supabase = createClient();
    const { error } = await supabase
      .from('complaints')
      .update({ status })
      .eq('complaint_id', id);

    if (error) {
      toast.error('Action failed');
    } else {
      toast.success(`Complaint ${status}`);
      setComplaints(complaints.map(c => c.complaint_id === id ? { ...c, status } : c));
    }
  };

  return (
    <div>
      <div className="tabs" style={{ marginBottom: '24px' }}>
        <div className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</div>
        <div className={`tab ${activeTab === 'verifications' ? 'active' : ''}`} onClick={() => setActiveTab('verifications')}>ID Verifications</div>
        <div className={`tab ${activeTab === 'complaints' ? 'active' : ''}`} onClick={() => setActiveTab('complaints')}>Complaints</div>
      </div>

      {activeTab === 'overview' && (
        <div id="tab-overview">
          <div className="stats-row" style={{ marginBottom: '24px' }}>
            <div className="stat-card">
              <div className="stat-label">Total Listings</div>
              <div className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Home size={28} color="var(--primary)" /> {stats.totalListings}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Pending Complaints</div>
              <div className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: stats.openComplaints > 0 ? 'var(--danger)' : 'var(--success)' }}>
                <ShieldAlert size={28} /> {stats.openComplaints}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Pending Verifications</div>
              <div className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck size={28} color="var(--amber)" /> {verifications.filter(v => v.status === 'pending').length}
              </div>
            </div>
          </div>

          <div className="grid-2">
            <div className="card">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0, color: 'var(--navy)' }}>
                <TrendingUp size={20} /> Average Rent by Zone
              </h3>
              {stats.avgRentByZone.length === 0 ? <p className="text-gray">Not enough data.</p> : (
                <div className="table-responsive" style={{ border: 'none', boxShadow: 'none' }}>
                  <table className="table">
                    <thead><tr><th>Zone</th><th style={{ textAlign: 'right' }}>Avg Rent</th></tr></thead>
                    <tbody>
                      {stats.avgRentByZone.map(z => (
                        <tr key={z.zone}>
                          <td>{z.zone}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>৳ {z.avg}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="card">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0, color: 'var(--navy)' }}>
                <TrendingUp size={20} /> Demand vs Supply
              </h3>
              {stats.seekingVsListings.length === 0 ? <p className="text-gray">Not enough data.</p> : (
                <div className="table-responsive" style={{ border: 'none', boxShadow: 'none' }}>
                  <table className="table">
                    <thead><tr><th>Zone</th><th style={{ textAlign: 'center' }}>Seeking</th><th style={{ textAlign: 'center' }}>Available Listings</th></tr></thead>
                    <tbody>
                      {stats.seekingVsListings.map(z => (
                        <tr key={z.zone}>
                          <td>{z.zone}</td>
                          <td style={{ textAlign: 'center' }}>{z.seeking}</td>
                          <td style={{ textAlign: 'center' }}>{z.listings}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'verifications' && (
        <div className="card" id="tab-verifications">
          <h2 style={{ marginTop: 0, color: 'var(--navy)' }}>Identity Verifications</h2>
          {verifications.length === 0 ? (
            <p className="text-gray text-center" style={{ padding: '24px 0' }}>No verifications found.</p>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead><tr><th>User</th><th>Document Type</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {verifications.map(v => (
                    <tr key={v.verification_id}>
                      <td>
                        <strong>{(v as any).userName || 'User'}</strong><br />
                        <span style={{ fontSize: '12px', color: 'var(--gray)' }}>{(v as any).userEmail}</span>
                      </td>
                      <td>{v.nid_type}</td>
                      <td>{new Date(v.submitted_at).toLocaleDateString()}</td>
                      <td><span dangerouslySetInnerHTML={{ __html: statusBadge(v.status) }} /></td>
                      <td>
                        {v.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn btn-success btn-sm" onClick={() => handleVerifAction(v.verification_id, 'approved')}>Approve</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleVerifAction(v.verification_id, 'rejected')}>Reject</button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '13px', color: 'var(--gray)' }}>Processed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'complaints' && (
        <div className="card" id="tab-complaints">
          <h2 style={{ marginTop: 0, color: 'var(--navy)' }}>Complaints & Reports</h2>
          {complaints.length === 0 ? (
            <p className="text-gray text-center" style={{ padding: '24px 0' }}>No complaints found.</p>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead><tr><th>Reporter</th><th>Against</th><th>Category</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {complaints.map(c => (
                    <tr key={c.complaint_id}>
                      <td><strong>{(c as any).complainantName || 'User'}</strong></td>
                      <td>
                        <strong>{(c as any).againstName || 'User'}</strong>
                        {(c as any).listingTitle && <div style={{ fontSize: '12px', color: 'var(--gray)' }}>Re: {(c as any).listingTitle}</div>}
                      </td>
                      <td>{c.category}</td>
                      <td style={{ maxWidth: '250px' }}>{c.description}</td>
                      <td><span dangerouslySetInnerHTML={{ __html: statusBadge(c.status) }} /></td>
                      <td>
                        {(c.status === 'pending' || c.status === 'open') ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            <button className="btn btn-success btn-sm" onClick={() => handleComplaintAction(c.complaint_id, 'resolved')}>Resolve</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleComplaintAction(c.complaint_id, 'dismissed')}>Dismiss</button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '13px', color: 'var(--gray)' }}>Processed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
