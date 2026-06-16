import { redirect } from 'next/navigation';

// Deep-link: /messages/[conversationId] → redirect to inbox with that convo pre-selected
// MessagesClient reads the hash or we could use search params.
// Simplest: just redirect to the inbox — the user sees it there.
export default async function ConversationRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/messages?convo=${id}`);
}
