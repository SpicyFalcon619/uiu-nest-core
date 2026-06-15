import { createClient } from '@/lib/supabase/server';
import ListingsClient from './ListingsClient';
import type { Zone, Listing } from '@/types';
import { Suspense } from 'react';

export const metadata = {
  title: 'Browse Listings - UIUNest',
  description: 'Find your next home near UIU.',
};

export default async function ListingsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const page = parseInt(params.page as string || '1');
  const zoneId = params.zone as string || '';
  const type = params.type as string || '';
  const gender = params.gender as string || '';
  const budget = parseInt(params.budget as string || '50000');
  
  const limit = 10;
  const offset = (page - 1) * limit;

  const supabase = await createClient();

  // Fetch zones for map
  const { data: zones } = await supabase.from('zones').select('*').order('zone_name');

  // Fetch listings with pagination
  let query = supabase.from('listings').select('*, costs:utility_costs(*)', { count: 'exact' }).neq('status', 'occupied');

  if (zoneId) query = query.eq('zone_id', parseInt(zoneId));
  if (type && type !== 'any') query = query.eq('property_type', type);
  if (gender && gender !== 'any') query = query.eq('gender_pref', gender);
  
  const { data, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  let initialListings: Listing[] = [];
  if (data) {
    initialListings = data as unknown as Listing[];
    if (budget) {
      initialListings = initialListings.filter(l => l.costs && l.costs.total_monthly <= budget);
    }
  }

  const totalPages = count ? Math.ceil(count / limit) : 1;

  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;
  
  let isAdmin = false;
  if (isLoggedIn) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role === 'admin') isAdmin = true;
  }

  return (
    <Suspense fallback={<div style={{ padding: '60px', textAlign: 'center' }}>Loading Listings...</div>}>
      <ListingsClient 
        initialListings={initialListings} 
        zones={(zones || []) as Zone[]} 
        currentPage={page}
        totalPages={totalPages}
        isLoggedIn={isLoggedIn}
        isAdmin={isAdmin}
      />
    </Suspense>
  );
}
