import React, { useState, useEffect } from 'react';
import { Layers, Plus, BookOpen, Trash2, ArrowRight } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { Collection, Story } from '../types';
import { useAuth } from '../context/AuthContext';

interface CollectionsPageProps {
  navigate: (path: string) => void;
}

export const CollectionsPage: React.FC<CollectionsPageProps> = ({ navigate }) => {
  const { user, openAuthModal } = useAuth();

  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [collectionStories, setCollectionStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New collection modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newColor, setNewColor] = useState('#22382D');

  const palette = ['#22382D', '#8C4329', '#6A4C93', '#1F6F8B', '#5B7065', '#B3541E'];

  const fetchCollections = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest<{ collections: Collection[] }>('/collections');
      setCollections(res.collections || []);
      if (res.collections?.length > 0 && !selectedCollection) {
        loadCollectionDetail(res.collections[0].id);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const loadCollectionDetail = async (id: number) => {
    try {
      const res = await apiRequest<{ collection: Collection; stories: Story[] }>(`/collections/${id}`);
      if (res) {
        setSelectedCollection(res.collection);
        setCollectionStories(res.stories || []);
      }
    } catch {}
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('login');
      return;
    }
    if (!newName.trim()) return;

    try {
      const res = await apiRequest<{ collectionId: number }>('/collections', {
        method: 'POST',
        body: JSON.stringify({
          name: newName.trim(),
          description: newDesc.trim(),
          cover_color: newColor,
        }),
      });
      setIsCreateModalOpen(false);
      setNewName('');
      setNewDesc('');
      await fetchCollections();
      if (res?.collectionId) loadCollectionDetail(res.collectionId);
    } catch (err: any) {
      alert(err.message || 'Failed to create collection.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 mb-8 border-b border-black/10 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#22382D] dark:text-[#DE6D43] mb-1">
            <Layers className="w-4 h-4" />
            <span>Curated Anthologies</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#1C1917] dark:text-[#F5F3EF]">
            Collections
          </h1>
          <p className="text-xs sm:text-sm text-[#857F77] dark:text-[#A8A39C] mt-1">
            Custom reader-curated libraries and thematic archives.
          </p>
        </div>

        <button
          onClick={() => {
            if (!user) openAuthModal('login');
            else setIsCreateModalOpen(true);
          }}
          className="px-5 py-2.5 rounded-full bg-[#22382D] hover:bg-[#192B22] text-white dark:bg-[#DE6D43] dark:hover:bg-[#E77E57] dark:text-[#0F1012] text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Collection</span>
        </button>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left Column: Collections List */}
        <div className="lg:col-span-4 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#857F77] block mb-2">
            Available Anthologies ({collections.length})
          </span>
          {collections.map((col) => {
            const isSelected = selectedCollection?.id === col.id;
            return (
              <div
                key={col.id}
                onClick={() => loadCollectionDetail(col.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[#22382D] dark:border-[#DE6D43] bg-white dark:bg-[#18191D] shadow-md ring-2 ring-[#22382D]/10 dark:ring-[#DE6D43]/15'
                    : 'border-black/10 dark:border-white/10 bg-white/60 dark:bg-[#18191D]/60 hover:bg-white dark:hover:bg-[#18191D]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-10 rounded-sm shrink-0"
                    style={{ backgroundColor: col.cover_color || '#22382D' }}
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-serif font-bold text-base text-[#1C1917] dark:text-[#F5F3EF] truncate">
                      {col.name}
                    </h3>
                    <p className="text-xs text-[#857F77] line-clamp-1">{col.description || 'Curated archive'}</p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-[#857F77]">
                      <span>by {col.user_name || 'Archivist'}</span>
                      <span>•</span>
                      <span>{col.stories_count || 0} stories</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Collection Stories */}
        <div className="lg:col-span-8">
          {selectedCollection ? (
            <div className="p-6 sm:p-8 rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#18191D]/70 shadow-xs">
              <div className="flex items-start justify-between pb-6 mb-6 border-b border-black/10 dark:border-white/10">
                <div>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full text-white inline-block mb-2"
                    style={{ backgroundColor: selectedCollection.cover_color || '#22382D' }}
                  >
                    Collection Archive
                  </span>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1917] dark:text-[#F5F3EF]">
                    {selectedCollection.name}
                  </h2>
                  <p className="text-xs sm:text-sm text-[#57534E] dark:text-[#A8A39C] mt-1 font-editorial">
                    {selectedCollection.description}
                  </p>
                </div>
              </div>

              {/* Stories in this collection */}
              {collectionStories.length === 0 ? (
                <div className="text-center py-16 text-xs text-[#857F77]">
                  No stories added to this collection yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {collectionStories.map((story) => (
                    <div
                      key={story.id}
                      onClick={() => navigate(`/story/${story.slug || story.id}`)}
                      className="p-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] hover:border-black/20 dark:hover:border-white/20 transition-all flex items-center gap-4 cursor-pointer group"
                    >
                      <img
                        src={story.cover_image}
                        alt={story.title}
                        className="w-18 h-18 rounded-xl object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold uppercase text-[#857F77]">
                          {story.category.name}
                        </span>
                        <h4 className="font-serif font-bold text-base text-[#1C1917] dark:text-[#F5F3EF] group-hover:text-[#22382D] dark:group-hover:text-[#DE6D43] transition-colors truncate">
                          {story.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-xs text-[#857F77]">
                          <span>by {story.author.name}</span>
                          <span>•</span>
                          <span>{story.reading_time_minutes} min</span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#857F77] group-hover:translate-x-1 transition-transform" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 text-xs text-[#857F77]">
              Select a collection from the list to view its stories.
            </div>
          )}
        </div>
      </div>

      {/* Create Collection Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#FBF9F5] dark:bg-[#18191D] rounded-3xl border border-black/10 dark:border-white/10 p-6 shadow-2xl">
            <h3 className="font-serif text-xl font-bold text-[#1C1917] dark:text-[#F5F3EF] mb-4">
              Create New Collection
            </h3>
            <form onSubmit={handleCreateCollection} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#857F77] mb-1">Collection Title</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Late Night Reads"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] text-[#1C1917] dark:text-[#F5F3EF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#857F77] mb-1">Theme Description</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Describe the focus or feeling of this reading list..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] text-[#1C1917] dark:text-[#F5F3EF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#857F77] mb-2">Cover Accent</label>
                <div className="flex gap-2">
                  {palette.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className="w-8 h-8 rounded-full border-2 transition-transform cursor-pointer"
                      style={{
                        backgroundColor: c,
                        borderColor: newColor === c ? '#FFFFFF' : 'transparent',
                        transform: newColor === c ? 'scale(1.15)' : 'scale(1)',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs text-[#857F77]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#22382D] text-white dark:bg-[#DE6D43] dark:text-[#0F1012] text-xs font-semibold"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
