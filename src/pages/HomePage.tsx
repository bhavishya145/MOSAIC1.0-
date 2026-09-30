import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, TrendingUp, Compass, PenTool, BookOpen } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { Story } from '../types';
import { MosaicWall } from '../components/MosaicWall';
import { useAuth } from '../context/AuthContext';

interface HomePageProps {
  navigate: (path: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ navigate }) => {
  const { user, openAuthModal } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [trendingStories, setTrendingStories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHomeStories = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [storiesRes, trendingRes] = await Promise.all([
        apiRequest<{ stories: Story[] }>('/stories?limit=12&sort=latest'),
        apiRequest<{ trending: any[] }>('/stories/trending'),
      ]);
      setStories(storiesRes.stories || []);
      setTrendingStories(trendingRes.trending || []);
    } catch (err: any) {
      setError(err.message || 'Unable to load stories.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHomeStories();
  }, []);

  return (
    <div className="w-full">
      {/* Editorial Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-16 sm:pt-14 sm:pb-24 border-b border-black/10 dark:border-white/10 bg-grain">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Left Hero Narrative */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#18191D]/70 text-xs font-semibold text-[#22382D] dark:text-[#DE6D43]">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="uppercase tracking-widest text-[11px]">Digital Magazine & Story Archive</span>
              </div>

              <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-[#1C1917] dark:text-[#F5F3EF] leading-[1.08]">
                Stories don't have to look the same.
              </h1>

              <p className="text-lg sm:text-xl text-[#57534E] dark:text-[#A8A39C] max-w-xl font-editorial italic leading-relaxed">
                "Write something worth remembering. Discover something worth reading."
              </p>

              <p className="text-sm text-[#857F77] dark:text-[#A8A39C] max-w-lg leading-relaxed">
                MOSAIC organizes thought-provoking personal archives, quiet tech essays, and architectural memoirs into a living visual editorial wall.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <button
                  onClick={() => {
                    if (!user) openAuthModal('login');
                    else navigate('/write');
                  }}
                  className="px-6 py-3.5 rounded-full bg-[#22382D] hover:bg-[#192B22] text-white dark:bg-[#DE6D43] dark:hover:bg-[#E77E57] dark:text-[#0F1012] font-semibold text-xs tracking-wider uppercase transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  <PenTool className="w-4 h-4" />
                  <span>Create a Story</span>
                </button>

                <button
                  onClick={() => navigate('/explore')}
                  className="px-6 py-3.5 rounded-full border border-black/15 dark:border-white/20 text-[#1C1917] dark:text-[#F5F3EF] hover:bg-black/5 dark:hover:bg-white/5 font-semibold text-xs tracking-wider uppercase transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Compass className="w-4 h-4" />
                  <span>Explore Stories</span>
                </button>
              </div>
            </div>

            {/* Right: Animated Miniature Mosaic Wall Showcase */}
            <div className="lg:col-span-5 relative">
              <div className="p-3 bg-white/40 dark:bg-white/5 rounded-3xl border border-black/10 dark:border-white/10 backdrop-blur-md shadow-xl">
                <div className="grid grid-cols-3 gap-3 auto-rows-[100px] sm:auto-rows-[120px]">
                  {/* Miniature Featured Tile */}
                  <div 
                    onClick={() => stories[0] && navigate(`/story/${stories[0].slug || stories[0].id}`)}
                    className="col-span-2 row-span-2 rounded-2xl overflow-hidden relative group cursor-pointer border border-black/10 shadow-sm"
                  >
                    <img
                      src={stories[0]?.cover_image || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=800&q=80'}
                      alt="Featured Tile"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent p-4 flex flex-col justify-end text-white">
                      <span className="text-[9px] uppercase font-bold tracking-widest text-[#DE6D43]">Lead Story</span>
                      <h4 className="font-serif font-bold text-xs sm:text-sm line-clamp-2 mt-0.5">
                        {stories[0]?.title || 'Why Small Interfaces Feel Better'}
                      </h4>
                    </div>
                  </div>

                  {/* Miniature Small Tile 1 */}
                  <div 
                    onClick={() => stories[1] && navigate(`/story/${stories[1].slug || stories[1].id}`)}
                    className="col-span-1 row-span-1 rounded-2xl overflow-hidden relative group cursor-pointer border border-black/10 shadow-sm"
                  >
                    <img
                      src={stories[1]?.cover_image || 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80'}
                      alt="Small Tile"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-2.5 flex flex-col justify-end text-white">
                      <span className="text-[8px] uppercase tracking-wider text-emerald-400 font-bold">College</span>
                      <h5 className="font-serif text-[11px] font-bold line-clamp-1">Campus Labs</h5>
                    </div>
                  </div>

                  {/* Miniature Small Tile 2 */}
                  <div 
                    onClick={() => stories[2] && navigate(`/story/${stories[2].slug || stories[2].id}`)}
                    className="col-span-1 row-span-1 rounded-2xl overflow-hidden relative group cursor-pointer border border-black/10 shadow-sm"
                  >
                    <img
                      src={stories[2]?.cover_image || 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80'}
                      alt="Small Tile"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-2.5 flex flex-col justify-end text-white">
                      <span className="text-[8px] uppercase tracking-wider text-amber-300 font-bold">Travel</span>
                      <h5 className="font-serif text-[11px] font-bold line-clamp-1">Kyoto Temples</h5>
                    </div>
                  </div>

                  {/* Miniature Wide Tile */}
                  <div 
                    onClick={() => stories[3] && navigate(`/story/${stories[3].slug || stories[3].id}`)}
                    className="col-span-3 row-span-1 rounded-2xl overflow-hidden relative group cursor-pointer border border-black/10 shadow-sm"
                  >
                    <img
                      src={stories[3]?.cover_image || 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80'}
                      alt="Wide Tile"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent p-4 flex flex-col justify-center text-white">
                      <span className="text-[9px] uppercase font-bold tracking-widest text-sky-300">Science</span>
                      <h4 className="font-serif font-bold text-xs sm:text-sm line-clamp-1">
                        {stories[3]?.title || 'Quantum Coherence at Room Temperature'}
                      </h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trending Today Strip */}
      {trendingStories.length > 0 && (
        <section className="py-8 border-b border-black/10 dark:border-white/10 bg-[#F3EFE6]/40 dark:bg-[#18191D]/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-[#C85A32] dark:text-[#DE6D43]" />
              <span className="text-xs font-bold uppercase tracking-widest text-[#1C1917] dark:text-[#F5F3EF]">
                Trending Today
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C85A32]/10 text-[#C85A32] dark:bg-[#DE6D43]/10 dark:text-[#DE6D43] uppercase tracking-wider">
                Rising
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {trendingStories.slice(0, 3).map((item, idx) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/story/${item.slug || item.id}`)}
                  className="flex items-center gap-4 p-3 rounded-2xl bg-white/60 dark:bg-[#18191D]/60 hover:bg-white dark:hover:bg-[#18191D] border border-black/5 dark:border-white/5 transition-all cursor-pointer group shadow-2xs"
                >
                  <span className="font-brand text-2xl font-bold text-[#857F77]/40 group-hover:text-[#22382D] dark:group-hover:text-[#DE6D43] transition-colors w-6 text-center">
                    0{idx + 1}
                  </span>
                  <img
                    src={item.cover_image}
                    alt={item.title}
                    className="w-14 h-14 rounded-xl object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-bold text-[#857F77]">
                      {item.category_name}
                    </span>
                    <h4 className="font-serif font-bold text-xs sm:text-sm text-[#1C1917] dark:text-[#F5F3EF] truncate group-hover:text-[#22382D] dark:group-hover:text-[#DE6D43] transition-colors">
                      {item.title}
                    </h4>
                    <span className="text-[11px] text-[#857F77]">
                      by {item.author_name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Signature Living Editorial Mosaic Wall */}
      <section className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <MosaicWall
          stories={stories}
          isLoading={isLoading}
          error={error}
          onRetry={fetchHomeStories}
          onSelectStory={(slugOrId) => navigate(`/story/${slugOrId}`)}
          title="The Living Editorial Wall"
          subtitle="An asymmetric mosaic of ideas, dispatches, and quiet archives."
        />

        <div className="mt-12 text-center">
          <button
            onClick={() => navigate('/explore')}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full border border-black/15 dark:border-white/20 text-[#1C1917] dark:text-[#F5F3EF] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold tracking-wider uppercase transition-all shadow-xs cursor-pointer group"
          >
            <span>Explore All Editorial Categories</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>
    </div>
  );
};
