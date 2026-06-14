import Link from 'next/link';
import { ShieldCheck, MapPin, Bed, Star, Heart, User } from 'lucide-react';
import type { Listing } from '@/types';
import { fmt, propertyTypeLabel, statusColor, statusLabel, placeholderPhoto } from '@/lib/utils';

export default function ListingCard({ listing }: { listing: Listing }) {
  const placeholderSvg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'><rect width='600' height='400' fill='%23EEF7F2'/><text x='50%' y='50%' font-family='sans-serif' font-size='18' fill='%231A5C45' text-anchor='middle' dominant-baseline='middle'>No Photo</text></svg>";
  const thumbnail = listing.photos && listing.photos.length > 0 ? listing.photos[0] : placeholderSvg;
  const totalRent = listing.costs ? listing.costs.total_monthly : 0;
  
  const typeBadge = listing.listing_type === 'peer_listing'
    ? <span className="badge badge-blue">Student Listed</span>
    : <span className="badge badge-navy">Landlord Listed</span>;

  const gender = listing.gender_pref === 'female' 
    ? <><User size={14} /> Female</> 
    : listing.gender_pref === 'male' 
      ? <><User size={14} /> Male</> 
      : 'Any';
      
  return (
    <div className="listing-card">
      <div className="listing-photo-wrap">
        <img src={thumbnail} alt={listing.title} className="listing-photo" loading="lazy" />
        <div className="listing-photo-badges">
          {listing.is_verified && (
            <span className="badge badge-gold"><ShieldCheck size={14} /> Verified</span>
          )}
        </div>
      </div>
      <div className="listing-body">
        <div className="badges">
          <span className="badge badge-navy">{listing.zone}</span>
          {typeBadge}
        </div>
        <div className="listing-title">{listing.title}</div>
        <div className="price">{totalRent > 0 ? fmt(totalRent) : 'Ask'}<span> /month</span></div>
        <div className="listing-meta">{gender} &nbsp;·&nbsp; {listing.current_occupancy}/{listing.total_rooms} occupied</div>
        <div className="listing-footer">
          <button className="heart" title="Save"><Heart style={{ width: '20px', height: '20px' }} /></button>
          <Link className="btn btn-primary btn-sm" href={`/listings/${listing.listing_id || listing.id}`}>View Details</Link>
        </div>
      </div>
    </div>
  );
}
