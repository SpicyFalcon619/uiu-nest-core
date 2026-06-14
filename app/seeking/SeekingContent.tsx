'use client';

import { useState, useMemo } from 'react';
import type { SeekingPost, Zone } from '@/types';
import SeekCard from '@/components/SeekCard';
import CreateSeekingModal from '@/components/modals/CreateSeekingModal';

export default function SeekingContent({
  posts,
  zones,
  isLoggedIn
}: {
  posts: SeekingPost[];
  zones: Zone[];
  isLoggedIn: boolean;
}) {
  const [filterType, setFilterType] = useState('all');
  const [filterZone, setFilterZone] = useState('all');
  const [filterGender, setFilterGender] = useState('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const filteredPosts = useMemo(() => {
    let result = posts.filter(p => p.status === 'active');

    if (filterType !== 'all') {
      result = result.filter(p => p.property_type === filterType || p.property_type === 'any');
    }
    if (filterZone !== 'all') {
      result = result.filter(p => p.zone === filterZone);
    }
    if (filterGender !== 'all') {
      result = result.filter(p => p.preferred_gender === filterGender || p.preferred_gender === 'any');
    }

    return result;
  }, [posts, filterType, filterZone, filterGender]);

  return (
    <div className="container" style={{ padding: '40px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title" style={{ margin: '0 0 8px 0' }}>Seeking Flatmates</h1>
          <p style={{ margin: 0, color: 'var(--gray)' }}>Find students looking for rooms or flatmates near UIU.</p>
        </div>
        <div>
          {isLoggedIn ? (
            <button className="btn btn-gold" onClick={() => setCreateModalOpen(true)}>+ Post Ad</button>
          ) : (
            <button className="btn btn-gold" onClick={() => window.location.href = '/login'}>Log in to Post</button>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'end' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Looking For</label>
          <div className="custom-select-wrapper">
            <select value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="all">Any Property Type</option>
              <option value="single_room">Single Room</option>
              <option value="shared_room">Shared Room</option>
              <option value="full_mess">Full Mess</option>
              <option value="sublet">Sublet</option>
            </select>
          </div>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Zone</label>
          <div className="custom-select-wrapper">
            <select value={filterZone} onChange={e => setFilterZone(e.target.value)}>
              <option value="all">All Zones</option>
              {zones.map(z => (
                <option key={z.zone_id} value={z.zone_name}>{z.zone_name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Preferred Gender</label>
          <div className="custom-select-wrapper">
            <select value={filterGender} onChange={e => setFilterGender(e.target.value)}>
              <option value="all">Any Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid-3">
        {filteredPosts.length > 0 ? (
          filteredPosts.map(post => (
            <SeekCard key={post.post_id || post.id} post={post} isLoggedIn={isLoggedIn} />
          ))
        ) : (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: 'var(--gray)', backgroundColor: 'white', borderRadius: '12px', border: '1px dashed var(--border)' }}>
            No seeking posts match your filters.
          </div>
        )}
      </div>

      <CreateSeekingModal 
        isOpen={createModalOpen} 
        onClose={() => setCreateModalOpen(false)} 
        zones={zones}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
}

