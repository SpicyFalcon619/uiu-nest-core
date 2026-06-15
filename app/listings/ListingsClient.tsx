'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Listing, Zone } from '@/types';
import ListingCard from '@/components/ListingCard';
import MapView from '@/components/MapView';
import CustomSelect from '@/components/CustomSelect';
import CreateListingModal from '@/components/modals/CreateListingModal';
import { SlidersHorizontal, ChevronDown, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ListingsClient({ initialListings, zones, currentPage, totalPages, isLoggedIn, isAdmin }: { initialListings: Listing[], zones: Zone[], currentPage: number, totalPages: number, isLoggedIn: boolean, isAdmin?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State reflects URL searchParams initially
  const [zoneId, setZoneId] = useState(searchParams.get('zone') || '');
  const [type, setType] = useState(searchParams.get('type') || '');
  const [budget, setBudget] = useState(searchParams.get('budget') || '50000');
  const [listingType, setListingType] = useState('all');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [listModalOpen, setListModalOpen] = useState(false);

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (zoneId) params.set('zone', zoneId); else params.delete('zone');
    if (type) params.set('type', type); else params.delete('type');
    if (budget && budget !== '50000') params.set('budget', budget); else params.delete('budget');
    if (sort && sort !== 'newest') params.set('sort', sort); else params.delete('sort');
    params.set('page', '1'); // reset page on filter change
    
    router.push(`?${params.toString()}`);
  };

  const resetFilters = () => {
    setZoneId('');
    setType('');
    setBudget('50000');
    setListingType('all');
    setSort('newest');
    router.push('/listings');
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Browse Listings</h1>
        <div id="createListingBtnMount">
          {isLoggedIn && !isAdmin && (
            <button className="btn btn-primary" onClick={() => setListModalOpen(true)}>+ Create Listing</button>
          )}
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
          <input type="range" id="budget" min="1000" max="50000" step="500" value={budget} onChange={(e) => setBudget(e.target.value)} />

          <h4>Amenities</h4>
          <label><input type="checkbox" className="amen" value="attachedBathroom" /> Attached Bathroom</label>
          <label><input type="checkbox" className="amen" value="attachedKitchen" /> Kitchen</label>
          <label><input type="checkbox" className="amen" value="isFurnished" /> Furnished</label>
          <label><input type="checkbox" className="amen" value="rooftopAccess" /> Rooftop</label>
          <label><input type="checkbox" className="amen" value="powerBackup" /> Power Backup</label>
          <label><input type="checkbox" className="amen" value="liftAccess" /> Lift</label>

          <h4>Sort by</h4>
          <CustomSelect
            name="sort"
            value={sort}
            onChange={(val) => setSort(val)}
            options={[
              { value: 'cost_asc', label: 'Total Cost ↑' },
              { value: 'cost_desc', label: 'Total Cost ↓' },
              { value: 'newest', label: 'Newest' },
              { value: 'rating', label: 'Rating' }
            ]}
          />

          <div style={{ marginTop: '18px', display: 'flex', gap: '8px' }}>
            <button className="btn btn-primary btn-sm" onClick={applyFilters}>Apply</button>
            <button className="btn btn-outline btn-sm" onClick={resetFilters}>Reset</button>
          </div>
        </aside>

        <main>
          <div style={{ marginBottom: '12px', color: 'var(--gray)', fontSize: '14px' }}>
            Showing {initialListings.length} listings (Page {currentPage} of {totalPages})
          </div>
          
          <div className="grid-2" id="listingsGrid">
            {initialListings.length === 0 ? (
              <p style={{ color: 'var(--gray)', gridColumn: '1/-1', textAlign: 'center', padding: '40px 0' }}>No listings match your filters.</p>
            ) : (
              initialListings.map(l => <ListingCard key={l.listing_id || l.id} listing={l} />)
            )}
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '32px', alignItems: 'center' }}>
              <button 
                className="btn btn-outline btn-sm" 
                disabled={currentPage <= 1} 
                onClick={() => handlePageChange(currentPage - 1)}
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <span style={{ fontSize: '14px', fontWeight: 500 }}>
                Page {currentPage} of {totalPages}
              </span>
              <button 
                className="btn btn-outline btn-sm" 
                disabled={currentPage >= totalPages} 
                onClick={() => handlePageChange(currentPage + 1)}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
          
          <div id="map">
            <MapView 
              zones={zones} 
              selectedZoneId={zoneId ? parseInt(zoneId) : undefined} 
              onZoneSelect={(id) => setZoneId(id.toString())}
            />
          </div>
        </main>
      </div>

      <CreateListingModal 
        isOpen={listModalOpen} 
        onClose={() => setListModalOpen(false)} 
        onSuccess={() => {
          setListModalOpen(false);
          // optionally refresh data
        }} 
      />
    </div>
  );
}


