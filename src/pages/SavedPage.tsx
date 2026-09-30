import React, { useState, useEffect } from 'react';
import { Bookmark, Clock, ArrowRight, BookOpen } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface SavedPageProps {
  navigate: (path: string) => void;
}

export const SavedPage: React.FC<SavedPageProps> = ({ navigate }) => {
  const { user, openAuthModal } = useAuth();
  const [savedStories, setSavedStories] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'finished'>('all');
  const [isLoading, setIsLoading] = useState(true);

  const fetchSaved = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await apiRequest<{ savedStories: any[] }>(`/users/${user.id}/saved`);
      setSavedStories(res?.savedStories || []);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    fetchSaved();
  }, [user]);

  const filteredStories = savedStories.filter((s) => {
    if (filter === 'all') return true;
    return s.bookmark_status === filter;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="pb-6 mb-8 border-b border-black/10 dark:border-white/10">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#22382D] dark:text-[#DE6D43] mb-1">
          <Bookmark className="w-4 h-4" />
          <span>Personal Shelf</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#1C1917] dark:text-[#F5F3EF]">
          My Saved Stories
        </h1>
        <p className="text-xs sm:text-sm text-[#857F77] dark:text-[#A8A39C] mt-1">
          Archived dispatches for later contemplation.
        </p>

        {/* Filter Tabs */}
        <div className="flex gap-2 mt-6">
          {(['all', 'unread', 'finished'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all cursor-pointer ${
                filter === tab
                  ? 'bg-[#22382D] text-white dark:bg-[#DE6D43] dark:text-[#0F1012]'
                  : 'bg-black/5 dark:bg-white/5 text-[#857F77] hover:text-[#1C1917] dark:hover:text-white'
              }`}
            >
              {tab === 'all' ? 'All Saved' : tab}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-black/5 dark:bg-white/5" />
          ))}
        </div>
      ) : filteredStories.length === 0 ? (
        <div className="text-center py-20 text-xs text-[#857F77] dark:text-[#A8A39C]">
          <BookOpen className="w-10 h-10 mx-auto text-[#857F77] stroke-1 mb-2" />
          <h3 className="font-serif text-lg font-bold text-[#1C1917] dark:text-[#F5F3EF]">
            Your reading shelf is empty.
          </h3>
          <p className="mt-1 mb-4">Click the bookmark icon on any story to save it here.</p>
          <button
            onClick={() => navigate('/explore')}
            className="px-5 py-2.5 rounded-full bg-[#22382D] text-white dark:bg-[#DE6D43] dark:text-[#0F1012] font-semibold text-xs"
          >
            Discover Stories
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredStories.map((story) => (
            <div
              key={story.id}
              onClick={() => navigate(`/story/${story.slug || story.id}`)}
              className="p-5 rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#18191D]/70 hover:bg-white dark:hover:bg-[#18191D] transition-all flex items-center gap-5 cursor-pointer group shadow-2xs"
            >
              <img
                src={story.cover_image}
                alt={story.title}
                className="w-24 h-24 rounded-xl object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase text-[#857F77]">
                    {story.category_name}
                  </span>
                  <span className="text-xs text-[#857F77]">• {story.reading_time_minutes} min read</span>
                </div>
                <h3 className="font-serif font-bold text-lg text-[#1C1917] dark:text-[#F5F3EF] group-hover:text-[#22382D] dark:group-hover:text-[#DE6D43] transition-colors truncate">
                  {story.title}
                </h3>
                <div className="flex items-center gap-2 mt-2 text-xs text-[#857F77]">
                  <img
                    src={story.author_avatar}
                    alt={story.author_name}
                    className="w-4 h-4 rounded-full object-cover"
                  />
                  <span>{story.author_name}</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#857F77] group-hover:translate-x-1 transition-transform" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
