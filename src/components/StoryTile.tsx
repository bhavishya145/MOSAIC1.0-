import React from 'react';
import { Clock, MessageSquare, Sparkles, Bookmark, ArrowUpRight } from 'lucide-react';
import { Story } from '../types';

interface StoryTileProps {
  story: Story;
  onClick: () => void;
  index?: number;
}

export const StoryTile: React.FC<StoryTileProps> = ({ story, onClick, index = 0 }) => {
  const {
    title,
    subtitle,
    excerpt,
    cover_image,
    reading_time_minutes,
    tile_size,
    category,
    author,
    stats,
    created_at,
  } = story;

  // Grid spans based on tile_size
  let sizeClasses = 'col-span-1 row-span-1 min-h-[300px]';

  if (tile_size === 'featured') {
    // Large prominent feature tile: spans 2 cols, 2 rows on medium/large screens
    sizeClasses = 'md:col-span-2 md:row-span-2 min-h-[440px] md:min-h-[540px]';
  } else if (tile_size === 'large') {
    // Wide horizontal or tall tile
    sizeClasses = 'md:col-span-2 min-h-[340px] md:min-h-[380px]';
  } else if (tile_size === 'small') {
    sizeClasses = 'col-span-1 min-h-[260px] md:min-h-[300px]';
  } else {
    // Medium standard tile
    sizeClasses = 'col-span-1 min-h-[320px] md:min-h-[360px]';
  }

  const formattedDate = new Date(created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#18191D] cursor-pointer transition-all duration-300 hover:shadow-2xl hover:border-black/25 dark:hover:border-white/25 flex flex-col justify-end ${sizeClasses}`}
    >
      {/* Background Cover Image with subtle zoom & pan on hover */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-stone-900">
        <img
          src={cover_image}
          alt={title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 group-hover:brightness-90 opacity-90 dark:opacity-80"
        />
        {/* Layered Editorial Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/10 transition-opacity duration-300 group-hover:opacity-90" />
      </div>

      {/* Top Floating Badge: Category & Tile Indicator */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
        <span
          className="text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full backdrop-blur-md shadow-xs transition-transform group-hover:-translate-y-0.5"
          style={{
            backgroundColor: `${category.color || '#22382D'}E6`,
            color: '#FFFFFF',
          }}
        >
          {category.name}
        </span>

        {tile_size === 'featured' && (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center gap-1 border border-white/20">
            <Sparkles className="w-2.5 h-2.5" />
            <span>Curated Lead</span>
          </span>
        )}
      </div>

      {/* Bottom Content Area */}
      <div className="relative z-10 p-5 sm:p-6 text-white flex flex-col justify-end">
        {/* Author & Reading Time */}
        <div className="flex items-center gap-2 mb-2 text-xs text-stone-300">
          <img
            src={author.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'}
            alt={author.name}
            className="w-5 h-5 rounded-full object-cover ring-1 ring-white/30"
          />
          <span className="font-medium text-white/90">{author.name}</span>
          <span className="text-white/40">•</span>
          <span className="flex items-center gap-1 text-[11px] text-stone-300">
            <Clock className="w-3 h-3" />
            {reading_time_minutes} min read
          </span>
          <span className="text-white/40 hidden sm:inline">•</span>
          <span className="text-[11px] text-stone-400 hidden sm:inline">{formattedDate}</span>
        </div>

        {/* Title */}
        <h3
          className={`font-serif font-bold tracking-tight text-white transition-colors group-hover:text-[#DE6D43] leading-tight ${
            tile_size === 'featured'
              ? 'text-2xl sm:text-3xl lg:text-4xl'
              : tile_size === 'large'
              ? 'text-xl sm:text-2xl'
              : 'text-lg sm:text-xl'
          }`}
        >
          {title}
        </h3>

        {/* Short Description (Reveals or truncates gracefully) */}
        {(subtitle || excerpt) && (
          <p
            className={`text-xs sm:text-sm text-stone-300 line-clamp-2 mt-2 leading-relaxed transition-all duration-300 font-sans-ui ${
              tile_size === 'small' ? 'hidden sm:line-clamp-1' : ''
            }`}
          >
            {subtitle || excerpt}
          </p>
        )}

        {/* Footer Meta & 'Read Story' Action */}
        <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs text-stone-300">
          {/* Reaction & Comments stats */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[11px] text-stone-300">
              <Sparkles className="w-3.5 h-3.5 text-[#DE6D43]" />
              <span>{stats?.reactions || 0}</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-stone-300">
              <MessageSquare className="w-3 h-3" />
              <span>{stats?.comments || 0}</span>
            </div>
          </div>

          {/* Hover Action Indicator */}
          <div className="flex items-center gap-1 font-semibold text-xs text-white group-hover:text-[#DE6D43] transition-colors">
            <span>Read Story</span>
            <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </div>
      </div>
    </div>
  );
};
