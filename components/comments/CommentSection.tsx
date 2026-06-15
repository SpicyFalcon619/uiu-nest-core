'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { addComment, voteComment } from '@/app/actions/comments';
import { toast } from 'sonner';
import { fmtDate } from '@/lib/utils';
import Link from 'next/link';

interface Comment {
  comment_id: number;
  item_id: number;
  user_id: string;
  content: string;
  upvotes: number;
  downvotes: number;
  created_at: string;
  user?: { name: string; profile_pic?: string };
  user_vote?: 1 | -1 | null;
}

interface CommentSectionProps {
  itemId: number;
  initialComments: Comment[];
  isLoggedIn: boolean;
  currentUserId?: string;
}

export default function CommentSection({ itemId, initialComments, isLoggedIn, currentUserId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !isLoggedIn) return;

    setIsSubmitting(true);
    const res = await addComment(itemId, newComment);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Comment posted!');
      setNewComment('');
      // Optimistic update would be ideal here, but server revalidation handles it on page refresh.
      // We will reload to get the new comment from the server for simplicity
      window.location.reload();
    }
    setIsSubmitting(false);
  };

  const handleVote = async (commentId: number, type: 1 | -1) => {
    if (!isLoggedIn) {
      toast.error('You must be logged in to vote.');
      return;
    }

    // Optimistic UI update
    setComments(prev => prev.map(c => {
      if (c.comment_id === commentId) {
        let newUp = c.upvotes;
        let newDown = c.downvotes;
        let newVote = type;

        if (c.user_vote === type) {
          // Toggle off
          newVote = null as any;
          if (type === 1) newUp--; else newDown--;
        } else {
          if (c.user_vote === 1) newUp--;
          if (c.user_vote === -1) newDown--;
          if (type === 1) newUp++; else newDown++;
        }

        return { ...c, upvotes: Math.max(0, newUp), downvotes: Math.max(0, newDown), user_vote: newVote };
      }
      return c;
    }));

    const res = await voteComment(commentId, type, itemId);
    if (res.error) {
      toast.error(res.error);
      // Fallback: reload page
      window.location.reload();
    }
  };

  return (
    <div className="card" style={{ padding: '32px', marginBottom: '24px' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
        <MessageSquare size={20} /> Comments ({comments.length})
      </h3>

      {isLoggedIn ? (
        <form onSubmit={handleSubmit} style={{ marginBottom: '32px' }}>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Ask a question or leave a comment..."
            style={{ width: '100%', minHeight: '80px', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '12px', fontFamily: 'inherit' }}
            disabled={isSubmitting}
          />
          <button type="submit" className="btn btn-primary" disabled={isSubmitting || !newComment.trim()}>
            {isSubmitting ? 'Posting...' : 'Post Comment'}
          </button>
        </form>
      ) : (
        <div style={{ padding: '16px', backgroundColor: 'var(--bg-color)', borderRadius: '8px', textAlign: 'center', marginBottom: '32px' }}>
          <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 500 }}>Log in to leave a comment</Link>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {comments.length === 0 ? (
          <p style={{ color: 'var(--gray)' }}>No comments yet. Be the first to ask something!</p>
        ) : (
          comments.map(comment => (
            <div key={comment.comment_id} style={{ display: 'flex', gap: '16px', paddingBottom: '20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>
                {comment.user?.name ? comment.user.name.substring(0, 2).toUpperCase() : 'US'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600 }}>{comment.user?.name || 'Anonymous User'}</span>
                  <span style={{ fontSize: '12px', color: 'var(--gray)' }}>{fmtDate(comment.created_at)}</span>
                </div>
                <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>{comment.content}</p>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <button 
                    onClick={() => handleVote(comment.comment_id, 1)}
                    style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: comment.user_vote === 1 ? 'var(--primary)' : 'var(--gray)', padding: 0 }}
                  >
                    <ThumbsUp size={16} fill={comment.user_vote === 1 ? 'var(--primary)' : 'none'} />
                    <span style={{ fontSize: '14px', fontWeight: comment.user_vote === 1 ? 600 : 400 }}>{comment.upvotes}</span>
                  </button>
                  <button 
                    onClick={() => handleVote(comment.comment_id, -1)}
                    style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: comment.user_vote === -1 ? 'var(--danger)' : 'var(--gray)', padding: 0 }}
                  >
                    <ThumbsDown size={16} fill={comment.user_vote === -1 ? 'var(--danger)' : 'none'} />
                    <span style={{ fontSize: '14px', fontWeight: comment.user_vote === -1 ? 600 : 400 }}>{comment.downvotes}</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
