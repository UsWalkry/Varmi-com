import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, MoreHorizontal } from 'lucide-react';
import { mysqlAPI } from '@/lib/mysql-api';
import { toast } from 'sonner';
import { maskDisplayName } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth-mysql';

interface Comment {
  id: string;
  user_id: string;
  userName: string;
  comment: string;
  created_at: string;
  is_owner_reply: boolean;
  parent_comment_id?: string | null;
  is_visible?: boolean;
  isPending?: boolean; // Frontend flag
  visibility_state?: 'PRIVATE' | 'PUBLIC'; // Visibility state
  is_first_seller_reply_exists?: boolean;
  replies: Comment[];
}

interface ListingCommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  isOwner: boolean;
  initialThreadId?: string | null; // Auto-expand this thread
  onCommentAdded?: () => void;
}

export default function ListingCommentsModal({
  isOpen,
  onClose,
  listingId,
  isOwner,
  initialThreadId,
  onCommentAdded
}: ListingCommentsModalProps) {
  const { user } = useAuth(); // Get current user
  const [comments, setComments] = useState<Comment[]>([]);
  const [pendingComments, setPendingComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [showReplyInput, setShowReplyInput] = useState<{ [key: string]: boolean }>({}); // Parent'te tut
  const [loading, setLoading] = useState(true); // Modal açıldığında loading=true olsun
  const [submitting, setSubmitting] = useState(false);
  const [expandedThreads, setExpandedThreads] = useState<{ [key: string]: boolean }>({});

  // Helper: Flatten all replies into single array (Instagram style - all replies flat)
  const flattenReplies = (comment: Comment, level: number = 0): Array<Comment & { level: number }> => {
    const flattened: Array<Comment & { level: number }> = [{ ...comment, level }];
    if (comment.replies && comment.replies.length > 0) {
      comment.replies.forEach(reply => {
        flattened.push(...flattenReplies(reply, level + 1));
      });
    }
    return flattened;
  };

  // Debug logs
  console.log('🔍 Modal State:', {
    isOpen,
    isOwner,
    listingId,
    commentsCount: comments.length,
    pendingCount: pendingComments.length,
    loading,
    comments,
    pendingComments
  });

  useEffect(() => {
    if (isOpen) {
      console.log('🚀 Modal opened, loading comments...');
      setLoading(true);
      loadComments();
      loadPendingComments();
    } else {
      // Modal kapandığında state'i temizle
      setComments([]);
      setPendingComments([]);
      setLoading(true);
      setExpandedThreads({});
    }
  }, [isOpen, listingId]);

  // Separate effect for thread expansion after comments load
  useEffect(() => {
    if (isOpen && comments.length > 0 && !loading) {
      // Auto-expand only initial thread if specified, otherwise collapse all
      if (initialThreadId) {
        console.log('📌 Auto-expanding ONLY thread:', initialThreadId);
        // Create object with ONLY this thread expanded
        setExpandedThreads({ [initialThreadId]: true });
      } else {
        console.log('📌 No initial thread - all collapsed');
        // No initial thread - all collapsed
        setExpandedThreads({});
      }
    }
  }, [isOpen, initialThreadId, comments, loading]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const response = await mysqlAPI.getListingComments(listingId);
      console.log('📝 Comments response:', response);
      if (response.success) {
        console.log('📝 Setting comments:', response.comments);
        setComments(response.comments || []);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingComments = async () => {
    try {
      console.log('⏳ Loading pending comments for listing:', listingId);
      const response = await mysqlAPI.getPendingComments(listingId);
      console.log('⏳ Pending comments response:', response);
      if (response.success) {
        console.log('⏳ Setting pending comments:', response.comments);
        setPendingComments(response.comments || []);
      } else {
        console.error('⏳ Failed to load pending comments:', response.error);
        setPendingComments([]);
      }
    } catch (error) {
      console.error('⏳ Error loading pending comments:', error);
      setPendingComments([]);
    }
  };

  // Merge visible and pending comments into thread structure
  const getMergedComments = () => {
    console.log('🔀 Merging comments:', {
      visibleCount: comments.length,
      pendingCount: pendingComments.length,
      comments,
      pendingComments
    });
    
    // Create a map of all comments (visible + pending)
    const allComments = [...comments];
    const pendingMap: { [key: string]: any[] } = {};
    
    // Create a Set of visible comment IDs to avoid duplicates
    const visibleIds = new Set(comments.map(c => c.id));
    
    // Group pending comments by their parent_comment_id
    pendingComments.forEach(pending => {
      console.log('🔍 Processing pending:', pending.id, 'parent:', pending.parent_comment_id);
      if (pending.parent_comment_id) {
        if (!pendingMap[pending.parent_comment_id]) {
          pendingMap[pending.parent_comment_id] = [];
        }
        pendingMap[pending.parent_comment_id].push({ ...pending, isPending: true });
      } else {
        // Root pending comments - only add if not already in visible
        if (!visibleIds.has(pending.id)) {
          allComments.push({ ...pending, isPending: true, replies: [] });
        } else {
          console.log('⚠️ Skipping duplicate root comment:', pending.id);
        }
      }
    });
    
    console.log('📊 Pending map:', pendingMap);
    
    // Attach pending replies to visible comments (recursively)
    const attachPendingReplies = (comment: any): any => {
      const commentWithPending = { ...comment };
      
      // Debug: Check if pending exists for this comment
      console.log('🔍 Checking pending for comment:', comment.id, 'exists in map?', !!pendingMap[comment.id]);
      
      // Add pending replies to this comment's replies (avoid duplicates)
      if (pendingMap[comment.id]) {
        console.log('✅ Found pending replies for comment:', comment.id, pendingMap[comment.id].length);
        
        // Get existing reply IDs to avoid duplicates
        const existingReplyIds = new Set((comment.replies || []).map((r: any) => r.id));
        
        // Filter out pending replies that are already in visible replies
        const uniquePendingReplies = pendingMap[comment.id].filter(
          (pending: any) => !existingReplyIds.has(pending.id)
        );
        
        if (uniquePendingReplies.length > 0) {
          console.log('➕ Adding unique pending replies:', uniquePendingReplies.length);
          commentWithPending.replies = [
            ...(comment.replies || []),
            ...uniquePendingReplies
          ];
        } else {
          console.log('⚠️ All pending replies are duplicates, skipping');
          commentWithPending.replies = comment.replies || [];
        }
        
        // Sort by created_at to maintain chronological order
        commentWithPending.replies.sort((a: any, b: any) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      }
      
      // Recursively attach pending to nested replies
      if (commentWithPending.replies && commentWithPending.replies.length > 0) {
        commentWithPending.replies = commentWithPending.replies.map(attachPendingReplies);
      }
      
      return commentWithPending;
    };
    
    const merged = allComments.map(attachPendingReplies);
    
    // Debug: Check first comment's replies structure
    if (merged.length > 0 && merged[0].replies) {
      console.log('🎯 First comment replies:', merged[0].replies);
      if (merged[0].replies.length > 0 && merged[0].replies[0].replies) {
        console.log('🎯 First reply has replies:', merged[0].replies[0].replies);
      }
    }
    
    return merged;
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) {
      toast.error('Lütfen bir yorum yazın');
      return;
    }

    try {
      setSubmitting(true);
      const response = await mysqlAPI.addListingComment(listingId, newComment.trim());
      
      if (response.success) {
        toast.success('Yorumunuz ilan sahibine iletildi. İlan sahibi cevap verdiğinde görünür olacak.');
        setNewComment('');
        onCommentAdded?.();
        
        // Backend'den güncel verileri al (hem comments hem pending)
        await loadComments();
        await loadPendingComments();
      } else {
        toast.error(response.error || 'Yorum eklenirken hata oluştu');
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      toast.error('Yorum eklenirken hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (commentId: string, replyTextOverride?: string) => {
    // Allow passing reply text directly, or get from state
    const reply = replyTextOverride !== undefined ? replyTextOverride : replyText[commentId];
    if (!reply?.trim()) {
      toast.error('Lütfen bir cevap yazın');
      return;
    }

    try {
      setSubmitting(true);
      const response = await mysqlAPI.replyToComment(commentId, reply.trim());
      
      if (response.success) {
        // Remove success toast - silent success
        setReplyText({ ...replyText, [commentId]: '' });
        
        // Reload both visible and pending comments
        await Promise.all([
          loadComments(),
          loadPendingComments()
        ]);
        
        onCommentAdded?.();
      } else {
        toast.error(response.error || 'Cevap gönderilirken hata oluştu');
      }
    } catch (error) {
      console.error('Error replying to comment:', error);
      toast.error('Cevap gönderilirken hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffWeeks = Math.floor(diffMs / 604800000);

    if (diffMins < 1) return 'şimdi';
    if (diffMins < 60) return `${diffMins}d`;
    if (diffHours < 24) return `${diffHours}sa`;
    if (diffDays < 7) return `${diffDays}g`;
    if (diffWeeks < 4) return `${diffWeeks}h`;
    
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Generate consistent color for each user based on their ID
  const getUserColor = (userId: string) => {
    // Hash user ID to get consistent color
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Predefined nice gradient colors (Tailwind-like)
    const colors = [
      'from-orange-400 to-purple-500',
      'from-pink-400 to-rose-500',
      'from-green-400 to-teal-500',
      'from-orange-400 to-red-500',
      'from-cyan-400 to-orange-500',
      'from-violet-400 to-purple-500',
      'from-amber-400 to-orange-500',
      'from-emerald-400 to-green-500',
      'from-fuchsia-400 to-pink-500',
      'from-indigo-400 to-orange-500',
    ];
    
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Instagram-style comment renderer
  const CommentItem = ({ comment, isPending }: { comment: Comment; isPending?: boolean }) => {
    // showReplyInput artık parent state'te - local state kaldırıldı
    
    // Debug: Check reply button conditions
    const shouldShowReplyButton = isOwner && !comment.is_owner_reply && isPending;
    console.log('🔍 Reply button check:', {
      commentId: comment.id,
      isOwner,
      is_owner_reply: comment.is_owner_reply,
      isPending,
      shouldShowReplyButton
    });
    
    return (
      <div className={`py-3 ${isPending ? 'opacity-50' : ''}`}>
        <div className="flex gap-3">
          {/* Avatar */}
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback className="text-xs bg-gradient-to-br from-orange-400 to-purple-500 text-white">
              {getInitials(comment.userName)}
            </AvatarFallback>
          </Avatar>

          {/* Comment Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-semibold text-sm">
                    {comment.is_owner_reply ? 'İlan Sahibi' : maskDisplayName(comment.userName)}
                  </span>
                  <span className="text-gray-700 text-sm break-words">{comment.comment}</span>
                </div>
                
                {/* Dolap-style visibility badge */}
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
                  
                  {/* Visibility badge */}
                  {comment.visibility_state === 'PRIVATE' && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Sadece siz ve karşı taraf görür
                    </span>
                  )}
                  {comment.visibility_state === 'PUBLIC' && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Herkes görür
                    </span>
                  )}
                  
                  {shouldShowReplyButton && (
                    <button 
                      onClick={() => setShowReplyInput({ ...showReplyInput, [comment.id]: !showReplyInput[comment.id] })}
                      className="font-semibold hover:text-gray-700 text-xs"
                    >
                      Cevapla
                    </button>
                  )}
                  {!isPending && comment.replies && comment.replies.length > 0 && (
                    <span className="font-semibold text-gray-600 text-xs">
                      {comment.replies.length} cevap
                    </span>
                  )}
                </div>

                {/* Reply Input (Dolap-style with warning) */}
                {showReplyInput[comment.id] && isOwner && (
                  <div className="mt-3 space-y-2">
                    {/* Warning for PRIVATE comments */}
                    {comment.visibility_state === 'PRIVATE' && !comment.is_first_seller_reply_exists && (
                      <div className="flex items-start gap-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                        <svg className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-xs text-orange-800">
                          <strong>İlk yanıtınızı verdiğinizde</strong> bu yorum ve ilk cevabınız herkese görünür olacak. 
                          Sonraki mesajlar iki taraf arasında gizli kalacak.
                        </p>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder={`${maskDisplayName(comment.userName)} kişisine cevap yazın...`}
                        value={replyText[comment.id] || ''}
                        onChange={(e) => setReplyText({ ...replyText, [comment.id]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleReply(comment.id);
                            setShowReplyInput({ ...showReplyInput, [comment.id]: false });
                          }
                        }}
                        className="text-sm h-9"
                        autoFocus
                        disabled={submitting}
                      />
                      <Button
                        onClick={() => {
                          handleReply(comment.id);
                          setShowReplyInput({ ...showReplyInput, [comment.id]: false });
                        }}
                        disabled={submitting || !replyText[comment.id]?.trim()}
                        size="sm"
                        variant="ghost"
                        className="h-9 px-3 text-orange-600 hover:text-orange-700 font-semibold"
                      >
                        {submitting ? '...' : 'Gönder'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Replies (Instagram Style - Nested but minimal) */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="mt-3 ml-0 space-y-3">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className={reply.isPending ? 'opacity-50' : ''}>
                        <div className="flex gap-3">
                          <Avatar className="h-7 w-7 flex-shrink-0">
                            <AvatarFallback className="text-xs bg-gradient-to-br from-green-400 to-teal-500 text-white">
                              {reply.is_owner_reply ? '👤' : getInitials(reply.userName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span className="font-semibold text-sm">
                                {reply.is_owner_reply ? 'İlan Sahibi' : maskDisplayName(reply.userName)}
                              </span>
                              <span className="text-gray-700 text-sm break-words">{reply.comment}</span>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                              <span>{formatDate(reply.created_at)}</span>
                              {/* Normal user can reply to owner's reply */}
                              {!isOwner && reply.is_owner_reply && (
                                <button 
                                  onClick={() => setShowReplyInput({ ...showReplyInput, [reply.id]: !showReplyInput[reply.id] })}
                                  className="font-semibold hover:text-gray-700"
                                >
                                  Cevapla
                                </button>
                              )}
                              {/* Owner can reply to ANY user reply (both pending and visible) */}
                              {isOwner && !reply.is_owner_reply && (
                                <button 
                                  onClick={() => setShowReplyInput({ ...showReplyInput, [reply.id]: !showReplyInput[reply.id] })}
                                  className="font-semibold hover:text-gray-700 text-orange-600"
                                >
                                  Cevapla
                                </button>
                              )}
                            </div>
                            
                            {/* Reply Input for nested reply - for BOTH owner and regular user */}
                            {showReplyInput[reply.id] && (
                              <div className="mt-2 flex items-center gap-2">
                                <Input
                                  placeholder={`${reply.is_owner_reply ? 'İlan Sahibi' : maskDisplayName(reply.userName)} kişisine cevap yazın...`}
                                  value={replyText[reply.id] || ''}
                                  onChange={(e) => setReplyText({ ...replyText, [reply.id]: e.target.value })}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      handleReply(reply.id);
                                      setShowReplyInput({ ...showReplyInput, [reply.id]: false });
                                    }
                                  }}
                                  className="text-sm h-8"
                                  autoFocus
                                  disabled={submitting}
                                />
                                <Button
                                  onClick={() => {
                                    handleReply(reply.id);
                                    setShowReplyInput({ ...showReplyInput, [reply.id]: false });
                                  }}
                                  disabled={submitting || !replyText[reply.id]?.trim()}
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-2 text-orange-600 hover:text-orange-700 font-semibold text-xs"
                                >
                                  {submitting ? '...' : 'Gönder'}
                                </Button>
                              </div>
                            )}
                            
                            {/* Nested replies (FULLY RECURSIVE) */}
                            {reply.replies && reply.replies.length > 0 && (
                              <div className="mt-2 ml-0 space-y-2 border-l-2 border-gray-100 pl-3">
                                {reply.replies.map((nestedReply) => (
                                  <div key={nestedReply.id}>
                                    {/* Nested Reply Item */}
                                    <div className={nestedReply.isPending ? 'opacity-50' : ''}>
                                      <div className="flex gap-2">
                                        <Avatar className="h-6 w-6 flex-shrink-0">
                                          <AvatarFallback className="text-xs bg-gradient-to-br from-orange-400 to-indigo-500 text-white">
                                            {nestedReply.is_owner_reply ? '👤' : getInitials(nestedReply.userName)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-baseline gap-2 flex-wrap">
                                            <span className="font-semibold text-xs">
                                              {nestedReply.is_owner_reply ? 'İlan Sahibi' : maskDisplayName(nestedReply.userName)}
                                            </span>
                                            <span className="text-gray-700 text-xs break-words">{nestedReply.comment}</span>
                                          </div>
                                          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                                            <span>{formatDate(nestedReply.created_at)}</span>
                                            {nestedReply.isPending && (
                                              <span className="text-xs text-orange-500">⏳ Beklemede</span>
                                            )}
                                            {/* Owner can reply to ANY nested comment */}
                                            {isOwner && !nestedReply.is_owner_reply && (
                                              <button 
                                                onClick={() => setShowReplyInput({ ...showReplyInput, [nestedReply.id]: !showReplyInput[nestedReply.id] })}
                                                className="font-semibold hover:text-gray-700 text-orange-600"
                                              >
                                                Cevapla
                                              </button>
                                            )}
                                          </div>
                                          
                                          {/* Reply Input */}
                                          {showReplyInput[nestedReply.id] && isOwner && (
                                            <div className="mt-2 flex items-center gap-2">
                                              <Input
                                                placeholder={`${maskDisplayName(nestedReply.userName)} kişisine cevap yazın...`}
                                                value={replyText[nestedReply.id] || ''}
                                                onChange={(e) => setReplyText({ ...replyText, [nestedReply.id]: e.target.value })}
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleReply(nestedReply.id);
                                                    setShowReplyInput({ ...showReplyInput, [nestedReply.id]: false });
                                                  }
                                                }}
                                                className="text-sm h-8"
                                                autoFocus
                                                disabled={submitting}
                                              />
                                              <Button
                                                onClick={() => {
                                                  handleReply(nestedReply.id);
                                                  setShowReplyInput({ ...showReplyInput, [nestedReply.id]: false });
                                                }}
                                                disabled={submitting || !replyText[nestedReply.id]?.trim()}
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 px-2 text-orange-600 hover:text-orange-700 font-semibold text-xs"
                                              >
                                                {submitting ? '...' : 'Gönder'}
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* RECURSIVE: Render nestedReply's replies (4th, 5th level, etc.) */}
                                    {nestedReply.replies && nestedReply.replies.length > 0 && (
                                      <div className="mt-2 ml-0 space-y-2 border-l-2 border-gray-100 pl-3">
                                        {nestedReply.replies.map((deepReply) => (
                                          <div key={deepReply.id} className={deepReply.isPending ? 'opacity-50' : ''}>
                                            <div className="flex gap-2">
                                              <Avatar className="h-6 w-6 flex-shrink-0">
                                                <AvatarFallback className="text-xs bg-gradient-to-br from-purple-400 to-pink-500 text-white">
                                                  {deepReply.is_owner_reply ? '👤' : getInitials(deepReply.userName)}
                                                </AvatarFallback>
                                              </Avatar>
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-baseline gap-2 flex-wrap">
                                                  <span className="font-semibold text-xs">
                                                    {deepReply.is_owner_reply ? 'İlan Sahibi' : maskDisplayName(deepReply.userName)}
                                                  </span>
                                                  <span className="text-gray-700 text-xs break-words">{deepReply.comment}</span>
                                                </div>
                                                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                                                  <span>{formatDate(deepReply.created_at)}</span>
                                                  {isOwner && !deepReply.is_owner_reply && (
                                                    <button 
                                                      onClick={() => setShowReplyInput({ ...showReplyInput, [deepReply.id]: !showReplyInput[deepReply.id] })}
                                                      className="font-semibold hover:text-gray-700 text-orange-600"
                                                    >
                                                      Cevapla
                                                    </button>
                                                  )}
                                                </div>
                                                
                                                {showReplyInput[deepReply.id] && isOwner && (
                                                  <div className="mt-2 flex items-center gap-2">
                                                    <Input
                                                      placeholder={`${maskDisplayName(deepReply.userName)} kişisine cevap yazın...`}
                                                      value={replyText[deepReply.id] || ''}
                                                      onChange={(e) => setReplyText({ ...replyText, [deepReply.id]: e.target.value })}
                                                      onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                          e.preventDefault();
                                                          handleReply(deepReply.id);
                                                          setShowReplyInput({ ...showReplyInput, [deepReply.id]: false });
                                                        }
                                                      }}
                                                      className="text-sm h-8"
                                                      autoFocus
                                                      disabled={submitting}
                                                    />
                                                    <Button
                                                      onClick={() => {
                                                        handleReply(deepReply.id);
                                                        setShowReplyInput({ ...showReplyInput, [deepReply.id]: false });
                                                      }}
                                                      disabled={submitting || !replyText[deepReply.id]?.trim()}
                                                      size="sm"
                                                      variant="ghost"
                                                      className="h-8 px-2 text-orange-600 hover:text-orange-700 font-semibold text-xs"
                                                    >
                                                      {submitting ? '...' : 'Gönder'}
                                                    </Button>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* More Options */}
              <button className="text-gray-400 hover:text-gray-600 p-1">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle className="text-base font-semibold text-center">
            Yorumlar
          </DialogTitle>
        </DialogHeader>

        {/* Comments List - Instagram Style Scrollable */}
        <div className="overflow-y-auto max-h-[60vh] px-4">
          {loading ? (
            <div className="text-center py-12 text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-3"></div>
              <p className="text-sm">Yorumlar yükleniyor...</p>
            </div>
          ) : (
            <>
              {/* Merged Comments (Instagram-style flat list) */}
              {(() => {
                const mergedComments = getMergedComments();
                
                if (mergedComments.length === 0) {
                  return (
                    <div className="text-center py-12 text-gray-400">
                      <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">Henüz yorum yok</p>
                      <p className="text-xs mt-1">İlk yorumu siz yapın!</p>
                    </div>
                  );
                }
                
                return (
                  <div className="divide-y divide-gray-100">
                    {mergedComments.map((rootComment) => {
                      const allReplies = flattenReplies(rootComment);
                      const replyCount = allReplies.length - 1; // Exclude root
                      const isExpanded = expandedThreads[rootComment.id];
                      const visibleReplies = isExpanded ? allReplies : allReplies.slice(0, 1); // Show only root if collapsed
                      const lastReplyIndex = visibleReplies.length - 1;
                      
                      return (
                        <div key={rootComment.id} className="py-3">
                          {/* Render all comments in thread flat (Instagram style) */}
                          {visibleReplies.map((item, index) => {
                            const isRoot = index === 0;
                            const isLastReply = index === lastReplyIndex;
                            const showReplyButton = isLastReply; // Only last reply has button
                            const showConnector = !isRoot; // Show line for replies
                            
                            return (
                              <div key={item.id} className={`flex gap-3 ${!isRoot ? 'ml-11 mt-3' : ''}`}>
                                {/* Connector line for replies */}
                                {showConnector && (
                                  <div className="w-8 flex-shrink-0 flex justify-center">
                                    <div className="w-0.5 h-full bg-gray-200"></div>
                                  </div>
                                )}
                                
                                {/* Avatar */}
                                <Avatar className="h-8 w-8 flex-shrink-0">
                                  <AvatarFallback className={`text-xs bg-gradient-to-br ${getUserColor(item.user_id)} text-white`}>
                                    {user && item.user_id === user.id 
                                      ? getInitials(item.userName)
                                      : getInitials(maskDisplayName(item.userName))
                                    }
                                  </AvatarFallback>
                                </Avatar>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-baseline gap-2 flex-wrap">
                                    <span className="font-semibold text-sm">
                                      {/* Show full name if it's current user, otherwise mask it */}
                                      {user && item.user_id === user.id 
                                        ? item.userName 
                                        : maskDisplayName(item.userName)
                                      }
                                    </span>
                                    <span className="text-gray-700 text-sm break-words">{item.comment}</span>
                                  </div>
                                  
                                  {/* Actions: Only date, no reply button */}
                                  <div className="flex items-center gap-3 mt-1.5">
                                    <span className="text-xs text-gray-500">{formatDate(item.created_at)}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          
                          {/* Thread Reply Input (Always visible at bottom for participants) */}
                          {(() => {
                            // Don't show input if user is not logged in
                            if (!user) return null;
                            
                            // If user is the owner, always show
                            if (isOwner) {
                              return (
                                <div className="ml-11 mt-3 border-t pt-3">
                                  <div className="flex items-center gap-2">
                                    <Input
                                      placeholder="Mesaj yaz..."
                                      value={replyText[rootComment.id] || ''}
                                      onChange={(e) => setReplyText({ ...replyText, [rootComment.id]: e.target.value })}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                          e.preventDefault();
                                          if (!isExpanded) {
                                            setExpandedThreads({ ...expandedThreads, [rootComment.id]: true });
                                          }
                                          const lastReply = allReplies[allReplies.length - 1];
                                          const text = replyText[rootComment.id];
                                          handleReply(lastReply.id, text);
                                          setReplyText({ ...replyText, [rootComment.id]: '' });
                                        }
                                      }}
                                      className="text-sm h-9"
                                      disabled={submitting}
                                    />
                                    <Button
                                      onClick={() => {
                                        if (!isExpanded) {
                                          setExpandedThreads({ ...expandedThreads, [rootComment.id]: true });
                                        }
                                        const lastReply = allReplies[allReplies.length - 1];
                                        const text = replyText[rootComment.id];
                                        handleReply(lastReply.id, text);
                                        setReplyText({ ...replyText, [rootComment.id]: '' });
                                      }}
                                      disabled={submitting || !replyText[rootComment.id]?.trim()}
                                      size="sm"
                                      className="h-9 px-4"
                                    >
                                      {submitting ? '...' : 'Gönder'}
                                    </Button>
                                  </div>
                                </div>
                              );
                            }
                            
                            // If user is the commenter
                            if (rootComment.user_id === user.id) {
                              // Check if owner has replied - if there's any reply from owner, allow conversation
                              const hasOwnerReply = allReplies.some((reply: any) => 
                                reply.user_id !== user.id && reply.user_id !== rootComment.user_id
                              );
                              
                              if (!hasOwnerReply) {
                                // Owner hasn't replied yet - don't show input
                                return (
                                  <div className="ml-11 mt-3 border-t pt-3">
                                    <p className="text-xs text-gray-500 italic">
                                      Yorumunuz ilan sahibine iletildi. İlan sahibi cevap verdiğinde görünür olacak.
                                    </p>
                                  </div>
                                );
                              }
                              
                              // Owner has replied - show input
                              return (
                                <div className="ml-11 mt-3 border-t pt-3">
                                  <div className="flex items-center gap-2">
                                    <Input
                                      placeholder="Mesaj yaz..."
                                      value={replyText[rootComment.id] || ''}
                                      onChange={(e) => setReplyText({ ...replyText, [rootComment.id]: e.target.value })}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                          e.preventDefault();
                                          if (!isExpanded) {
                                            setExpandedThreads({ ...expandedThreads, [rootComment.id]: true });
                                          }
                                          const lastReply = allReplies[allReplies.length - 1];
                                          const text = replyText[rootComment.id];
                                          handleReply(lastReply.id, text);
                                          setReplyText({ ...replyText, [rootComment.id]: '' });
                                        }
                                      }}
                                      className="text-sm h-9"
                                      disabled={submitting}
                                    />
                                    <Button
                                      onClick={() => {
                                        if (!isExpanded) {
                                          setExpandedThreads({ ...expandedThreads, [rootComment.id]: true });
                                        }
                                        const lastReply = allReplies[allReplies.length - 1];
                                        const text = replyText[rootComment.id];
                                        handleReply(lastReply.id, text);
                                        setReplyText({ ...replyText, [rootComment.id]: '' });
                                      }}
                                      disabled={submitting || !replyText[rootComment.id]?.trim()}
                                      size="sm"
                                      className="h-9 px-4"
                                    >
                                      {submitting ? '...' : 'Gönder'}
                                    </Button>
                                  </div>
                                </div>
                              );
                            }
                            
                            return null;
                          })()}
                          
                          {/* "View more replies" button */}
                          {replyCount > 0 && !isExpanded && (
                            <button
                              onClick={() => setExpandedThreads({ ...expandedThreads, [rootComment.id]: true })}
                              className="ml-11 mt-3 text-xs font-semibold text-gray-500 hover:text-gray-700"
                            >
                              ━━ {replyCount} cevabı gör
                            </button>
                          )}
                          
                          {/* "Hide replies" button */}
                          {replyCount > 0 && isExpanded && (
                            <button
                              onClick={() => setExpandedThreads({ ...expandedThreads, [rootComment.id]: false })}
                              className="ml-11 mt-3 text-xs font-semibold text-gray-500 hover:text-gray-700"
                            >
                              ━━ Cevapları gizle
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </>
          )}
        </div>

        {/* Add Comment Input (Instagram Style - Fixed Bottom) */}
        {!isOwner && (
          <div className="border-t px-4 py-3 bg-white">
            <div className="flex items-center gap-3">
              <Input
                placeholder="Yorum ekle..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitComment();
                  }
                }}
                disabled={submitting}
                className="border-0 focus-visible:ring-0 shadow-none text-sm"
              />
              <Button
                onClick={handleSubmitComment}
                disabled={submitting || !newComment.trim()}
                variant="ghost"
                size="sm"
                className="text-orange-500 hover:text-orange-600 disabled:text-orange-300 font-semibold px-2"
              >
                {submitting ? 'Gönderiliyor...' : 'Gönder'}
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Yorumunuz ilan sahibi cevap verdiğinde görünür olacak
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
