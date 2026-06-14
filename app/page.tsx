'use client';

import { useRouter } from 'next/navigation';
import { ShieldCheck, Users, ShoppingBag, Receipt, BadgeCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import ListingCard from '@/components/ListingCard';

export default function Home() {
  const router = useRouter();
  const supabase = createClient();
  const [listings, setListings] = useState([]);

  useEffect(() => {
    async function fetchListings() {
      const { data } = await supabase.from('listings').select('*, costs:utility_costs(*)').limit(4).order('created_at', { ascending: false });
      if (data) setListings(data as any);
    }
    fetchListings();
  }, []);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    const zone = formData.get('zone');
    const type = formData.get('type');
    const budget = formData.get('budget');
    if (zone) params.set('zone', zone as string);
    if (type) params.set('type', type as string);
    if (budget) params.set('budget', budget as string);
    router.push(`/listings?${params.toString()}`);
  };

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <h1>Find your home near UIU.<br /><span className="hero-accent">No hidden costs. Ever.</span></h1>
          <p>The only platform that actually shows every single bill like rent, electricity, gas, and internet right upfront, before you commit to a single taka.</p>
          <form className="hero-search" onSubmit={handleSearch}>
            <div className="hero-search-field">
              <label className="hs-label">Zone</label>
              <select name="zone" defaultValue="">
                <option value="">All Zones</option>
                <option value="1">UIU Campus Area</option>
                <option value="2">Sayed Nagar</option>
                <option value="3">Shatarkul</option>
                <option value="4">Nurer Chala</option>
                <option value="5">Aftabnagar</option>
                <option value="6">Notun Bazar</option>
              </select>
            </div>
            <span className="search-divider"></span>
            <div className="hero-search-field">
              <label className="hs-label">Room Type</label>
              <select name="type" defaultValue="">
                <option value="">Any type</option>
                <option value="single_room">Single Room</option>
                <option value="shared_room">Shared Room</option>
                <option value="full_mess">Full Mess</option>
                <option value="sublet">Sub-let</option>
              </select>
            </div>
            <span className="search-divider"></span>
            <div className="hero-search-field">
              <label className="hs-label">Max Budget</label>
              <input type="number" name="budget" placeholder="৳ 15,000" />
            </div>
            <button type="submit" className="btn btn-primary hs-btn">Search Listings</button>
          </form>
          <p className="hero-trust">Trusted by <strong>UIU students</strong> · Verified landlords · Transparent billing</p>
        </div>
      </section>

      <div className="container">
        <div className="bento-label">Everything you need. Nothing you don't.</div>
        <div className="bento-grid">
          <div className="bento-card bento-wide bento-emerald">
            <div className="bento-icon"><ShieldCheck size={32} /></div>
            <h3>No Hidden Costs</h3>
            <p>Rent, electricity (individual or shared), gas, water, internet, and caretaker fees are all tracked separately. We automatically sum them up into a true monthly total that's displayed right on the card.</p>
            <div className="bento-tag">Cost Transparency</div>
          </div>

          <div className="bento-card bento-tall">
            <div className="bento-icon bento-icon-soft"><Users size={32} /></div>
            <h3>Flatmate Matching</h3>
            <p>An 8-dimension compatibility score that compares your sleep schedule, diet, cleanliness, noise tolerance, guest rules, and more.</p>
            <div className="bento-score-preview">
              <div className="bsc-pill bsc-high"><span>High Match</span> <span>92%</span></div>
              <div className="bsc-pill bsc-mid"><span>Good Match</span> <span>71%</span></div>
              <div className="bsc-pill bsc-low"><span>Low Match</span> <span>38%</span></div>
            </div>
          </div>

          <div className="bento-card">
            <div className="bento-icon bento-icon-soft"><ShoppingBag size={32} /></div>
            <h3>UIUNest Exchange</h3>
            <p>Buy and sell fans, tables, and appliances with people right in your campus zone. We've even built in a simple offer and counter-offer system.</p>
          </div>

          <div className="bento-card">
            <div className="bento-icon bento-icon-soft"><Receipt size={32} /></div>
            <h3>Mess Bill Manager</h3>
            <p>Split monthly utility bills automatically. Track who paid, who hasn't, across every resident.</p>
          </div>

          <div className="bento-card bento-wide bento-surface">
            <div className="bento-icon bento-icon-soft"><BadgeCheck size={32} /></div>
            <h3>Verified Landlords &amp; Reviews</h3>
            <p>NID-verified landlord badges, multi-dimension property reviews (accuracy, cleanliness, safety, value, landlord responsiveness), and a formal complaint system with admin resolution.</p>
            <div className="bento-tag">Trust Layer</div>
          </div>
        </div>

        {listings.length > 0 && (
          <section className="section" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="section-head">
              <h2>Latest listings near UIU</h2>
              <a href="/listings">Browse all listings →</a>
            </div>
            <div className="grid-4" id="latestListings">
              {listings.map(l => (
                <ListingCard key={(l as any).id} listing={l as any} />
              ))}
            </div>
          </section>
        )}

        <section className="section">
          <div className="section-head">
            <h2>UIUNest Exchange: Buy and sell near campus</h2>
            <a href="/exchange">Browse all items →</a>
          </div>
          <div className="grid-4" id="latestItems">
            <p style={{ color: 'var(--gray)', gridColumn: '1/-1', textAlign: 'center' }}>No items listed recently.</p>
          </div>
        </section>

        <section className="section" style={{ borderBottom: 'none' }}>
          <h2 className="section-center-title">How it works</h2>
          <div className="steps">
            <div className="step"><div className="step-num">1</div><h3>Register</h3><p>Sign up with your UIU email address.</p></div>
            <div className="step"><div className="step-num">2</div><h3>Browse</h3><p>Browse verified listings with full cost breakdown.</p></div>
            <div className="step"><div className="step-num">3</div><h3>Connect</h3><p>Connect with landlords and compatible flatmates.</p></div>
          </div>
        </section>
      </div>
    </>
  );
}
