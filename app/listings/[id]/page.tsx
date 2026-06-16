import { createClient } from '@/lib/supabase/server';
import { MapPin, ShieldCheck, Bed, Activity } from 'lucide-react';
import { fmt, propertyTypeLabel, statusLabel, placeholderPhoto, avatarInitials } from '@/lib/utils';
import ApplicationForm from './ApplicationForm';
import WatchlistButton from '@/components/WatchlistButton';
import ReviewsSection from '@/components/ReviewsSection';
import { notFound } from 'next/navigation';
import ListingMap from '@/components/ListingMap';
import CommentSection from '@/components/comments/CommentSection';
import UserRating from '@/components/ratings/UserRating';
import Link from 'next/link';

export const metadata = {
  title: 'Listing Details - UIUNest',
  description: 'View full details for this UIUNest property listing.',
};

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  
  const supabase = await createClient();
  
  const { data: listing, error } = await supabase
    .from('listings')
    .select(`
      *,
      costs:utility_costs(*),
      amenities:listing_amenities(*),
      reviews(*),
      owner:profiles!listings_user_id_fkey(name, email, role, phone, profile_pic, profile_slug)
    `)
    .eq('listing_id', parseInt(id))
    .single();
    
  if (error || !listing) {
    return notFound();
  }

  const owner = (listing as any).owner || {};
  const thumbnail = listing.photos && listing.photos.length > 0 ? listing.photos[0] : placeholderPhoto();

  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  let isAdmin = false;
  if (isLoggedIn) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role === 'admin') isAdmin = true;
  }

  // Check watchlist status if logged in
  let isWatched = false;
  if (isLoggedIn) {
    const { count } = await supabase
      .from('watchlists')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('listing_id', parseInt(id));
    isWatched = (count || 0) > 0;
  }

  // Fetch comments
  const { data: commentsData } = await supabase
    .from('listing_comments')
    .select(`
      *,
      user:profiles!listing_comments_user_id_fkey(name, profile_pic)
    `)
    .eq('listing_id', parseInt(id))
    .order('created_at', { ascending: true });

  const comments = commentsData || [];

  let finalComments = comments;
  if (isLoggedIn) {
    const { data: userVotes } = await supabase
      .from('listing_comment_votes')
      .select('comment_id, vote_type')
      .eq('user_id', user.id);
      
    if (userVotes && userVotes.length > 0) {
      finalComments = comments.map(c => {
        const vote = userVotes.find(v => v.comment_id === c.comment_id);
        return vote ? { ...c, user_vote: vote.vote_type } : c;
      });
    }
  }

  // Fetch ratings for the landlord
  let averageRating = 0;
  let totalRatings = 0;
  if (listing.user_id) {
    const { data: ratingsData } = await supabase
      .from('user_ratings')
      .select('rating')
      .eq('target_user_id', listing.user_id);
      
    if (ratingsData && ratingsData.length > 0) {
      totalRatings = ratingsData.length;
      averageRating = ratingsData.reduce((acc: number, curr: any) => acc + curr.rating, 0) / totalRatings;
    }
  }

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>{listing.title}</h1>
                <p style={{ color: 'var(--ink-muted)' }}>{listing.address}</p>
              </div>
              <WatchlistButton listingId={parseInt(id)} initialIsWatched={isWatched} />
            </div>
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
              </div>
            ) : (
              <p style={{ color: 'var(--ink-muted)' }}>Not specified.</p>
            )}
          </div>

          {(listing.lat && listing.lng) ? (
            <ListingMap lat={listing.lat} lng={listing.lng} title={listing.title} />
          ) : (
            <div className="card" style={{ padding: '32px', marginBottom: '24px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MapPin size={20} /> Location & Map</h3>
              <p style={{ color: 'var(--ink-muted)' }}>Exact map coordinates not available for this listing.</p>
            </div>
          )}

          <ReviewsSection 
            listingId={parseInt(id)} 
            initialReviews={listing.reviews || []} 
            isLoggedIn={isLoggedIn}
            currentUserId={user?.id}
          />

          <div style={{ marginTop: '32px' }}>
            <CommentSection 
              itemId={listing.listing_id}
              initialComments={finalComments as any}
              isLoggedIn={isLoggedIn}
              currentUserId={user?.id}
              type="listing"
            />
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
              {/* Avatar — links to public profile if slug is available */}
              {owner.profile_slug ? (
                <Link href={`/profiles/${owner.profile_slug}`} style={{ flexShrink: 0 }}>
                  {owner.profile_pic ? (
                    <img src={owner.profile_pic} alt={owner.name} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>
                      {avatarInitials(owner.name || 'U')}
                    </div>
                  )}
                </Link>
              ) : (
                owner.profile_pic ? (
                  <img src={owner.profile_pic} alt={owner.name} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                    {avatarInitials(owner.name || 'U')}
                  </div>
                )
              )}
              <div>
                {owner.profile_slug ? (
                  <Link href={`/profiles/${owner.profile_slug}`} style={{ fontWeight: 600, color: 'inherit', textDecoration: 'none' }}>
                    {owner.name}
                  </Link>
                ) : (
                  <div style={{ fontWeight: 600 }}>{owner.name}</div>
                )}
                {listing.user_id && (
                  <UserRating
                    targetUserId={listing.user_id}
                    initialRating={averageRating}
                    totalRatings={totalRatings}
                    isLoggedIn={isLoggedIn && !isAdmin}
                    currentUserId={user?.id}
                  />
                )}
                <div style={{ fontSize: '12px', color: 'var(--ink-muted)', textTransform: 'capitalize', marginTop: '4px' }}>{owner.role}</div>
              </div>
            </div>

            {isLoggedIn ? (
              user?.id === listing.user_id || isAdmin ? (
                <div style={{ padding: '16px', background: 'var(--surface-1)', borderRadius: '8px', textAlign: 'center', color: 'var(--ink-muted)' }}>
                  {isAdmin ? 'Admins cannot apply for listings.' : 'This is your own listing.'}
                </div>
              ) : (
                <ApplicationForm 
                  listingId={parseInt(id)} 
                  ownerId={listing.user_id} 
                  listingTitle={listing.title} 
                />
              )
            ) : (
              <div style={{ padding: '16px', background: 'var(--surface-1)', borderRadius: '8px', textAlign: 'center', color: 'var(--ink-muted)' }}>
                Please log in to apply.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
