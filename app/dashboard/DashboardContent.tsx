'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle, Clock, XCircle, UserCheck, Trash2, Building2, ShoppingBag, Search, Heart, List, FileText } from 'lucide-react';
import type { DashboardData, Profile } from '@/types';
import { fmt, conditionLabel, conditionColor, statusBadge, propertyTypeLabel } from '@/lib/utils';
import CustomSelect from '@/components/CustomSelect';
import ListingCard from '@/components/ListingCard';

export default function DashboardContent({ data, user }: { data: DashboardData; user: Profile }) {
  const [activeTab, setActiveTab] = useState('listings');

  const { myListings, myItems, watched, offersSent, offersRecv, appsSent, appsRecv, hasPreferences, verifStatus, mySeeking, seekRespRecv, seekRespSent } = data;

  const activeOffersCount = offersSent.filter(o => o.status === 'pending' || o.status === 'countered').length +
                            offersRecv.filter(o => o.status === 'pending' || o.status === 'countered').length;

  const compatStatus = (user.role === 'student' && hasPreferences) ? (
    <>Complete <CheckCircle style={{ width: '24px', height: '24px', verticalAlign: '-4px' }} /></>
  ) : 'Setup Required';
  const compatColor = (user.role === 'student' && hasPreferences) ? 'var(--success)' : 'var(--warning)';

  let verifText: React.ReactNode = 'N/A';
  let verifColor = 'var(--gray)';
  if (user.role === 'landlord' || verifStatus !== 'none') {
    if (verifStatus === 'none') { verifText = 'Unverified'; verifColor = 'var(--gray)'; }
    else if (verifStatus === 'pending') { verifText = <>Pending <Clock style={{ width: '24px', height: '24px', verticalAlign: '-4px' }} /></>; verifColor = 'var(--amber)'; }
    else if (verifStatus === 'approved') { verifText = <>Verified <CheckCircle style={{ width: '24px', height: '24px', verticalAlign: '-4px' }} /></>; verifColor = 'var(--success)'; }
    else if (verifStatus === 'rejected') { verifText = <>Rejected <XCircle style={{ width: '24px', height: '24px', verticalAlign: '-4px' }} /></>; verifColor = 'var(--danger)'; }
  }

  const switchTab = (tab: string) => setActiveTab(tab);

  return (
    <div className="container">
      <h1 className="page-title">Welcome back, {user.name}</h1>

      <div className="stats-row">
        {user.role !== 'admin' && (
          <div className="stat-card">
            <div className="stat-label">Verification</div>
            <div className="stat-value" style={{ color: verifColor, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px' }}>
              {verifText}
            </div>
          </div>
        )}
        <div className="stat-card">
          <div className="stat-label">Active Listings</div>
          <div className="stat-value">{myListings.length}</div>
        </div>
        {user.role === 'student' && (
          <div className="stat-card">
            <div className="stat-label">Watchlisted</div>
            <div className="stat-value">{watched.length}</div>
          </div>
        )}
        <div className="stat-card">
          <div className="stat-label">Active Offers</div>
          <div className="stat-value">{activeOffersCount}</div>
        </div>
        {user.role === 'student' && (
          <div className="stat-card">
            <div className="stat-label">Compatibility</div>
            <div className="stat-value" style={{ color: compatColor, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px' }}>
              {compatStatus}
            </div>
          </div>
        )}
      </div>

      <div className="dashboard-layout">
        <div className="dashboard-sidebar card" style={{ padding: '16px' }}>
          <div className="sidebar-section-title" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', paddingLeft: '16px' }}>
            Management
          </div>
          <div className={`dashboard-nav-item ${activeTab === 'listings' ? 'active' : ''}`} onClick={() => switchTab('listings')}>
            <Building2 size={18} /> My Listings
          </div>
          
          <div className={`dashboard-nav-item ${activeTab === 'items' ? 'active' : ''}`} onClick={() => switchTab('items')}>
            <ShoppingBag size={18} /> Exchange Items
          </div>
          {user.role === 'student' && (
            <div className={`dashboard-nav-item ${activeTab === 'seeking' ? 'active' : ''}`} onClick={() => switchTab('seeking')}>
              <Search size={18} /> Looking For
            </div>
          )}
          
          <div className="sidebar-section-title" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', marginTop: '16px', paddingLeft: '16px' }}>
            Interactions
          </div>
          <div className={`dashboard-nav-item ${activeTab === 'watch' ? 'active' : ''}`} onClick={() => switchTab('watch')}>
            <Heart size={18} /> Watchlist
          </div>
          <div className={`dashboard-nav-item ${activeTab === 'offers' ? 'active' : ''}`} onClick={() => switchTab('offers')}>
            <List size={18} /> Offers
          </div>
          
          <div className="sidebar-section-title" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', marginTop: '16px', paddingLeft: '16px' }}>
            Paperwork
          </div>
          <div className={`dashboard-nav-item ${activeTab === 'applications' ? 'active' : ''}`} onClick={() => switchTab('applications')}>
            <FileText size={18} /> Housing Applications
          </div>
        </div>

        <div className="dashboard-main">
          {activeTab === 'listings' && (
            <div id="tab-listings">
              <div className="card">
                <h3 style={{ marginTop: 0, color: 'var(--navy)' }}>My Properties</h3>
                {myListings.length === 0 ? (
                  <p style={{ color: 'var(--gray)', textAlign: 'center', padding: '24px 0' }}>
                    You haven't listed any properties yet. <Link href="/listings/new">List property now</Link>
                  </p>
                ) : (
                  <div className="table-responsive">
                    <table className="table">
                      <thead><tr><th>Title</th><th>Zone</th><th>Status</th><th>Total Cost</th><th>Actions</th></tr></thead>
                      <tbody>
                        {myListings.map(l => (
                          <tr key={l.listing_id || l.id}>
                            <td><strong>{l.title}</strong></td>
                            <td>{l.zone || l.zone_id}</td>
                            <td>
                              <CustomSelect 
                                name={`status_${l.listing_id || l.id}`} 
                                value={l.status} 
                                onChange={() => {}} 
                                options={[
                                  { value: 'available', label: 'Available' },
                                  { value: 'occupied', label: 'Occupied' },
                                  { value: 'soon_vacant', label: 'Soon Vacant' }
                                ]} 
                              />
                            </td>
                            <td>{fmt(l.costs?.total_monthly || 0)}</td>
                            <td>
                              <button className="btn btn-outline btn-sm">Edit</button>
                              <button className="btn btn-danger btn-sm" style={{ marginLeft: '4px' }}>Delete</button>
                              <Link className="btn btn-primary btn-sm" style={{ marginLeft: '4px' }} href={`/listings/${l.listing_id || l.id}`}>View</Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

      {activeTab === 'items' && (
        <div id="tab-items">
          <div className="card">
            <h3 style={{ marginTop: 0, color: 'var(--navy)' }}>My Marketplace Items</h3>
            {myItems.length === 0 ? (
              <p style={{ color: 'var(--gray)', textAlign: 'center', padding: '24px 0' }}>
                You haven't listed any items for sale. <Link href="/exchange">Sell an item now</Link>
              </p>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead><tr><th>Title</th><th>Price</th><th>Condition</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {myItems.map(it => (
                      <tr key={it.item_id || (it as any).id}>
                        <td><strong>{it.title}</strong></td>
                        <td>{fmt(it.asking_price || (it as any).price || 0)}</td>
                        <td><span className={`badge ${conditionColor(it.item_condition || (it as any).condition)}`}>{conditionLabel(it.item_condition || (it as any).condition)}</span></td>
                        <td>
                          <CustomSelect 
                            name={`status_item_${it.item_id || (it as any).id}`} 
                            value={it.status || 'available'} 
                            onChange={() => {}} 
                            options={[
                              { value: 'available', label: 'Available' },
                              { value: 'sold', label: 'Sold' },
                              { value: 'withdrawn', label: 'Withdrawn' }
                            ]} 
                          />
                        </td>
                        <td>
                          <button className="btn btn-outline btn-sm">Edit</button>
                          <button className="btn btn-danger btn-sm" style={{ marginLeft: '4px' }}>Delete</button>
                          <Link className="btn btn-primary btn-sm" style={{ marginLeft: '4px' }} href={`/exchange/${it.item_id || (it as any).id}`}>View</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'seeking' && (
        <div id="tab-seeking">
          <div className="card">
            <h3 style={{ marginTop: 0, color: 'var(--navy)' }}>My "Looking For" Requests</h3>
            {(!mySeeking || mySeeking.length === 0) ? (
              <p style={{ color: 'var(--gray)', textAlign: 'center', padding: '24px 0' }}>
                You haven't posted any requests. <Link href="/seeking">Post a request</Link>
              </p>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead><tr><th>Zone</th><th>Property Type</th><th>Budget</th><th>Move-in Date</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {mySeeking.map(s => (
                      <tr key={s.post_id || s.id}>
                        <td><strong>{s.zone || s.zone_id}</strong></td>
                        <td>{propertyTypeLabel(s.property_type)}</td>
                        <td>{fmt(s.budget_min)} - {fmt(s.budget_max)}</td>
                        <td>{s.move_in_date || 'N/A'}</td>
                        <td>
                          <CustomSelect 
                            name={`status_seeking_${s.post_id || s.id}`} 
                            value={s.status || 'active'} 
                            onChange={() => {}} 
                            options={[
                              { value: 'active', label: 'Active' },
                              { value: 'fulfilled', label: 'Fulfilled' }
                            ]} 
                          />
                        </td>
                        <td>
                          <button className="btn btn-outline-danger btn-sm">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card" style={{ marginTop: '24px' }}>
            <h3 style={{ marginTop: 0, color: 'var(--navy)' }}>Responses Received (For your requests)</h3>
            {(!seekRespRecv || seekRespRecv.length === 0) ? (
              <p style={{ color: 'var(--gray)', textAlign: 'center', padding: '12px 0' }}>No responses yet.</p>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead><tr><th>From</th><th>Message</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
                  <tbody>
                    {seekRespRecv.map(r => (
                      <tr key={r.response_id}>
                        <td>
                          <strong>{r.responder_name}</strong><br />
                          <button className="btn btn-outline btn-sm" style={{ marginTop: '6px', padding: '4px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <UserCheck className="lucide-sm" /> Contact
                          </button>
                        </td>
                        <td>{r.message}</td>
                        <td><span dangerouslySetInnerHTML={{ __html: statusBadge(r.status) }} /></td>
                        <td>{r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</td>
                        <td>
                          {r.status === 'pending' && (
                            <>
                              <button className="btn btn-success btn-sm">Accept</button>
                              <button className="btn btn-danger btn-sm" style={{ marginLeft: '4px' }}>Reject</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card" style={{ marginTop: '24px' }}>
            <h3 style={{ marginTop: 0, color: 'var(--navy)' }}>Responses Sent (To other requests)</h3>
            {(!seekRespSent || seekRespSent.length === 0) ? (
              <p style={{ color: 'var(--gray)', textAlign: 'center', padding: '12px 0' }}>You haven't responded to any requests.</p>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead><tr><th>Request</th><th>Landlord</th><th>Your Message</th><th>Status</th><th>Date</th></tr></thead>
                  <tbody>
                    {seekRespSent.map(r => (
                      <tr key={r.response_id}>
                        <td><strong>{r.requirements ? r.requirements.substring(0, 30) : ''}...</strong></td>
                        <td>
                          {r.owner_name || 'Landlord'}<br />
                          <button className="btn btn-outline btn-sm" style={{ marginTop: '6px', padding: '4px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <UserCheck className="lucide-sm" /> Contact
                          </button>
                        </td>
                        <td>{r.message}</td>
                        <td><span dangerouslySetInnerHTML={{ __html: statusBadge(r.status) }} /></td>
                        <td>{r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'watch' && user.role !== 'landlord' && (
        <div id="tab-watch">
          <div className="card">
            <h3 style={{ marginTop: 0, color: 'var(--navy)', marginBottom: '14px' }}>Saved Properties</h3>
            {watched.length === 0 ? (
              <p style={{ color: 'var(--gray)', textAlign: 'center', padding: '24px 0' }}>
                Your watchlist is empty. <Link href="/listings">Browse properties</Link>
              </p>
            ) : (
              <div className="grid-3">
                {watched.map(l => (
                  <ListingCard key={l.listing_id || l.id} listing={l} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'offers' && user.role !== 'landlord' && (
        <div id="tab-offers">
          <div className="card" style={{ marginBottom: '20px' }}>
            <h3 style={{ marginTop: 0, color: 'var(--navy)' }}>Offers Received</h3>
            {offersRecv.length === 0 ? (
              <p style={{ color: 'var(--gray)', textAlign: 'center', padding: '12px 0' }}>No offers received yet.</p>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead><tr><th>Item</th><th>Buyer</th><th>Price</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {offersRecv.map(o => (
                      <tr key={o.offer_id}>
                        <td><strong>{o.title}</strong></td>
                        <td>
                          {o.buyer_name}<br />
                          <button className="btn btn-outline btn-sm" style={{ marginTop: '6px', padding: '4px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <UserCheck className="lucide-sm" /> Contact
                          </button>
                        </td>
                        <td>{fmt(o.counter_price || o.offer_price)}</td>
                        <td><span dangerouslySetInnerHTML={{ __html: statusBadge(o.status) }} /></td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            <Link className="btn btn-outline btn-sm" href={`/exchange/${o.item_id}`}>Open</Link>
                            {o.status === 'pending' && (
                              <>
                                <button className="btn btn-success btn-sm">Accept</button>
                                <button className="btn btn-outline btn-sm">Counter</button>
                                <button className="btn btn-danger btn-sm">Reject</button>
                              </>
                            )}
                            <button className="btn btn-danger btn-sm">
                              <Trash2 className="lucide-sm" style={{ width: '14px', height: '14px' }} /> Delete Item
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0, color: 'var(--navy)' }}>Offers Sent (Outgoing)</h3>
            {offersSent.length === 0 ? (
              <p style={{ color: 'var(--gray)', textAlign: 'center', padding: '12px 0' }}>No outgoing offers.</p>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead><tr><th>Item</th><th>Seller</th><th>Your Bid</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {offersSent.map(o => (
                      <tr key={o.offer_id}>
                        <td><strong>{o.title}</strong></td>
                        <td>
                          {o.seller_name}<br />
                          <button className="btn btn-outline btn-sm" style={{ marginTop: '6px', padding: '4px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <UserCheck className="lucide-sm" /> Contact
                          </button>
                        </td>
                        <td>{fmt(o.counter_price || o.offer_price)}</td>
                        <td><span dangerouslySetInnerHTML={{ __html: statusBadge(o.status) }} /></td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            <Link className="btn btn-outline btn-sm" href={`/exchange/${o.item_id}`}>Open</Link>
                            {o.status === 'countered' && (
                              <>
                                <button className="btn btn-success btn-sm">Accept Counter</button>
                                <button className="btn btn-danger btn-sm">Reject</button>
                                <button className="btn btn-outline btn-sm">Withdraw</button>
                              </>
                            )}
                            {o.status === 'pending' && (
                              <button className="btn btn-outline btn-sm">Withdraw Offer</button>
                            )}
                            <button className="btn btn-danger btn-sm">
                              <Trash2 className="lucide-sm" style={{ width: '14px', height: '14px' }} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'applications' && (
        <div id="tab-applications">
          <div className="card" style={{ marginBottom: '20px' }}>
            <h3 style={{ marginTop: 0, color: 'var(--navy)' }}>Applications Received</h3>
            {appsRecv.length === 0 ? (
              <p style={{ color: 'var(--gray)', textAlign: 'center', padding: '12px 0' }}>No applications received yet.</p>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead><tr><th>Property</th><th>Applicant</th><th>Message</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {appsRecv.map(a => (
                      <tr key={a.application_id}>
                        <td><strong>{a.listing_title}</strong></td>
                        <td>
                          {a.applicant_name}<br />
                          <button className="btn btn-outline btn-sm" style={{ marginTop: '6px', padding: '4px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <UserCheck className="lucide-sm" /> Contact
                          </button>
                        </td>
                        <td>
                          <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.message}>
                            {a.message}
                          </div>
                        </td>
                        <td><span dangerouslySetInnerHTML={{ __html: statusBadge(a.status) }} /></td>
                        <td>
                          {a.status === 'pending' && (
                            <>
                              <button className="btn btn-success btn-sm">Accept</button>
                              <button className="btn btn-danger btn-sm" style={{ marginLeft: '4px' }}>Reject</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0, color: 'var(--navy)' }}>Applications Sent</h3>
            {appsSent.length === 0 ? (
              <p style={{ color: 'var(--gray)', textAlign: 'center', padding: '12px 0' }}>You haven't applied to any properties.</p>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead><tr><th>Property</th><th>Landlord</th><th>Status</th><th>Date</th></tr></thead>
                  <tbody>
                    {appsSent.map(a => (
                      <tr key={a.application_id}>
                        <td><strong>{a.listing_title}</strong></td>
                        <td>
                          {a.owner_name || 'Landlord'}<br />
                          <button className="btn btn-outline btn-sm" style={{ marginTop: '6px', padding: '4px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <UserCheck className="lucide-sm" /> Contact
                          </button>
                        </td>
                        <td><span dangerouslySetInnerHTML={{ __html: statusBadge(a.status) }} /></td>
                        <td>{a.created_at ? new Date(a.created_at).toLocaleDateString() : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
