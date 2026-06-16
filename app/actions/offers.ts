'use server';

import { createClient } from '@/lib/supabase/server';
import { createUserNotification } from './notifications';
import { revalidatePath } from 'next/cache';
import { fmt } from '@/lib/utils';

export async function acceptOffer(offerId: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: offer } = await supabase
    .from('offers')
    .select('*, item:items!inner(title, seller_id, item_id)')
    .eq('offer_id', offerId)
    .single();

  if (!offer) return { error: 'Offer not found' };
  if ((offer.item as any).seller_id !== user.id) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('offers')
    .update({ status: 'accepted' })
    .eq('offer_id', offerId);

  if (error) return { error: error.message };

  await supabase.from('items').update({ status: 'sold' }).eq('item_id', (offer.item as any).item_id);

  await createUserNotification(
    offer.buyer_id,
    'offer_accepted',
    `Your offer for "${(offer.item as any).title}" was accepted! Message the seller to arrange the exchange.`,
    `/messages`
  );

  revalidatePath('/dashboard');
  revalidatePath(`/exchange/${(offer.item as any).item_id}`);
  return { success: true };
}

export async function rejectOffer(offerId: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: offer } = await supabase
    .from('offers')
    .select('*, item:items!inner(title, seller_id, item_id)')
    .eq('offer_id', offerId)
    .single();

  if (!offer) return { error: 'Offer not found' };
  if ((offer.item as any).seller_id !== user.id) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('offers')
    .update({ status: 'rejected' })
    .eq('offer_id', offerId);

  if (error) return { error: error.message };

  await createUserNotification(
    offer.buyer_id,
    'offer_rejected',
    `Your offer for "${(offer.item as any).title}" was declined by the seller.`,
    `/dashboard?tab=offers`
  );

  revalidatePath('/dashboard');
  return { success: true };
}

export async function counterOffer(offerId: number, counterPrice: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: offer } = await supabase
    .from('offers')
    .select('*, item:items!inner(title, seller_id, item_id)')
    .eq('offer_id', offerId)
    .single();

  if (!offer) return { error: 'Offer not found' };
  if ((offer.item as any).seller_id !== user.id) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('offers')
    .update({ status: 'countered', counter_price: counterPrice })
    .eq('offer_id', offerId);

  if (error) return { error: error.message };

  await createUserNotification(
    offer.buyer_id,
    'offer_countered',
    `Counter-offer of ${fmt(counterPrice)} for "${(offer.item as any).title}". Accept or reject in your dashboard.`,
    `/dashboard?tab=offers`
  );

  revalidatePath('/dashboard');
  return { success: true };
}

export async function withdrawOffer(offerId: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: offer } = await supabase
    .from('offers')
    .select('buyer_id')
    .eq('offer_id', offerId)
    .single();

  if (!offer || offer.buyer_id !== user.id) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('offers')
    .update({ status: 'withdrawn' })
    .eq('offer_id', offerId);

  if (error) return { error: error.message };

  revalidatePath('/dashboard');
  return { success: true };
}

export async function acceptCounterOffer(offerId: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: offer } = await supabase
    .from('offers')
    .select('*, item:items!inner(title, seller_id, item_id)')
    .eq('offer_id', offerId)
    .single();

  if (!offer || offer.buyer_id !== user.id) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('offers')
    .update({ status: 'accepted' })
    .eq('offer_id', offerId);

  if (error) return { error: error.message };

  await supabase.from('items').update({ status: 'sold' }).eq('item_id', (offer.item as any).item_id);

  await createUserNotification(
    (offer.item as any).seller_id,
    'offer_accepted',
    `The buyer accepted your counter-offer for "${(offer.item as any).title}". Message them to arrange the exchange.`,
    `/messages`
  );

  revalidatePath('/dashboard');
  return { success: true };
}

export async function submitOfferAction(
  itemId: number,
  sellerId: string,
  itemTitle: string,
  offerPrice: number,
  message?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: existing } = await supabase
    .from('offers')
    .select('offer_id')
    .eq('item_id', itemId)
    .eq('buyer_id', user.id)
    .in('status', ['pending', 'countered'])
    .maybeSingle();

  if (existing) return { error: 'You already have an active offer for this item.' };

  const { error } = await supabase.from('offers').insert({
    item_id: itemId,
    buyer_id: user.id,
    offer_price: offerPrice,
    message: message || null,
    status: 'pending',
  });

  if (error) return { error: error.message };

  const { data: buyerProfile } = await supabase.from('profiles').select('name').eq('id', user.id).single();
  const buyerName = buyerProfile?.name || 'Someone';

  await createUserNotification(
    sellerId,
    'new_offer',
    `${buyerName} offered ${fmt(offerPrice)} for "${itemTitle}". View in dashboard.`,
    `/dashboard?tab=offers`
  );

  revalidatePath(`/exchange/${itemId}`);
  return { success: true };
}
