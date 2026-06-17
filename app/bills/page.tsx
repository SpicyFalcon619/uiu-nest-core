import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BillsContent from './BillsContent';
import type { MonthlyBill, BillPayment } from '@/types';

export const metadata = {
  title: 'Bills & Payments - UIUNest',
  description: 'Manage your flat bills and payments.',
};

export default async function BillsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch profile to know role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, id, name')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/login');
  }

  let billsData: any[] = [];

  if (profile.role === 'landlord') {
    // Landlord: Fetch bills for all their listings
    const { data: landlordBills } = await supabase
      .from('monthly_bills')
      .select(`
        *,
        listing:listings!inner(user_id, title),
        payments:bill_payments(
          *,
          resident:profiles!bill_payments_resident_user_id_fkey(name)
        )
      `)
      .eq('listings.user_id', user.id)
      .order('created_at', { ascending: false });
      
    billsData = landlordBills || [];
  } else {
    // Student: Fetch bills where they have a payment record
    const { data: studentPayments } = await supabase
      .from('bill_payments')
      .select(`
        *,
        bill:monthly_bills(
          *,
          listing:listings(title)
        )
      `)
      .eq('resident_user_id', user.id)
      .order('created_at', { ascending: false });
      
    if (studentPayments) {
      // Group by bill
      const billMap = new Map();
      studentPayments.forEach((p: any) => {
        if (p.bill) {
          const billKey = p.bill.bill_id ?? p.bill.id;
          if (!billMap.has(billKey)) {
            billMap.set(billKey, {
              ...p.bill,
              payments: [{ ...p, resident: { name: profile.name } }]
            });
          }
        }
      });
      billsData = Array.from(billMap.values());
    }
  }

  // Fetch listings for bill creation (landlords get their own, others get an empty list)
  let myListings: any[] = [];
  if (profile.role === 'landlord') {
    const { data: listings } = await supabase
      .from('listings')
      .select('listing_id, id, title')
      .eq('user_id', user.id)
      .in('status', ['occupied', 'soon_vacant']);
    myListings = listings || [];
  }

  return (
    <div className="container" style={{ padding: '40px 0' }}>
      <h1 className="page-title">Bills Manager</h1>
      <BillsContent 
        initialBills={billsData} 
        role={profile.role} 
        userId={user.id}
        myListings={myListings}
      />
    </div>
  );
}
