import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { fmt, conditionLabel, conditionColor, fmtDate, placeholderPhoto } from '@/lib/utils';
import { Link as LinkIcon, User, MapPin, Calendar, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import ExchangeItemDetailClient from './ExchangeItemDetailClient';
import CommentSection from '@/components/comments/CommentSection';
import UserRating from '@/components/ratings/UserRating';

export default async function ExchangeItemDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch the item with joined tables
  const { data: item } = await supabase
    .from('items')
    .select(`
      *,
      seller:profiles!items_seller_id_fkey(name, email, phone, university_id, created_at),
      zone:zones(zone_name),
      listing:listings(title, listing_id)
    `)
    .eq('item_id', parseInt(id))
    .eq('item_id', parseInt(id))
    .single();

  if (!item) {
    notFound();
  }

  const { data: commentsData } = await supabase
    .from('item_comments')
    .select(`
      *,
      user:profiles!item_comments_user_id_fkey(name, profile_pic)
    `)
    .eq('item_id', parseInt(id))
    .order('created_at', { ascending: true });

  const comments = commentsData || [];

  // Determine if the current user is logged in and if they are the seller
  const { data: { user } } = await supabase.auth.getUser();
  const isOwner = user?.id === item.seller_id;
  const isLoggedIn = !!user;

  // If logged in, fetch user's votes to pass down
  let finalComments = comments;
  if (isLoggedIn) {
    const { data: userVotes } = await supabase
      .from('item_comment_votes')
      .select('comment_id, vote_type')
      .eq('user_id', user.id);
      
    if (userVotes && userVotes.length > 0) {
      finalComments = comments.map(c => {
        const vote = userVotes.find(v => v.comment_id === c.comment_id);
        return vote ? { ...c, user_vote: vote.vote_type } : c;
      });
    }
  }

  // Fetch target user's ratings to calculate average
  let averageRating = 0;
  let totalRatings = 0;
  if (item.seller_id) {
    const { data: ratingsData } = await supabase
      .from('user_ratings')
      .select('rating')
      .eq('target_user_id', item.seller_id);
      
    if (ratingsData && ratingsData.length > 0) {
      totalRatings = ratingsData.length;
      averageRating = ratingsData.reduce((acc: number, curr: any) => acc + curr.rating, 0) / totalRatings;
    }
  }

  const placeholderSvg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'><rect width='600' height='400' fill='%23EEF7F2'/><text x='50%' y='50%' font-family='sans-serif' font-size='18' fill='%231A5C45' text-anchor='middle' dominant-baseline='middle'>No Photo</text></svg>";
  const thumbnail = item.photos && item.photos.length > 0 ? item.photos[0] : (item.photo_url || placeholderSvg);

  return (
    <div className="container" style={{ padding: '40px 0' }}>
      <Link href="/exchange" style={{ display: 'inline-block', marginBottom: '20px', color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
        ← Back to Exchange
      </Link>

      <div className="grid-2" style={{ alignItems: 'start', gap: '32px' }}>
        {/* Left Col: Photos */}
        <div style={{ position: 'sticky', top: '24px' }}>
          <img src={thumbnail} alt={item.title} style={{ width: '100%', borderRadius: '12px', border: '1px solid var(--border)' }} />
          {item.photos && item.photos.length > 1 && (
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px', overflowX: 'auto' }}>
              {item.photos.slice(1).map((p: string, i: number) => (
                <img key={i} src={p} alt="" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)', cursor: 'pointer' }} />
              ))}
            </div>
          )}
        </div>

        {/* Right Col: Details */}
        <div>
          <div className="badges" style={{ marginBottom: '16px' }}>
            <span className="badge badge-navy">{item.category}</span>
            <span className={`badge ${conditionColor(item.item_condition)}`}>{conditionLabel(item.item_condition)}</span>
            <span className="badge badge-gray">{item.zone?.zone_name}</span>
          </div>
          
          <h1 style={{ margin: '0 0 16px 0', fontSize: '32px' }}>{item.title}</h1>
          <div style={{ fontSize: '28px', fontWeight: 600, color: 'var(--primary)', marginBottom: '24px' }}>
            {fmt(item.asking_price)}
          </div>

          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Seller Information</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '20px' }}>
                {item.seller?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {item.seller?.name || 'Anonymous User'}
                </div>
                {item.seller_id && (
                  <UserRating 
                    targetUserId={item.seller_id}
                    initialRating={averageRating}
                    totalRatings={totalRatings}
                    isLoggedIn={isLoggedIn}
                    currentUserId={user?.id}
                  />
                )}
                <div style={{ fontSize: '14px', color: 'var(--gray)', marginTop: '4px' }}>UIU Student · Member since {fmtDate(item.seller?.created_at || item.created_at)}</div>
              </div>
            </div>
            
            {/* Show contact info only to logged in users */}
            {isLoggedIn ? (
              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'var(--bg-color)', borderRadius: '8px' }}>
                <div style={{ fontSize: '14px', marginBottom: '4px' }}><strong>Email:</strong> {item.seller?.email}</div>
                <div style={{ fontSize: '14px' }}><strong>Phone:</strong> {item.seller?.phone || 'Not provided'}</div>
              </div>
            ) : (
              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'var(--bg-color)', borderRadius: '8px', textAlign: 'center', fontSize: '14px' }}>
                <Link href="/login" style={{ color: 'var(--primary)' }}>Log in to view contact details</Link>
              </div>
            )}
          </div>

          {item.listing && (
            <div className="card" style={{ marginBottom: '24px', borderLeft: '4px solid var(--gold)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <LinkIcon size={18} color="var(--gold)" />
                <h3 style={{ margin: 0 }}>Linked to a Room/Flat</h3>
              </div>
              <p style={{ margin: '0 0 12px 0', fontSize: '14px' }}>This item is being sold by the current tenant of this listing, usually meaning it stays in the room if you move in.</p>
              <Link href={`/listings/${item.listing.listing_id}`} className="btn btn-outline btn-sm">
                View Linked Listing
              </Link>
            </div>
          )}

          <div className="card">
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Description</h3>
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: '#334155' }}>{item.description}</p>
          </div>

          <div style={{ marginTop: '32px' }}>
            <ExchangeItemDetailClient 
              itemId={item.item_id} 
              itemTitle={item.title}
              isLoggedIn={isLoggedIn} 
              isOwner={isOwner} 
              status={item.status}
              askingPrice={item.asking_price}
            />
          </div>

          <div style={{ marginTop: '32px' }}>
            <CommentSection 
              itemId={item.item_id}
              initialComments={finalComments as any}
              isLoggedIn={isLoggedIn}
              currentUserId={user?.id}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
