import React from 'react';
import { LayoutGrid, List, AlertTriangle, RefreshCw, BookOpen, Clock, MessageSquare, Sparkles, ArrowRight } from 'lucide-react';
import { Story } from '../types';
import { StoryTile } from './StoryTile';

interface MosaicWallProps {
  stories: Story[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelectStory: (slugOrId: string | number) => void;
  viewMode?: 'mosaic' | 'list';
  onToggleViewMode?: (mode: 'mosaic' | 'list') => void;
  title?: string;
  subtitle?: string;
  hideHeader?: boolean;
}

export const MosaicWall: React.FC<MosaicWallProps> = ({
  stories,
  isLoading,
  error,
  onRetry,
  onSelectStory,
  viewMode = 'mosaic',
  onToggleViewMode,
  title,
  subtitle,
  hideHeader = false,
}) => {
  return (
    <section className="w-full">
      {/* Optional Wall Header with View Toggle Controls */}
      {!hideHeader && (title || onToggleViewMode) && (
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 pb-4 border-b border-black/10 dark:border-white/10">
          <div>
            {title && (
              <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#1C1917] dark:text-[#F5F3EF]">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-xs sm:text-sm text-[#857F77] dark:text-[#A8A39C] mt-1">
                {subtitle}
              </p>
            )}
          </div>

          {/* Mosaic View / List View Controls */}
          {onToggleViewMode && (
            <div className="flex items-center gap-1 p-1 bg-black/5 dark:bg-white/5 rounded-full self-start sm:self-auto border border-black/5 dark:border-white/5">
              <button
                type="button"
                onClick={() => onToggleViewMode('mosaic')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'mosaic'
                    ? 'bg-[#22382D] text-white dark:bg-[#DE6D43] dark:text-[#0F1012] shadow-xs'
                    : 'text-[#857F77] hover:text-[#1C1917] dark:hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Mosaic View</span>
              </button>

              <button
                type="button"
                onClick={() => onToggleViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-[#22382D] text-white dark:bg-[#DE6D43] dark:text-[#0F1012] shadow-xs'
                    : 'text-[#857F77] hover:text-[#1C1917] dark:hover:text-white'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>List View</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* STATE 1: LOADING SKELETONS */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          <div className="col-span-1 sm:col-span-2 row-span-2 min-h-[460px] rounded-3xl bg-black/5 dark:bg-white/5" />
          <div className="min-h-[300px] rounded-3xl bg-black/5 dark:bg-white/5" />
          <div className="min-h-[300px] rounded-3xl bg-black/5 dark:bg-white/5" />
          <div className="col-span-1 sm:col-span-2 min-h-[340px] rounded-3xl bg-black/5 dark:bg-white/5" />
          <div className="min-h-[300px] rounded-3xl bg-black/5 dark:bg-white/5" />
        </div>
      )}

      {/* STATE 3: API / NETWORK FAILURE */}
      {!isLoading && error && (
        <div className="my-8 p-8 rounded-3xl border border-red-500/20 bg-red-500/5 text-center max-w-lg mx-auto">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h3 className="font-serif text-xl font-bold text-[#1C1917] dark:text-[#F5F3EF]">
            Unable to load stories.
          </h3>
          <p className="text-xs text-[#857F77] dark:text-[#A8A39C] mt-2 mb-5">
            {error}
          </p>
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#22382D] hover:bg-[#192B22] text-white dark:bg-[#DE6D43] dark:hover:bg-[#E77E57] dark:text-[#0F1012] text-xs font-semibold transition-all shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>RETRY</span>
          </button>
        </div>
      )}

      {/* STATE 2: SUCCESSFUL API REQUEST + ZERO STORIES */}
      {!isLoading && !error && stories.length === 0 && (
        <div className="my-12 p-12 rounded-3xl border border-black/5 dark:border-white/5 bg-white/40 dark:bg-[#18191D]/40 text-center max-w-md mx-auto">
          <BookOpen className="w-12 h-12 text-[#857F77] stroke-1 mx-auto mb-3" />
          <h3 className="font-serif text-xl font-bold text-[#1C1917] dark:text-[#F5F3EF]">
            No stories here yet.
          </h3>
          <p className="text-xs text-[#857F77] dark:text-[#A8A39C] mt-2">
            No published articles matched the selected filter. Try another category or check back soon for fresh editorial pieces.
          </p>
        </div>
      )}

      {/* STATE 4: SUCCESSFUL REQUEST + STORIES */}
      {!isLoading && !error && stories.length > 0 && (
        <>
          {viewMode === 'mosaic' ? (
            /* SIGNATURE ASYMMETRIC CSS GRID */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6 auto-rows-auto [grid-auto-flow:dense]">
              {stories.map((story, idx) => (
                <StoryTile
                  key={story.id}
                  story={story}
                  index={idx}
                  onClick={() => onSelectStory(story.slug || story.id)}
                />
              ))}
            </div>
          ) : (
            /* EDITORIAL LIST VIEW */
            <div className="space-y-4">
              {stories.map((story) => (
                <div
                  key={story.id}
                  onClick={() => onSelectStory(story.slug || story.id)}
                  className="group p-5 rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#18191D]/70 hover:bg-white dark:hover:bg-[#18191D] hover:border-black/25 dark:hover:border-white/25 transition-all flex flex-col sm:flex-row items-start sm:items-center gap-5 cursor-pointer shadow-xs hover:shadow-md"
                >
                  <img
                    src={story.cover_image}
                    alt={story.title}
                    className="w-full sm:w-44 h-36 rounded-xl object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider"
                        style={{
                          backgroundColor: `${story.category.color || '#22382D'}15`,
                          color: story.category.color || '#22382D',
                        }}
                      >
                        {story.category.name}
                      </span>
                      <span className="text-xs text-[#857F77]">
                        • {story.reading_time_minutes} min read
                      </span>
                      <span className="text-xs text-[#857F77] hidden md:inline">
                        • {new Date(story.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <h3 className="font-serif font-bold text-lg sm:text-xl text-[#1C1917] dark:text-[#F5F3EF] group-hover:text-[#22382D] dark:group-hover:text-[#DE6D43] transition-colors leading-snug">
                      {story.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#57534E] dark:text-[#A8A39C] line-clamp-2 mt-1 font-sans-ui">
                      {story.subtitle || story.excerpt}
                    </p>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/5 dark:border-white/5">
                      <div className="flex items-center gap-2 text-xs text-[#57534E] dark:text-[#A8A39C]">
                        <img
                          src={story.author.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'}
                          alt={story.author.name}
                          className="w-4 h-4 rounded-full object-cover"
                        />
                        <span>{story.author.name}</span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-[#857F77]">
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-[#C85A32] dark:text-[#DE6D43]" />
                          {story.stats?.reactions || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" />
                          {story.stats?.comments || 0}
                        </span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
};
