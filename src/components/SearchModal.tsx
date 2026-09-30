import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Clock, ArrowRight, BookOpen, User, Tag } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { Story } from '../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStory: (slugOrId: string | number) => void;
  onSelectCategory?: (category: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectStory,
  onSelectCategory,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('mosaic_recent_searches');
      return stored ? JSON.parse(stored) : ['Python', 'Architecture', 'Cognitive', 'Kyoto'];
    } catch {
      return ['Python', 'Architecture', 'Cognitive', 'Kyoto'];
    }
  });

  const popularSearches = [
    'Subtle interfaces',
    'College labs',
    'Minimalism',
    'Quantum coherence',
    'Solitude',
    'Folk code',
  ];

  // Focus input when opened & add escape key listener
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    const timer = setTimeout(async () => {
      try {
        const res = await apiRequest<{ stories: Story[] }>(`/stories?search=${encodeURIComponent(query.trim())}`);
        setResults(res.stories || []);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectRecent = (term: string) => {
    setQuery(term);
  };

  const handleStoryClick = (story: Story) => {
    // Add to recent searches
    const trimmed = query.trim();
    if (trimmed) {
      const updated = [trimmed, ...recentSearches.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 8);
      setRecentSearches(updated);
      try {
        localStorage.setItem('mosaic_recent_searches', JSON.stringify(updated));
      } catch {}
    }
    onSelectStory(story.slug || story.id);
    onClose();
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem('mosaic_recent_searches');
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#FBF9F5]/95 dark:bg-[#0F1012]/95 backdrop-blur-xl animate-in fade-in duration-150">
      {/* Search Header */}
      <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-4">
        <div className="flex items-center justify-between pb-4 border-b border-black/10 dark:border-white/10">
          <div className="flex items-center gap-3 flex-1">
            <Search className="w-6 h-6 text-[#857F77] shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by story, idea, author, or philosophy..."
              className="w-full text-xl sm:text-2xl font-serif bg-transparent text-[#1C1917] dark:text-[#F5F3EF] placeholder-[#857F77]/60 focus:outline-hidden"
            />
          </div>
          <button
            onClick={onClose}
            className="p-2 ml-4 text-[#857F77] hover:text-[#1C1917] dark:hover:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Search Content */}
      <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 flex-1 overflow-y-auto pb-12">
        {/* Loading state */}
        {isLoading && (
          <div className="py-12 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-2xl border border-black/5 dark:border-white/5 animate-pulse flex gap-4">
                <div className="w-20 h-20 rounded-xl bg-black/10 dark:bg-white/10 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-black/10 dark:bg-white/10 rounded-sm w-1/4" />
                  <div className="h-5 bg-black/10 dark:bg-white/10 rounded-sm w-3/4" />
                  <div className="h-3 bg-black/10 dark:bg-white/10 rounded-sm w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {!isLoading && hasSearched && results.length > 0 && (
          <div className="py-6 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[#857F77] dark:text-[#A8A39C] mb-4">
              Found {results.length} stories
            </div>
            {results.map((story) => (
              <button
                key={story.id}
                onClick={() => handleStoryClick(story)}
                className="w-full text-left p-4 rounded-2xl border border-black/5 dark:border-white/5 bg-white/60 dark:bg-[#18191D]/60 hover:bg-white dark:hover:bg-[#18191D] hover:border-black/15 dark:hover:border-white/20 transition-all flex items-start gap-4 cursor-pointer group"
              >
                <img
                  src={story.cover_image}
                  alt={story.title}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                      style={{
                        backgroundColor: `${story.category.color || '#22382D'}15`,
                        color: story.category.color || '#22382D',
                      }}
                    >
                      {story.category.name}
                    </span>
                    <span className="text-[11px] text-[#857F77]">• {story.reading_time_minutes} min read</span>
                  </div>
                  <h3 className="font-serif font-bold text-base sm:text-lg text-[#1C1917] dark:text-[#F5F3EF] group-hover:text-[#22382D] dark:group-hover:text-[#DE6D43] transition-colors leading-snug line-clamp-1">
                    {story.title}
                  </h3>
                  <p className="text-xs text-[#57534E] dark:text-[#A8A39C] line-clamp-2 mt-1">
                    {story.subtitle || story.excerpt}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-[11px] text-[#857F77]">
                    <User className="w-3 h-3" />
                    <span>{story.author.name}</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#857F77] group-hover:text-[#1C1917] dark:group-hover:text-white group-hover:translate-x-1 transition-all shrink-0 mt-2" />
              </button>
            ))}
          </div>
        )}

        {/* No results */}
        {!isLoading && hasSearched && results.length === 0 && (
          <div className="py-16 text-center">
            <BookOpen className="w-12 h-12 mx-auto text-[#857F77] stroke-1 mb-3" />
            <h3 className="font-serif text-xl font-bold text-[#1C1917] dark:text-[#F5F3EF]">
              No stories matched your search
            </h3>
            <p className="text-xs text-[#857F77] dark:text-[#A8A39C] mt-1 max-w-sm mx-auto">
              We couldn't find any stories matching "{query}". Try checking your spelling or searching for a different theme.
            </p>
            <button
              onClick={() => setQuery('')}
              className="mt-5 px-4 py-2 rounded-full border border-black/15 dark:border-white/20 text-xs font-semibold text-[#1C1917] dark:text-[#F5F3EF] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              CLEAR SEARCH
            </button>
          </div>
        )}

        {/* Default recent & popular suggestions */}
        {!query.trim() && (
          <div className="py-8 grid sm:grid-cols-2 gap-8">
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div>
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-black/5 dark:border-white/5">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#857F77] dark:text-[#A8A39C] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Recently Searched
                  </span>
                  <button
                    onClick={clearRecentSearches}
                    className="text-[11px] text-[#857F77] hover:text-[#1C1917] dark:hover:text-white cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((term, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectRecent(term)}
                      className="px-3 py-1.5 rounded-full text-xs border border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#18191D]/70 text-[#1C1917] dark:text-[#F5F3EF] hover:border-[#22382D] dark:hover:border-[#DE6D43] transition-colors cursor-pointer"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Searches */}
            <div>
              <div className="pb-2 mb-3 border-b border-black/5 dark:border-white/5">
                <span className="text-xs font-bold uppercase tracking-wider text-[#857F77] dark:text-[#A8A39C] flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  Popular Themes
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {popularSearches.map((term, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectRecent(term)}
                    className="px-3 py-1.5 rounded-full text-xs border border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#18191D]/70 text-[#1C1917] dark:text-[#F5F3EF] hover:border-[#22382D] dark:hover:border-[#DE6D43] transition-colors cursor-pointer"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
