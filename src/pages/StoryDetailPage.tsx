import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  Share2, 
  Bookmark, 
  MessageSquare, 
  Sparkles, 
  Lightbulb, 
  CheckCircle, 
  Brain, 
  Heart, 
  UserPlus, 
  UserCheck, 
  ArrowLeft, 
  Maximize2, 
  Minimize2, 
  Send, 
  Trash2, 
  Edit3, 
  Reply, 
  CornerDownRight, 
  Check 
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { Story, Comment } from '../types';
import { useAuth } from '../context/AuthContext';

interface StoryDetailPageProps {
  slugOrId: string;
  navigate: (path: string) => void;
}

export const StoryDetailPage: React.FC<StoryDetailPageProps> = ({ slugOrId, navigate }) => {
  const { user, openAuthModal } = useAuth();

  const [story, setStory] = useState<Story | null>(null);
  const [relatedStories, setRelatedStories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reading progress state
  const [readingProgress, setReadingProgress] = useState(0);

  // Distraction-Free Reading Mode state
  const [isReadingMode, setIsReadingMode] = useState(false);

  // Reactions state
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [reactionsBreakdown, setReactionsBreakdown] = useState<Record<string, number>>({
    appreciate: 0,
    interesting: 0,
    useful: 0,
    thought_provoking: 0,
  });

  // Bookmark state
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Author follow state
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(false);

  // Share state
  const [copiedLink, setCopiedLink] = useState(false);

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [commentSort, setCommentSort] = useState<'newest' | 'oldest' | 'liked'>('newest');

  const commentsRef = useRef<HTMLDivElement>(null);

  // Scroll progress listener
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = (window.scrollY / totalHeight) * 100;
        setReadingProgress(Math.min(100, Math.max(0, progress)));
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch story data
  const fetchStory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ story: Story; related: any[] }>(`/stories/${slugOrId}`);
      if (res && res.story) {
        setStory(res.story);
        setRelatedStories(res.related || []);
        setUserReaction(res.story.userReaction || null);
        setIsBookmarked(!!res.story.isBookmarked);
        setIsFollowingAuthor(!!res.story.author?.isFollowing);
        if (res.story.reactions) {
          setReactionsBreakdown(res.story.reactions);
        }
      }
    } catch (err: any) {
      setError(err.message || 'The requested story could not be found.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch comments
  const fetchComments = async (storyId: number) => {
    try {
      const res = await apiRequest<{ comments: Comment[] }>(`/stories/${storyId}/comments`);
      if (res && res.comments) {
        setComments(res.comments);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchStory();
  }, [slugOrId]);

  useEffect(() => {
    if (story?.id) {
      fetchComments(story.id);
    }
  }, [story?.id]);

  // Reaction handler: one reaction per story; toggles or updates
  const handleReaction = async (type: 'appreciate' | 'interesting' | 'useful' | 'thought_provoking') => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    if (!story) return;

    const previousReaction = userReaction;
    const isRemoving = previousReaction === type;

    // Optimistic UI update
    if (isRemoving) {
      setUserReaction(null);
      setReactionsBreakdown((prev) => ({
        ...prev,
        [type]: Math.max(0, (prev[type] || 1) - 1),
      }));
    } else {
      setUserReaction(type);
      setReactionsBreakdown((prev) => {
        const next = { ...prev, [type]: (prev[type] || 0) + 1 };
        if (previousReaction) {
          next[previousReaction] = Math.max(0, (next[previousReaction] || 1) - 1);
        }
        return next;
      });
    }

    try {
      if (isRemoving) {
        await apiRequest(`/stories/${story.id}/reaction`, { method: 'DELETE' });
      } else {
        await apiRequest(`/stories/${story.id}/reaction`, {
          method: 'POST',
          body: JSON.stringify({ type }),
        });
      }
    } catch {
      // Revert on failure
      fetchStory();
    }
  };

  // Bookmark handler
  const handleToggleBookmark = async () => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    if (!story) return;

    const nextState = !isBookmarked;
    setIsBookmarked(nextState);

    try {
      if (nextState) {
        await apiRequest(`/stories/${story.id}/bookmark`, {
          method: 'POST',
          body: JSON.stringify({ status: 'saved' }),
        });
      } else {
        await apiRequest(`/stories/${story.id}/bookmark`, { method: 'DELETE' });
      }
    } catch {
      setIsBookmarked(!nextState);
    }
  };

  // Follow author handler
  const handleToggleFollow = async () => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    if (!story?.author) return;

    const nextState = !isFollowingAuthor;
    setIsFollowingAuthor(nextState);

    try {
      if (nextState) {
        await apiRequest(`/users/${story.author.id}/follow`, { method: 'POST' });
      } else {
        await apiRequest(`/users/${story.author.id}/follow`, { method: 'DELETE' });
      }
    } catch {
      setIsFollowingAuthor(!nextState);
    }
  };

  // Share handler
  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: story?.title || 'MOSAIC Story',
          text: story?.subtitle || 'Read this editorial on MOSAIC.',
          url,
        });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {}
  };

  // Post comment
  const handleAddComment = async (parentId: number | null = null) => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    if (!story) return;

    const text = parentId ? replyText : commentText;
    if (!text.trim()) return;

    try {
      await apiRequest(`/stories/${story.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: text.trim(), parent_id: parentId }),
      });

      if (parentId) {
        setReplyText('');
        setReplyingToId(null);
      } else {
        setCommentText('');
      }

      await fetchComments(story.id);
    } catch (err: any) {
      alert(err.message || 'Failed to post comment.');
    }
  };

  // Edit comment
  const handleSaveCommentEdit = async (commentId: number) => {
    if (!editText.trim() || !story) return;
    try {
      await apiRequest(`/comments/${commentId}`, {
        method: 'PUT',
        body: JSON.stringify({ content: editText.trim() }),
      });
      setEditingCommentId(null);
      setEditText('');
      await fetchComments(story.id);
    } catch {}
  };

  // Delete comment
  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    if (!story) return;
    try {
      await apiRequest(`/comments/${commentId}`, { method: 'DELETE' });
      await fetchComments(story.id);
    } catch {}
  };

  // Like comment
  const handleToggleLikeComment = async (comment: Comment) => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    if (!story) return;

    try {
      if (comment.userHasLiked) {
        await apiRequest(`/comments/${comment.id}/like`, { method: 'DELETE' });
      } else {
        await apiRequest(`/comments/${comment.id}/like`, { method: 'POST' });
      }
      await fetchComments(story.id);
    } catch {}
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 animate-pulse space-y-6">
        <div className="h-6 w-24 bg-black/10 dark:bg-white/10 rounded-full" />
        <div className="h-12 w-3/4 bg-black/10 dark:bg-white/10 rounded-md" />
        <div className="h-6 w-1/2 bg-black/10 dark:bg-white/10 rounded-md" />
        <div className="h-96 w-full bg-black/10 dark:bg-white/10 rounded-3xl" />
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <h2 className="font-serif text-2xl font-bold text-[#1C1917] dark:text-[#F5F3EF]">
          THIS STORY DOESN'T EXIST
        </h2>
        <p className="text-xs text-[#857F77] dark:text-[#A8A39C] mt-2 mb-6">
          {error || 'The article you are looking for may have been archived or removed.'}
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2.5 rounded-full bg-[#22382D] text-white text-xs font-semibold"
          >
            Back to MOSAIC
          </button>
          <button
            onClick={() => navigate('/explore')}
            className="px-5 py-2.5 rounded-full border border-black/15 dark:border-white/20 text-xs font-semibold"
          >
            Explore Stories
          </button>
        </div>
      </div>
    );
  }

  // Recursive Comment Thread Renderer
  const renderCommentThread = (node: Comment, level: number = 0) => {
    const isAuthor = user?.id === node.author.id;
    const isEditing = editingCommentId === node.id;
    const isReplying = replyingToId === node.id;

    return (
      <div
        key={node.id}
        className={`relative ${level > 0 ? 'ml-6 sm:ml-10 mt-3 pl-4 border-l-2 border-black/10 dark:border-white/10' : 'mt-4 pt-4 border-t border-black/5 dark:border-white/5'}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <img
              src={node.author.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'}
              alt={node.author.name}
              className="w-6 h-6 rounded-full object-cover"
            />
            <div>
              <span className="text-xs font-semibold text-[#1C1917] dark:text-[#F5F3EF]">
                {node.author.name}
              </span>
              <span className="text-[10px] text-[#857F77] ml-2">
                {new Date(node.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>

          {/* Comment Edit/Delete Actions */}
          {isAuthor && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setEditingCommentId(node.id);
                  setEditText(node.content);
                }}
                className="p-1 text-[#857F77] hover:text-[#1C1917] dark:hover:text-white rounded-md cursor-pointer"
              >
                <Edit3 className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleDeleteComment(node.id)}
                className="p-1 text-red-500 hover:text-red-700 rounded-md cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Comment Content or Edit Form */}
        {isEditing ? (
          <div className="mt-2 space-y-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-black/15 dark:border-white/20 bg-white dark:bg-[#121316] text-[#1C1917] dark:text-[#F5F3EF]"
              rows={2}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setEditingCommentId(null)}
                className="px-3 py-1 text-xs text-[#857F77] hover:text-[#1C1917]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveCommentEdit(node.id)}
                className="px-3 py-1 text-xs bg-[#22382D] text-white rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs sm:text-sm text-[#37352F] dark:text-[#D4D1CA] mt-2 leading-relaxed font-sans-ui">
            {node.content}
          </p>
        )}

        {/* Comment Actions (Like & Reply) */}
        <div className="flex items-center gap-4 mt-2">
          <button
            onClick={() => handleToggleLikeComment(node)}
            className={`flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer ${
              node.userHasLiked
                ? 'text-[#C85A32] dark:text-[#DE6D43]'
                : 'text-[#857F77] hover:text-[#1C1917] dark:hover:text-white'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${node.userHasLiked ? 'fill-current' : ''}`} />
            <span>{node.likesCount || 0}</span>
          </button>

          <button
            onClick={() => {
              setReplyingToId(isReplying ? null : node.id);
              setReplyText('');
            }}
            className="flex items-center gap-1 text-[11px] text-[#857F77] hover:text-[#1C1917] dark:hover:text-white transition-colors cursor-pointer"
          >
            <Reply className="w-3.5 h-3.5" />
            <span>Reply</span>
          </button>
        </div>

        {/* Inline Reply Input Box */}
        {isReplying && (
          <div className="mt-3 p-3 rounded-2xl bg-black/5 dark:bg-white/5 space-y-2">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`Replying to ${node.author.name}...`}
              className="w-full p-2.5 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#18191D] text-[#1C1917] dark:text-[#F5F3EF] focus:outline-hidden"
              rows={2}
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setReplyingToId(null)}
                className="px-3 py-1 text-xs text-[#857F77]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAddComment(node.id)}
                className="px-3 py-1 text-xs bg-[#22382D] text-white dark:bg-[#DE6D43] dark:text-[#0F1012] font-semibold rounded-lg"
              >
                Post Reply
              </button>
            </div>
          </div>
        )}

        {/* Recursive Children Replies */}
        {node.replies && node.replies.length > 0 && (
          <div className="space-y-1">
            {node.replies.map((child) => renderCommentThread(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`relative ${isReadingMode ? 'bg-[#FAF8F5] dark:bg-[#0B0C0E] min-h-screen' : ''}`}>
      {/* Top Reading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-black/5 dark:bg-white/5">
        <div
          className="h-full bg-[#22382D] dark:bg-[#DE6D43] transition-all duration-150"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      {/* Distraction-Free Reading Mode Floating Exit Bar */}
      {isReadingMode && (
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={() => setIsReadingMode(false)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-black/80 dark:bg-white/90 text-white dark:text-black text-xs font-semibold shadow-xl backdrop-blur-md hover:opacity-90 transition-all cursor-pointer"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>EXIT READING MODE</span>
          </button>
        </div>
      )}

      {/* Article Header & Navigation */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10">
        {!isReadingMode && (
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => navigate('/explore')}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#857F77] hover:text-[#1C1917] dark:hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Stories</span>
            </button>

            <button
              onClick={() => setIsReadingMode(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#57534E] dark:text-[#A8A39C] hover:text-[#1C1917] dark:hover:text-white border border-black/10 dark:border-white/10 px-3 py-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Reading Mode</span>
            </button>
          </div>
        )}

        {/* Category & Metadata */}
        <div className="flex items-center gap-3 mb-4">
          <span
            className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full text-white"
            style={{ backgroundColor: story.category.color || '#22382D' }}
          >
            {story.category.name}
          </span>
          <span className="text-xs text-[#857F77] flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {story.reading_time_minutes} min read
          </span>
          <span className="text-xs text-[#857F77]">•</span>
          <span className="text-xs text-[#857F77]">
            {new Date(story.created_at).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>

        {/* Title */}
        <h1
          className={`font-serif font-bold text-[#1C1917] dark:text-[#F5F3EF] leading-tight tracking-tight ${
            isReadingMode ? 'text-4xl sm:text-6xl text-center mb-6' : 'text-3xl sm:text-5xl lg:text-6xl mb-4'
          }`}
        >
          {story.title}
        </h1>

        {/* Subtitle */}
        {story.subtitle && (
          <p
            className={`text-lg sm:text-xl text-[#57534E] dark:text-[#A8A39C] font-editorial italic leading-relaxed ${
              isReadingMode ? 'text-center max-w-2xl mx-auto mb-8' : 'mb-6'
            }`}
          >
            {story.subtitle}
          </p>
        )}

        {/* Author Header Row */}
        <div className={`flex items-center justify-between pb-6 mb-8 border-b border-black/10 dark:border-white/10 ${isReadingMode ? 'max-w-xl mx-auto' : ''}`}>
          <div className="flex items-center gap-3">
            <img
              src={story.author.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'}
              alt={story.author.name}
              className="w-11 h-11 rounded-full object-cover ring-2 ring-black/5 dark:ring-white/10"
            />
            <div>
              <div className="font-semibold text-sm text-[#1C1917] dark:text-[#F5F3EF]">
                {story.author.name}
              </div>
              <div className="text-xs text-[#857F77]">@{story.author.username}</div>
            </div>

            {user?.id !== story.author.id && (
              <button
                onClick={handleToggleFollow}
                className={`ml-3 px-3 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  isFollowingAuthor
                    ? 'border border-black/20 dark:border-white/20 text-[#1C1917] dark:text-[#F5F3EF]'
                    : 'bg-[#22382D] text-white dark:bg-[#DE6D43] dark:text-[#0F1012]'
                }`}
              >
                {isFollowingAuthor ? (
                  <>
                    <UserCheck className="w-3 h-3" />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3 h-3" />
                    <span>Follow</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Social / Reading Shelf shortcuts */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleBookmark}
              title={isBookmarked ? 'Remove from reading shelf' : 'Save to reading shelf'}
              className={`p-2 rounded-full border transition-all cursor-pointer ${
                isBookmarked
                  ? 'border-[#22382D] bg-[#22382D] text-white dark:border-[#DE6D43] dark:bg-[#DE6D43] dark:text-[#0F1012]'
                  : 'border-black/10 dark:border-white/10 text-[#857F77] hover:text-[#1C1917] dark:hover:text-white'
              }`}
            >
              <Bookmark className="w-4 h-4" />
            </button>

            <button
              onClick={handleShare}
              title="Share story"
              className="p-2 rounded-full border border-black/10 dark:border-white/10 text-[#857F77] hover:text-[#1C1917] dark:hover:text-white transition-colors relative cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
              {copiedLink && (
                <span className="absolute -bottom-7 right-0 text-[10px] font-bold bg-[#1C1917] text-white px-2 py-0.5 rounded-md whitespace-nowrap shadow-md">
                  Link copied.
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Large Cover Image */}
        {!isReadingMode && (
          <div className="rounded-3xl overflow-hidden mb-10 shadow-lg border border-black/10 dark:border-white/10 max-h-[500px]">
            <img
              src={story.cover_image}
              alt={story.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Story Prose Body */}
        <article
          className={`reading-prose text-[#1E1E1E] dark:text-[#E8E6E1] mb-12 ${
            isReadingMode ? 'max-w-2xl mx-auto text-xl' : 'max-w-3xl'
          }`}
        >
          {story.content?.split('\n\n').map((paragraph, index) => (
            <p key={index} className="mb-6 leading-relaxed">
              {paragraph}
            </p>
          ))}
        </article>

        {/* Editorial Reactions Bar (Appreciate, Interesting, Useful, Thought-provoking) */}
        <div className="my-10 p-6 rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#18191D]/70 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <span className="font-serif font-bold text-base text-[#1C1917] dark:text-[#F5F3EF]">
              What did this spark in you?
            </span>
            <span className="text-xs text-[#857F77]">
              {Object.values(reactionsBreakdown).reduce((a, b) => a + b, 0)} total responses
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Appreciate */}
            <button
              onClick={() => handleReaction('appreciate')}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                userReaction === 'appreciate'
                  ? 'border-[#C85A32] bg-[#C85A32]/10 text-[#C85A32]'
                  : 'border-black/10 dark:border-white/10 hover:border-black/25 dark:hover:border-white/25 text-[#57534E] dark:text-[#A8A39C]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Sparkles className="w-4 h-4 text-[#C85A32]" />
                <span className="text-xs font-bold">{reactionsBreakdown.appreciate || 0}</span>
              </div>
              <span className="text-xs font-semibold">Appreciate</span>
            </button>

            {/* Interesting */}
            <button
              onClick={() => handleReaction('interesting')}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                userReaction === 'interesting'
                  ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'border-black/10 dark:border-white/10 hover:border-black/25 dark:hover:border-white/25 text-[#57534E] dark:text-[#A8A39C]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold">{reactionsBreakdown.interesting || 0}</span>
              </div>
              <span className="text-xs font-semibold">Interesting</span>
            </button>

            {/* Useful */}
            <button
              onClick={() => handleReaction('useful')}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                userReaction === 'useful'
                  ? 'border-emerald-600 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400'
                  : 'border-black/10 dark:border-white/10 hover:border-black/25 dark:hover:border-white/25 text-[#57534E] dark:text-[#A8A39C]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold">{reactionsBreakdown.useful || 0}</span>
              </div>
              <span className="text-xs font-semibold">Useful</span>
            </button>

            {/* Thought-provoking */}
            <button
              onClick={() => handleReaction('thought_provoking')}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                userReaction === 'thought_provoking'
                  ? 'border-purple-600 bg-purple-600/10 text-purple-700 dark:text-purple-400'
                  : 'border-black/10 dark:border-white/10 hover:border-black/25 dark:hover:border-white/25 text-[#57534E] dark:text-[#A8A39C]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Brain className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-bold">{reactionsBreakdown.thought_provoking || 0}</span>
              </div>
              <span className="text-xs font-semibold">Thought-provoking</span>
            </button>
          </div>
        </div>

        {/* Author Bio Card */}
        <div className="p-6 rounded-3xl border border-black/10 dark:border-white/10 bg-[#F3EFE6]/60 dark:bg-[#18191D]/60 flex flex-col sm:flex-row items-start sm:items-center gap-5 mb-14">
          <img
            src={story.author.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'}
            alt={story.author.name}
            className="w-16 h-16 rounded-2xl object-cover ring-2 ring-black/10 dark:ring-white/10 shrink-0"
          />
          <div className="flex-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#857F77]">
              Written by
            </span>
            <h3 className="font-serif font-bold text-lg text-[#1C1917] dark:text-[#F5F3EF]">
              {story.author.name}
            </h3>
            <p className="text-xs sm:text-sm text-[#57534E] dark:text-[#A8A39C] mt-1">
              {story.author.bio || 'Contributing essayist and creator at MOSAIC.'}
            </p>
          </div>
          <button
            onClick={() => navigate(`/profile/${story.author.username}`)}
            className="px-4 py-2 rounded-full border border-black/15 dark:border-white/20 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0 cursor-pointer"
          >
            More from this writer
          </button>
        </div>

        {/* Conversation / Comments Section */}
        <section ref={commentsRef} className="pb-16 pt-6 border-t border-black/10 dark:border-white/10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#22382D] dark:text-[#DE6D43]" />
              <h3 className="font-serif font-bold text-2xl text-[#1C1917] dark:text-[#F5F3EF]">
                Conversation ({comments.length})
              </h3>
            </div>
          </div>

          {/* Comment input box */}
          <div className="p-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#18191D] shadow-xs mb-8">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={user ? "Share a thought, reflection, or counterpoint..." : "Sign in to join the conversation..."}
              disabled={!user}
              rows={3}
              className="w-full text-sm bg-transparent placeholder-[#857F77] focus:outline-hidden resize-none text-[#1C1917] dark:text-[#F5F3EF]"
            />
            <div className="flex items-center justify-between pt-3 border-t border-black/5 dark:border-white/5">
              <span className="text-[11px] text-[#857F77]">
                {user ? `Posting as ${user.name}` : 'Conversations on MOSAIC honor quiet discourse.'}
              </span>
              <button
                onClick={() => {
                  if (!user) openAuthModal('login');
                  else handleAddComment();
                }}
                disabled={Boolean(user && !commentText.trim())}
                className="px-4 py-2 rounded-xl bg-[#22382D] hover:bg-[#192B22] text-white dark:bg-[#DE6D43] dark:hover:bg-[#E77E57] dark:text-[#0F1012] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{user ? 'Respond' : 'Sign in to Respond'}</span>
              </button>
            </div>
          </div>

          {/* Comments List */}
          {comments.length === 0 ? (
            <div className="text-center py-10 text-xs text-[#857F77] dark:text-[#A8A39C]">
              No conversations yet. Be the first to share an observation.
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => renderCommentThread(comment))}
            </div>
          )}
        </section>

        {/* Related Stories */}
        {relatedStories.length > 0 && (
          <section className="pt-10 pb-16 border-t border-black/10 dark:border-white/10">
            <h3 className="font-serif font-bold text-2xl text-[#1C1917] dark:text-[#F5F3EF] mb-6">
              Related Perspectives
            </h3>
            <div className="grid sm:grid-cols-3 gap-5">
              {relatedStories.map((rel) => (
                <div
                  key={rel.id}
                  onClick={() => navigate(`/story/${rel.slug || rel.id}`)}
                  className="p-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#18191D]/70 hover:bg-white dark:hover:bg-[#18191D] hover:border-black/20 dark:hover:border-white/20 transition-all cursor-pointer group shadow-xs"
                >
                  <img
                    src={rel.cover_image}
                    alt={rel.title}
                    className="w-full h-32 rounded-xl object-cover mb-3"
                  />
                  <h4 className="font-serif font-bold text-sm sm:text-base text-[#1C1917] dark:text-[#F5F3EF] group-hover:text-[#22382D] dark:group-hover:text-[#DE6D43] transition-colors line-clamp-2">
                    {rel.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-2 text-xs text-[#857F77]">
                    <img
                      src={rel.author_avatar}
                      alt={rel.author_name}
                      className="w-4 h-4 rounded-full object-cover"
                    />
                    <span>{rel.author_name}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
