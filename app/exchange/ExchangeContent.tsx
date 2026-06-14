'use client';

import { useState, useMemo } from 'react';
import type { Item, Zone } from '@/types';
import ExchangeItemCard from '@/components/ExchangeItemCard';
import { fmt } from '@/lib/utils';

export default function ExchangeContent({
  items,
  zones,
  isLoggedIn
}: {
  items: Item[];
  zones: Zone[];
  isLoggedIn: boolean;
}) {
  const [filterCat, setFilterCat] = useState('all');
  const [filterCond, setFilterCond] = useState('all');
  const [filterZone, setFilterZone] = useState('all');
  const [maxPrice, setMaxPrice] = useState(20000);
  const [sort, setSort] = useState('newest');
  const [sellModalOpen, setSellModalOpen] = useState(false);

  const filteredItems = useMemo(() => {
    let result = items.filter(it => {
      if (it.status === 'sold') return false;
      if (filterCat !== 'all' && it.category !== filterCat) return false;
      if (filterCond !== 'all' && it.item_condition !== filterCond) return false;
      if (filterZone !== 'all' && it.zone !== filterZone) return false;
      if (it.asking_price > maxPrice) return false;
      return true;
    });

    if (sort === 'lo') result.sort((a, b) => a.asking_price - b.asking_price);
    if (sort === 'hi') result.sort((a, b) => b.asking_price - a.asking_price);
    if (sort === 'newest') result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return result;
  }, [items, filterCat, filterCond, filterZone, maxPrice, sort]);

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
        <h1 className="page-title" style={{ margin: 0 }}>UIUNest Exchange</h1>
        <div id="sellBtnMount">
          {isLoggedIn && (
            <button className="btn btn-gold" onClick={() => setSellModalOpen(true)}>+ Sell Item</button>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'end' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Category</label>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="all">All</option>
            <option value="furniture">Furniture</option>
            <option value="appliances">Appliances</option>
            <option value="electronics">Electronics</option>
            <option value="kitchen">Kitchen</option>
            <option value="study">Study</option>
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Condition</label>
          <select value={filterCond} onChange={e => setFilterCond(e.target.value)}>
            <option value="all">All</option>
            <option value="new">New</option>
            <option value="like_new">Like New</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Zone</label>
          <select value={filterZone} onChange={e => setFilterZone(e.target.value)}>
            <option value="all">All</option>
            {zones.map(z => (
              <option key={z.zone_id} value={z.zone_name}>{z.zone_name}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0, minWidth: '200px' }}>
          <label>Max price: <span id="priceVal">{fmt(maxPrice)}</span></label>
          <input
            type="range"
            min="0"
            max="20000"
            step="500"
            value={maxPrice}
            onChange={e => setMaxPrice(parseInt(e.target.value))}
          />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Sort</label>
          <select value={sort} onChange={e => setSort(e.target.value)}>
            <option value="newest">Newest</option>
            <option value="lo">Price ↑</option>
            <option value="hi">Price ↓</option>
          </select>
        </div>
      </div>

      <div className="grid-3" id="itemsGrid">
        {filteredItems.length > 0 ? (
          filteredItems.map(it => (
            <ExchangeItemCard key={it.item_id} item={it} isLoggedIn={isLoggedIn} />
          ))
        ) : (
          <p style={{ color: 'var(--gray)', gridColumn: '1/-1', textAlign: 'center', padding: '40px 0' }}>
            No items listed on the exchange yet.
          </p>
        )}
      </div>

      <div className={`modal-bg ${sellModalOpen ? 'open' : ''}`} id="sellItemModal">
        <div className="modal">
          <button className="modal-close" onClick={() => setSellModalOpen(false)}>×</button>
          <h3>Sell an Item</h3>
          <form id="sellItemForm" onSubmit={e => e.preventDefault()}>
            <div className="form-group"><label>Title</label><input type="text" id="itmTitle" required placeholder="e.g. Study Table with Drawers" /></div>
            <div className="grid-2">
              <div className="form-group"><label>Category</label>
                <select id="itmCategory" required>
                  <option value="furniture">Furniture</option>
                  <option value="appliances">Appliances</option>
                  <option value="electronics">Electronics</option>
                  <option value="kitchen">Kitchen</option>
                  <option value="study">Study</option>
                </select>
              </div>
              <div className="form-group"><label>Condition</label>
                <select id="itmCondition" required>
                  <option value="new">New</option>
                  <option value="like_new">Like New</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                </select>
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group"><label>Price (৳)</label><input type="number" id="itmPrice" required min="0" /></div>
              <div className="form-group"><label>Zone</label>
                <select id="itmZone" required>
                  {zones.map(z => (
                    <option key={z.zone_id} value={z.zone_id}>{z.zone_name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group"><label>Linked Flat/Listing (Optional)</label>
              <select id="itmLinkListing">
                <option value="">None (Not linked)</option>
              </select>
            </div>
            <div className="form-group"><label>Description</label><textarea id="itmDesc" required placeholder="Describe the item condition, size, age, etc."></textarea></div>
            <div className="grid-2">
              <div className="form-group"><label>Thumbnail Image (Required)</label><input type="file" id="itmThumbnail" accept="image/*" required style={{ padding: '8px', border: '1px solid var(--border)', borderRadius: '6px', width: '100%' }} /></div>
              <div className="form-group"><label>Gallery Photos (Optional)</label><input type="file" id="itmPhotos" accept="image/*" multiple style={{ padding: '8px', border: '1px solid var(--border)', borderRadius: '6px', width: '100%' }} /></div>
            </div>
            <button type="submit" className="btn btn-primary btn-block">Post Item for Sale</button>
          </form>
        </div>
      </div>
    </div>
  );
}
