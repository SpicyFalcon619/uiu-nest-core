'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Listing, Zone } from '@/types';
import ListingCard from '@/components/ListingCard';
import MapView from '@/components/MapView';
import { SlidersHorizontal, ChevronDown, MapPin } from 'lucide-react';

function ListingsContent() {
  const searchParams = useSearchParams();
  const supabase = createClient();
  
  const [listings, setListings] = useState<Listing[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters state
  const [zoneId, setZoneId] = useState(searchParams.get('zone') || '');
  const [type, setType] = useState(searchParams.get('type') || '');
  const [budget, setBudget] = useState(searchParams.get('budget') || '15000');
  const [gender, setGender] = useState('');
  const [listingType, setListingType] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchFilters = useCallback(async () => {
    const { data } = await supabase.from('zones').select('*').order('zone_name');
    if (data) setZones(data as Zone[]);
  }, [supabase]);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('listings').select('*, costs:utility_costs(*)').eq('status', 'available');

    if (zoneId) query = query.eq('zone_id', parseInt(zoneId));
    if (type && type !== 'any') query = query.eq('property_type', type);
    if (gender && gender !== 'any') query = query.eq('gender_pref', gender);
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (data) {
      let results = data as unknown as Listing[];
      if (budget) {
        const max = parseInt(budget);
        results = results.filter(l => l.costs && l.costs.total_monthly <= max);
      }
      setListings(results);
    }
    setLoading(false);
  }, [supabase, zoneId, type, gender, budget]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const resetFilters = () => {
    setZoneId('');
    setType('');
    setBudget('15000');
    setListingType('all');
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Browse Listings</h1>
        <div>
          <button className="btn btn-gold">+ List Property</button>
        </div>
      </div>
      <div className="listings-layout">
        <button 
          className={`mobile-filter-btn ${sidebarOpen ? 'active' : ''}`} 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-expanded={sidebarOpen}
        >
          <SlidersHorizontal style={{ width: '16px', height: '16px' }} />
          <span>Filters &amp; Sort</span>
          <ChevronDown className="filter-chevron" style={{ width: '16px', height: '16px', marginLeft: 'auto', transition: 'transform 0.3s ease', transform: sidebarOpen ? 'rotate(180deg)' : 'none' }} />
        </button>

        <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
          <h4>Zone</h4>
          <div id="zoneFilters">
            {zones.map(z => (
              <div key={z.zone_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ margin: 0 }}>
                  <input type="checkbox" className="zone" value={z.zone_id} checked={zoneId === z.zone_id.toString()} onChange={() => setZoneId(zoneId === z.zone_id.toString() ? '' : z.zone_id.toString())} /> {z.zone_name}
                </label>
                <button type="button" className="btn btn-outline btn-sm" style={{ padding: '2px 6px', border: 'none' }} onClick={() => setZoneId(z.zone_id.toString())} title="Show on Map">
                  <MapPin style={{ width: '14px', height: '14px', color: 'var(--primary)' }} />
                </button>
              </div>
            ))}
          </div>

          <h4>Property type</h4>
          <label><input type="checkbox" className="ptype" value="single_room" checked={type === 'single_room'} onChange={() => setType(type === 'single_room' ? '' : 'single_room')} /> Single Room</label>
          <label><input type="checkbox" className="ptype" value="shared_room" checked={type === 'shared_room'} onChange={() => setType(type === 'shared_room' ? '' : 'shared_room')} /> Shared Room</label>
          <label><input type="checkbox" className="ptype" value="full_mess" checked={type === 'full_mess'} onChange={() => setType(type === 'full_mess' ? '' : 'full_mess')} /> Full Mess</label>
          <label><input type="checkbox" className="ptype" value="sublet" checked={type === 'sublet'} onChange={() => setType(type === 'sublet' ? '' : 'sublet')} /> Sub-let</label>

          <h4>Listing type</h4>
          <label><input type="radio" name="ltype" value="all" checked={listingType === 'all'} onChange={() => setListingType('all')} /> All</label>
          <label><input type="radio" name="ltype" value="Landlord Listed" checked={listingType === 'Landlord Listed'} onChange={() => setListingType('Landlord Listed')} /> Landlord Listed</label>
          <label><input type="radio" name="ltype" value="Student Listed" checked={listingType === 'Student Listed'} onChange={() => setListingType('Student Listed')} /> Student Listed</label>

          <h4>Max monthly cost: <span className="range-val" id="budgetVal">৳{parseInt(budget).toLocaleString()}</span></h4>
          <input type="range" id="budget" min="1000" max="15000" step="500" value={budget} onChange={(e) => setBudget(e.target.value)} />

          <h4>Amenities</h4>
          <label><input type="checkbox" className="amen" value="attachedBathroom" /> Attached Bathroom</label>
          <label><input type="checkbox" className="amen" value="attachedKitchen" /> Kitchen</label>
          <label><input type="checkbox" className="amen" value="isFurnished" /> Furnished</label>
          <label><input type="checkbox" className="amen" value="rooftopAccess" /> Rooftop</label>
          <label><input type="checkbox" className="amen" value="powerBackup" /> Power Backup</label>
          <label><input type="checkbox" className="amen" value="liftAccess" /> Lift</label>

          <h4>Sort by</h4>
          <select id="sort" className="form-group" style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '8px' }}>
            <option value="cost_asc">Total Cost ↑</option>
            <option value="cost_desc">Total Cost ↓</option>
            <option value="newest">Newest</option>
            <option value="rating">Rating</option>
          </select>

          <div style={{ marginTop: '18px', display: 'flex', gap: '8px' }}>
            <button className="btn btn-primary btn-sm" onClick={fetchListings}>Apply</button>
            <button className="btn btn-outline btn-sm" onClick={resetFilters}>Reset</button>
          </div>
        </aside>

        <main>
          <div style={{ marginBottom: '12px', color: 'var(--gray)', fontSize: '14px' }}>
            Showing {listings.length} listings
          </div>
          
          <div className="grid-2" id="listingsGrid">
            {loading ? (
              <p style={{ color: 'var(--gray)', gridColumn: '1/-1', textAlign: 'center', padding: '40px 0' }}>Loading...</p>
            ) : listings.length === 0 ? (
              <p style={{ color: 'var(--gray)', gridColumn: '1/-1', textAlign: 'center', padding: '40px 0' }}>No listings match your filters.</p>
            ) : (
              listings.map(l => <ListingCard key={l.listing_id || l.id} listing={l} />)
            )}
          </div>
          
          <div id="map">
            <MapView 
              zones={zones} 
              selectedZoneId={zoneId ? parseInt(zoneId) : undefined} 
              onZoneSelect={(id) => setZoneId(id.toString())}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

export default function ListingsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>}>
      <ListingsContent />
    </Suspense>
  );
}
