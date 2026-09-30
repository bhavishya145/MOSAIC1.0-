import React, { useState, useEffect, useCallback } from 'react';
import { Compass, Sparkles, Flame, Clock, Heart, BookOpen } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { Story, Category } from '../types';
import { MosaicWall } from '../components/MosaicWall';

interface ExplorePageProps {
  navigate: (path: string) => void;
  initialCategory?: string;
}

export const ExplorePage: React.FC<ExplorePageProps> = ({ navigate, initialCategory = 'All' }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedSection, setSelectedSection] = useState<string>("TODAY'S PICKS");
  const [viewMode, setViewMode] = useState<'mosaic' | 'list'>('mosaic');

  const [stories, setStories] = useState<Story[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const sections = [
    { id: "TODAY'S PICKS", label: "Today's Picks", sort: 'trending', icon: Sparkles },
    { id: "NEW ARRIVALS", label: 'New Arrivals', sort: 'latest', icon: Clock },
    { id: "MOST DISCUSSED", label: 'Most Discussed', sort: 'discussed', icon: Flame },
    { id: "HIDDEN GEMS", label: 'Hidden Gems', sort: 'oldest', icon: Heart },
    { id: "QUICK READS", label: 'Quick Reads', sort: 'latest', icon: BookOpen },
  ];

  const defaultCategoryNames = [
    'All',
    'Technology',
    'College',
    'Design',
    'Travel',
    'Life',
    'Science',
    'Business',
    'Programming',
    'Culture',
    'Personal',
  ];

  // Fetch categories once
  useEffect(() => {
    apiRequest<{ categories: Category[] }>('/categories')
      .then((res) => {
        if (res?.categories) {
          setCategories(res.categories);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch stories with normalized category parameter
  const fetchStories = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const activeSectionObj = sections.find((s) => s.id === selectedSection);
      const sortParam = activeSectionObj?.sort || 'latest';

      const params: Record<string, string | number> = {
        limit: 30,
        sort: sortParam,
      };

      // Only pass category if not 'All'
      if (selectedCategory && selectedCategory.toLowerCase() !== 'all') {
        params.category = selectedCategory.trim();
      }

      const res = await apiRequest<{ stories: Story[] }>('/stories', { params });
      
      let fetchedStories = res.stories || [];

      // If "Quick Reads" is selected, filter by short reading time (<= 5 mins)
      if (selectedSection === 'QUICK READS') {
        fetchedStories = fetchedStories.filter((s) => s.reading_time_minutes <= 5);
      }

      setStories(fetchedStories);
    } catch (err: any) {
      console.error('Explore page fetch error:', err);
      setError(err.message || 'Unable to load stories from the MOSAIC database.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, selectedSection]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header Section */}
      <div className="max-w-3xl mb-8 sm:mb-12">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#22382D] dark:text-[#DE6D43] mb-2">
          <Compass className="w-4 h-4" />
          <span>Editorial Discovery</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-[#1C1917] dark:text-[#F5F3EF] leading-tight">
          DISCOVER SOMETHING NEW
        </h1>
        <p className="text-sm sm:text-base text-[#57534E] dark:text-[#A8A39C] mt-2 font-editorial italic leading-relaxed">
          "Explore thought-provoking writing across design, philosophy, technology, and quiet personal archives."
        </p>
      </div>

      {/* Editorial Curated Section Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none mb-6 border-b border-black/10 dark:border-white/10">
        {sections.map((sec) => {
          const Icon = sec.icon;
          const isSelected = selectedSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => setSelectedSection(sec.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#22382D] text-white dark:bg-[#DE6D43] dark:text-[#0F1012] shadow-xs'
                  : 'text-[#857F77] hover:text-[#1C1917] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* Category Pills Bar */}
      <div className="mb-8">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {defaultCategoryNames.map((catName) => {
            const isSelected = selectedCategory.toLowerCase() === catName.toLowerCase();
            return (
              <button
                key={catName}
                onClick={() => setSelectedCategory(catName)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer border ${
                  isSelected
                    ? 'border-[#22382D] bg-[#22382D]/10 text-[#22382D] dark:border-[#DE6D43] dark:bg-[#DE6D43]/15 dark:text-[#DE6D43] font-semibold'
                    : 'border-black/10 dark:border-white/10 text-[#57534E] dark:text-[#A8A39C] hover:border-black/25 dark:hover:border-white/25 hover:text-[#1C1917] dark:hover:text-white'
                }`}
              >
                {catName}
              </button>
            );
          })}
        </div>
      </div>

      {/* Signature Mosaic Wall Component (Handles Mosaic & List views, 4 states) */}
      <MosaicWall
        stories={stories}
        isLoading={isLoading}
        error={error}
        onRetry={fetchStories}
        onSelectStory={(slugOrId) => navigate(`/story/${slugOrId}`)}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
        title={selectedCategory === 'All' ? `${selectedSection} Archive` : `${selectedCategory} Stories`}
        subtitle={`Showing verified published stories from the relational archive.`}
      />
    </div>
  );
};
