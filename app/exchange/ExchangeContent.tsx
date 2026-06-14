'use client';

import { useState, useMemo } from 'react';
import type { Item, Zone } from '@/types';
import ExchangeItemCard from '@/components/ExchangeItemCard';
import SellItemModal from '@/components/modals/SellItemModal';
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

      <SellItemModal 
        isOpen={sellModalOpen} 
        onClose={() => setSellModalOpen(false)} 
        zones={zones}
        onSuccess={() => { window.location.reload(); }} // Simple reload to refresh data
      />
    </div>
  );
}
