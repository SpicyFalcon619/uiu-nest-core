'use client';

import { useEffect, useState, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Listing } from '@/types';
import { MapPin, ShieldCheck, Star, Bed, Activity, Send } from 'lucide-react';
import { fmt, propertyTypeLabel, statusLabel, placeholderPhoto } from '@/lib/utils';
import { useToast } from '@/components/Toast';

export default function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // In Next 15 (which Next 14 App Router sometimes acts like based on latest changes), params is a promise
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  
  const supabase = createClient();
  const showToast = useToast();
  
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function fetchListing() {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          costs:utility_costs(*),
          amenities:listing_amenities(*),
          reviews(*),
          owner:profiles!listings_user_id_fkey(name, email, role, phone, profile_pic)
        `)
        .eq('listing_id', parseInt(id))
        .single();
        
      if (data) {
        setListing(data as any);
      }
      setLoading(false);
    }
    fetchListing();
  }, [id, supabase]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplying(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showToast('You must be logged in to apply.', 'error');
      setApplying(false);
      return;
    }

    const { error } = await supabase
      .from('applications')
      .insert({
        listing_id: parseInt(id),
        applicant_id: user.id,
        message,
        status: 'pending'
      });

    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast('Application sent successfully!', 'success');
      setMessage('');
      
      // Send notification to owner
      if (listing) {
         await supabase.from('notifications').insert({
           user_id: listing.user_id,
           type: 'application',
           message: `You received a new application for ${listing.title}`,
           link: `/dashboard?tab=applications`
         });
      }
    }
    setApplying(false);
  };

  if (loading) return <div className="container" style={{ padding: '60px', textAlign: 'center' }}>Loading...</div>;
  if (!listing) return <div className="container" style={{ padding: '60px', textAlign: 'center' }}>Listing not found.</div>;

  const owner = (listing as any).owner || {};
  const thumbnail = listing.photos && listing.photos.length > 0 ? listing.photos[0] : placeholderPhoto();

  return (
    <div className="container" style={{ padding: '40px 5%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
        
        {/* Left Column: Details */}
        <div>
          <div style={{ marginBottom: '24px' }}>
            <div className="badges" style={{ marginBottom: '12px' }}>
              <span className="badge badge-navy"><MapPin size={14}/> {listing.zone}</span>
              <span className="badge badge-blue">{propertyTypeLabel(listing.property_type)}</span>
              <span className="badge badge-gray">{statusLabel(listing.status)}</span>
              {listing.is_verified && <span className="badge badge-gold"><ShieldCheck size={14}/> Verified</span>}
            </div>
            <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>{listing.title}</h1>
            <p style={{ color: 'var(--ink-muted)' }}>{listing.address}</p>
          </div>

          <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: '32px', height: '400px', background: '#eee' }}>
            <img src={thumbnail} alt={listing.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>

          <div className="card" style={{ padding: '32px', marginBottom: '24px' }}>
            <h3>Description</h3>
            <p style={{ whiteSpace: 'pre-wrap', color: 'var(--ink-mid)' }}>
              {listing.description || 'No description provided.'}
            </p>
          </div>

          <div className="card" style={{ padding: '32px', marginBottom: '24px' }}>
            <h3>Amenities</h3>
            {listing.amenities ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                <div style={{ display: 'flex', gap: '8px', color: listing.amenities.attached_bathroom ? 'var(--emerald)' : 'var(--ink-muted)' }}>
                  <ShieldCheck size={18}/> Attached Bathroom
                </div>
                <div style={{ display: 'flex', gap: '8px', color: listing.amenities.is_furnished ? 'var(--emerald)' : 'var(--ink-muted)' }}>
                  <Bed size={18}/> Furnished
                </div>
                <div style={{ display: 'flex', gap: '8px', color: listing.amenities.power_backup ? 'var(--emerald)' : 'var(--ink-muted)' }}>
                  <Activity size={18}/> Power Backup
                </div>
                {/* ... other amenities ... */}
              </div>
            ) : (
              <p style={{ color: 'var(--ink-muted)' }}>Not specified.</p>
            )}
          </div>
        </div>

        {/* Right Column: Cost Breakdown & Owner info */}
        <div>
          <div className="card bento-emerald" style={{ padding: '32px', position: 'sticky', top: '100px' }}>
            <h3 style={{ marginBottom: '24px' }}>Cost Breakdown</h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span>Base Rent</span>
              <strong>{fmt(listing.costs?.base_rent || 0)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span>Electricity ({listing.costs?.electricity_type})</span>
              <span>{fmt(listing.costs?.electricity_amount || 0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span>Gas</span>
              <span>{fmt(listing.costs?.gas_bill || 0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span>Water</span>
              <span>{fmt(listing.costs?.water_bill || 0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span>Internet</span>
              <span>{fmt(listing.costs?.internet_cost || 0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <span>Service Charge</span>
              <span>{fmt((listing.costs?.maintenance_fee || 0) + (listing.costs?.caretaker_fee || 0))}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '20px', fontWeight: 'bold', marginBottom: '32px' }}>
              <span>Total Monthly</span>
              <span>{fmt(listing.costs?.total_monthly || 0)}</span>
            </div>

            <h4 style={{ marginBottom: '12px' }}>Listed By</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {owner.name ? owner.name.substring(0,2).toUpperCase() : 'US'}
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{owner.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--ink-muted)', textTransform: 'capitalize' }}>{owner.role}</div>
              </div>
            </div>

            <form onSubmit={handleApply}>
              <textarea 
                className="form-control" 
                placeholder="Hi, I'm a UIU student interested in renting..."
                style={{ height: '100px', marginBottom: '16px' }}
                value={message}
                onChange={e => setMessage(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }} disabled={applying}>
                {applying ? 'Sending...' : <><Send size={18}/> Apply Now</>}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
