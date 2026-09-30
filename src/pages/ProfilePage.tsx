import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, 
  Calendar, 
  BookOpen, 
  Users, 
  Eye, 
  Sparkles, 
  Edit3, 
  UserPlus, 
  UserCheck, 
  Check, 
  Bookmark as BookmarkIcon,
  Layers
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { User, Story } from '../types';
import { useAuth } from '../context/AuthContext';
import { MosaicWall } from '../components/MosaicWall';

interface ProfilePageProps {
  username: string;
  navigate: (path: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ username, navigate }) => {
  const { user: currentUser, updateUser, openAuthModal } = useAuth();

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [draftStories, setDraftStories] = useState<Story[]>([]);
  const [savedStories, setSavedStories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'stories' | 'drafts' | 'saved' | 'about'>('stories');
  const [isFollowing, setIsFollowing] = useState(false);

  // Edit profile modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const isOwnProfile = currentUser && currentUser.username.toLowerCase() === username.toLowerCase();

  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ user: User; stories: Story[] }>(`/users/${username}`);
      if (res && res.user) {
        setProfileUser(res.user);
        setStories(res.stories || []);
        setIsFollowing(!!res.user.isFollowing);
        setEditName(res.user.name);
        setEditBio(res.user.bio || '');
        setEditAvatar(res.user.avatar_url || '');
      }

      // If own profile, also fetch drafts and saved
      if (isOwnProfile && currentUser) {
        const [dashRes, savedRes] = await Promise.all([
          apiRequest<{ stories: Story[] }>('/dashboard').catch(() => ({ stories: [] })),
          apiRequest<{ savedStories: any[] }>(`/users/${currentUser.id}/saved`).catch(() => ({ savedStories: [] })),
        ]);
        if (dashRes?.stories) {
          setDraftStories(dashRes.stories.filter((s: any) => s.status === 'draft'));
        }
        if (savedRes?.savedStories) {
          setSavedStories(savedRes.savedStories);
        }
      }
    } catch (err: any) {
      setError(err.message || 'User profile not found.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [username, currentUser?.id]);

  const handleToggleFollow = async () => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    if (!profileUser) return;

    const next = !isFollowing;
    setIsFollowing(next);

    try {
      if (next) {
        await apiRequest(`/users/${profileUser.id}/follow`, { method: 'POST' });
      } else {
        await apiRequest(`/users/${profileUser.id}/follow`, { method: 'DELETE' });
      }
      fetchProfile();
    } catch {
      setIsFollowing(!next);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsSavingProfile(true);
    try {
      const res = await apiRequest<{ user: User }>(`/users/${currentUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editName.trim(),
          bio: editBio.trim(),
          avatar_url: editAvatar.trim(),
        }),
      });

      if (res?.user) {
        updateUser(res.user);
        setProfileUser((prev) => prev ? { ...prev, ...res.user } : res.user);
      }
      setIsEditModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 animate-pulse space-y-6">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-black/10 dark:bg-white/10" />
          <div className="space-y-2 flex-1">
            <div className="h-6 w-48 bg-black/10 dark:bg-white/10 rounded-md" />
            <div className="h-4 w-32 bg-black/10 dark:bg-white/10 rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <h2 className="font-serif text-2xl font-bold text-[#1C1917] dark:text-[#F5F3EF]">
          AUTHOR NOT FOUND
        </h2>
        <p className="text-xs text-[#857F77] dark:text-[#A8A39C] mt-2 mb-6">
          {error || 'This user does not exist in the MOSAIC registry.'}
        </p>
        <button
          onClick={() => navigate('/explore')}
          className="px-5 py-2.5 rounded-full bg-[#22382D] text-white text-xs font-semibold"
        >
          Explore Stories
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14">
      {/* Editorial Profile Header */}
      <div className="p-6 sm:p-10 rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#18191D]/70 shadow-xs mb-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          {/* Avatar & Info */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <img
              src={profileUser.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'}
              alt={profileUser.name}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover ring-4 ring-black/5 dark:ring-white/10 shadow-sm"
            />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1917] dark:text-[#F5F3EF]">
                  {profileUser.name}
                </h1>
                <span className="text-xs font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[#57534E] dark:text-[#A8A39C]">
                  {profileUser.role}
                </span>
              </div>
              <div className="text-sm text-[#857F77] mt-0.5">@{profileUser.username}</div>

              {profileUser.bio && (
                <p className="text-xs sm:text-sm text-[#57534E] dark:text-[#A8A39C] mt-2 max-w-xl font-editorial leading-relaxed">
                  {profileUser.bio}
                </p>
              )}

              {profileUser.created_at && (
                <div className="flex items-center gap-1.5 text-xs text-[#857F77] mt-3">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    Archivist since {new Date(profileUser.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action button (Edit Profile or Follow) */}
          <div className="self-stretch sm:self-auto flex items-center gap-3">
            {isOwnProfile ? (
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-full border border-black/15 dark:border-white/20 text-xs font-semibold text-[#1C1917] dark:text-[#F5F3EF] hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            ) : (
              <button
                onClick={handleToggleFollow}
                className={`w-full sm:w-auto px-6 py-2.5 rounded-full text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                  isFollowing
                    ? 'border border-black/20 dark:border-white/20 text-[#1C1917] dark:text-[#F5F3EF] hover:bg-black/5'
                    : 'bg-[#22382D] text-white dark:bg-[#DE6D43] dark:text-[#0F1012] hover:opacity-90'
                }`}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Follow Author</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Author Statistics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-black/10 dark:border-white/10 text-center sm:text-left">
          <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#857F77]">Stories</span>
            <div className="font-serif text-xl font-bold text-[#1C1917] dark:text-[#F5F3EF]">
              {profileUser.stats?.storiesCount ?? stories.length}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#857F77]">Followers</span>
            <div className="font-serif text-xl font-bold text-[#1C1917] dark:text-[#F5F3EF]">
              {profileUser.stats?.followersCount || 0}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#857F77]">Following</span>
            <div className="font-serif text-xl font-bold text-[#1C1917] dark:text-[#F5F3EF]">
              {profileUser.stats?.followingCount || 0}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#857F77]">Total Reads</span>
            <div className="font-serif text-xl font-bold text-[#1C1917] dark:text-[#F5F3EF]">
              {profileUser.stats?.totalReads?.toLocaleString() || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-black/10 dark:border-white/10 mb-8 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('stories')}
          className={`pb-3 px-4 text-xs font-semibold uppercase tracking-wider transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'stories'
              ? 'border-b-2 border-[#22382D] dark:border-[#DE6D43] text-[#1C1917] dark:text-[#F5F3EF]'
              : 'text-[#857F77] hover:text-[#1C1917] dark:hover:text-white'
          }`}
        >
          Published Stories ({stories.length})
        </button>

        {isOwnProfile && (
          <button
            onClick={() => setActiveTab('drafts')}
            className={`pb-3 px-4 text-xs font-semibold uppercase tracking-wider transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'drafts'
                ? 'border-b-2 border-[#22382D] dark:border-[#DE6D43] text-[#1C1917] dark:text-[#F5F3EF]'
                : 'text-[#857F77] hover:text-[#1C1917] dark:hover:text-white'
            }`}
          >
            Drafts ({draftStories.length})
          </button>
        )}

        {isOwnProfile && (
          <button
            onClick={() => setActiveTab('saved')}
            className={`pb-3 px-4 text-xs font-semibold uppercase tracking-wider transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'saved'
                ? 'border-b-2 border-[#22382D] dark:border-[#DE6D43] text-[#1C1917] dark:text-[#F5F3EF]'
                : 'text-[#857F77] hover:text-[#1C1917] dark:hover:text-white'
            }`}
          >
            Saved Shelf ({savedStories.length})
          </button>
        )}

        <button
          onClick={() => setActiveTab('about')}
          className={`pb-3 px-4 text-xs font-semibold uppercase tracking-wider transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'about'
              ? 'border-b-2 border-[#22382D] dark:border-[#DE6D43] text-[#1C1917] dark:text-[#F5F3EF]'
              : 'text-[#857F77] hover:text-[#1C1917] dark:hover:text-white'
          }`}
        >
          About
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'stories' && (
        <MosaicWall
          stories={stories}
          isLoading={false}
          error={null}
          onRetry={fetchProfile}
          onSelectStory={(slugOrId) => navigate(`/story/${slugOrId}`)}
          title="Curated Dispatches"
          subtitle={`Stories published by ${profileUser.name}.`}
        />
      )}

      {activeTab === 'drafts' && (
        <div className="space-y-4">
          {draftStories.length === 0 ? (
            <div className="text-center py-16 text-xs text-[#857F77]">
              No active drafts. Click Write to create a new piece.
            </div>
          ) : (
            draftStories.map((draft) => (
              <div
                key={draft.id}
                className="p-5 rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#18191D]/70 flex items-center justify-between"
              >
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
                    Draft
                  </span>
                  <h3 className="font-serif font-bold text-lg text-[#1C1917] dark:text-[#F5F3EF] mt-1">
                    {draft.title || 'Untitled Draft'}
                  </h3>
                  <p className="text-xs text-[#857F77] mt-0.5">
                    Last touched {new Date(draft.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/write?edit=${draft.id}`)}
                  className="px-4 py-2 rounded-full bg-[#22382D] text-white dark:bg-[#DE6D43] dark:text-[#0F1012] text-xs font-semibold cursor-pointer"
                >
                  Resume Writing
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'saved' && (
        <div className="space-y-4">
          {savedStories.length === 0 ? (
            <div className="text-center py-16 text-xs text-[#857F77]">
              Your reading shelf is empty. Save stories using the bookmark button.
            </div>
          ) : (
            savedStories.map((s) => (
              <div
                key={s.id}
                onClick={() => navigate(`/story/${s.slug || s.id}`)}
                className="p-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#18191D]/70 hover:bg-white dark:hover:bg-[#18191D] transition-all flex items-center gap-4 cursor-pointer"
              >
                <img src={s.cover_image} alt={s.title} className="w-16 h-16 rounded-xl object-cover" />
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] uppercase font-bold text-[#857F77]">{s.category_name}</span>
                  <h4 className="font-serif font-bold text-base text-[#1C1917] dark:text-[#F5F3EF] truncate">{s.title}</h4>
                  <span className="text-xs text-[#857F77]">by {s.author_name}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'about' && (
        <div className="max-w-2xl p-6 rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#18191D]/70 space-y-4">
          <h3 className="font-serif font-bold text-xl text-[#1C1917] dark:text-[#F5F3EF]">
            About the Author
          </h3>
          <p className="text-sm text-[#57534E] dark:text-[#A8A39C] leading-relaxed font-sans-ui">
            {profileUser.bio || `${profileUser.name} is an active reader and author in the MOSAIC collective.`}
          </p>
          <div className="pt-4 border-t border-black/5 dark:border-white/5 text-xs text-[#857F77]">
            Member Role: <span className="font-bold text-[#1C1917] dark:text-[#F5F3EF] capitalize">{profileUser.role}</span>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#FBF9F5] dark:bg-[#18191D] rounded-3xl border border-black/10 dark:border-white/10 p-6 shadow-2xl">
            <h3 className="font-serif text-xl font-bold text-[#1C1917] dark:text-[#F5F3EF] mb-4">
              Edit Author Profile
            </h3>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#857F77] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] text-[#1C1917] dark:text-[#F5F3EF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#857F77] mb-1">Avatar Image URL</label>
                <input
                  type="url"
                  value={editAvatar}
                  onChange={(e) => setEditAvatar(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] text-[#1C1917] dark:text-[#F5F3EF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#857F77] mb-1">Author Bio</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] text-[#1C1917] dark:text-[#F5F3EF]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs text-[#857F77]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-5 py-2 rounded-xl bg-[#22382D] text-white dark:bg-[#DE6D43] dark:text-[#0F1012] text-xs font-semibold"
                >
                  {isSavingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
