import React, { useState, useEffect } from 'react';
import { BarChart3, Eye, MessageSquare, Sparkles, Users, PenTool, Edit3, Trash2, ArrowUpRight } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { Story } from '../types';
import { useAuth } from '../context/AuthContext';

interface DashboardPageProps {
  navigate: (path: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ navigate }) => {
  const { user, openAuthModal } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [stories, setStories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboard = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await apiRequest<{ stats: any; stories: any[] }>('/dashboard');
      if (res) {
        setStats(res.stats);
        setStories(res.stories || []);
      }
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
    fetchDashboard();
  }, [user]);

  const handleDeleteStory = async (id: number) => {
    if (!confirm('Are you sure you want to permanently delete this story?')) return;
    try {
      await apiRequest(`/stories/${id}`, { method: 'DELETE' });
      await fetchDashboard();
    } catch (err: any) {
      alert(err.message || 'Failed to delete story.');
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <p className="text-sm text-[#857F77] mb-4">Please sign in to access your creator dashboard.</p>
        <button
          onClick={() => openAuthModal('login')}
          className="px-5 py-2.5 rounded-full bg-[#22382D] text-white text-xs font-semibold"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-black/10 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#22382D] dark:text-[#DE6D43] mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Editorial Analytics</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#1C1917] dark:text-[#F5F3EF]">
            Creator Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-[#857F77] dark:text-[#A8A39C] mt-1">
            Overview of your publications, drafts, and readership reach.
          </p>
        </div>

        <button
          onClick={() => navigate('/write')}
          className="px-5 py-2.5 rounded-full bg-[#22382D] hover:bg-[#192B22] text-white dark:bg-[#DE6D43] dark:hover:bg-[#E77E57] dark:text-[#0F1012] text-xs font-semibold flex items-center gap-2 shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <PenTool className="w-4 h-4" />
          <span>Write New Story</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
        <div className="p-5 rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#18191D]/70 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#857F77]">Published</span>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1917] dark:text-[#F5F3EF] mt-1">
            {stats?.published_count || 0}
          </div>
        </div>

        <div className="p-5 rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#18191D]/70 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#857F77]">Drafts</span>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1917] dark:text-[#F5F3EF] mt-1">
            {stats?.draft_count || 0}
          </div>
        </div>

        <div className="p-5 rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#18191D]/70 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#857F77] flex items-center gap-1">
            <Eye className="w-3 h-3" /> Total Reads
          </span>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1917] dark:text-[#F5F3EF] mt-1">
            {stats?.total_views?.toLocaleString() || 0}
          </div>
        </div>

        <div className="p-5 rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#18191D]/70 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#857F77] flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#C85A32] dark:text-[#DE6D43]" /> Reactions
          </span>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1917] dark:text-[#F5F3EF] mt-1">
            {stats?.total_reactions || 0}
          </div>
        </div>

        <div className="p-5 rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#18191D]/70 shadow-xs col-span-2 lg:col-span-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#857F77] flex items-center gap-1">
            <Users className="w-3 h-3" /> Followers
          </span>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1917] dark:text-[#F5F3EF] mt-1">
            {stats?.followers_count || 0}
          </div>
        </div>
      </div>

      {/* Stories Table */}
      <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#18191D]/70 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
          <h2 className="font-serif text-xl font-bold text-[#1C1917] dark:text-[#F5F3EF]">
            Story Performance
          </h2>
          <span className="text-xs text-[#857F77]">{stories.length} total entries</span>
        </div>

        {stories.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#857F77]">
            You haven't written any stories yet. Click Write New Story to begin.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/5 dark:bg-white/5 uppercase text-[10px] tracking-wider text-[#857F77]">
                <tr>
                  <th className="p-4 pl-6">Story</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Reads</th>
                  <th className="p-4">Reactions</th>
                  <th className="p-4">Comments</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {stories.map((story) => (
                  <tr key={story.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 pl-6">
                      <div className="font-serif font-bold text-sm text-[#1C1917] dark:text-[#F5F3EF] max-w-xs truncate">
                        {story.title || 'Untitled Draft'}
                      </div>
                      <div className="text-[11px] text-[#857F77]">
                        Updated {new Date(story.updated_at || story.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-semibold text-[#857F77]">{story.category_name}</span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] tracking-wider ${
                          story.status === 'published'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {story.status}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-[#1C1917] dark:text-[#F5F3EF]">
                      {story.views_count?.toLocaleString() || 0}
                    </td>
                    <td className="p-4 font-semibold text-[#1C1917] dark:text-[#F5F3EF]">
                      {story.reactions_count || 0}
                    </td>
                    <td className="p-4 font-semibold text-[#1C1917] dark:text-[#F5F3EF]">
                      {story.comments_count || 0}
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {story.status === 'published' && (
                          <button
                            onClick={() => navigate(`/story/${story.slug || story.id}`)}
                            title="View public story"
                            className="p-1.5 text-[#857F77] hover:text-[#1C1917] dark:hover:text-white rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/write?edit=${story.id}`)}
                          title="Edit story"
                          className="p-1.5 text-[#857F77] hover:text-[#1C1917] dark:hover:text-white rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStory(story.id)}
                          title="Delete story"
                          className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-500/10 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
