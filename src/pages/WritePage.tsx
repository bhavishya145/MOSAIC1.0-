import React, { useState, useEffect, useRef } from 'react';
import { 
  PenTool, 
  Save, 
  Eye, 
  Sparkles, 
  Image as ImageIcon, 
  Bold, 
  Italic, 
  Heading1, 
  Heading2, 
  Quote, 
  List, 
  Code, 
  Check, 
  Clock, 
  ArrowLeft 
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { Category, TileSize } from '../types';
import { useAuth } from '../context/AuthContext';

interface WritePageProps {
  navigate: (path: string) => void;
  storyIdToEdit?: number | null;
}

export const WritePage: React.FC<WritePageProps> = ({ navigate, storyIdToEdit = null }) => {
  const { user, openAuthModal } = useAuth();

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState('https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80');
  const [categoryId, setCategoryId] = useState<number>(1);
  const [tileSize, setTileSize] = useState<TileSize>('medium');
  const [categories, setCategories] = useState<Category[]>([]);

  const [activeStoryId, setActiveStoryId] = useState<number | null>(storyIdToEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [lastSavedText, setLastSavedText] = useState<string>('Unsaved');
  const [previewMode, setPreviewMode] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Suggested preset covers
  const presetCovers = [
    { label: 'Minimalist Desk', url: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Campus Quad', url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Kyoto Temple', url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Code & Circuit', url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Cosmic Science', url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Muted Forest', url: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=1200&q=80' },
  ];

  // Fetch categories
  useEffect(() => {
    apiRequest<{ categories: Category[] }>('/categories')
      .then((res) => {
        if (res?.categories) {
          setCategories(res.categories);
          if (res.categories.length > 0) setCategoryId(res.categories[0].id);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch story to edit if specified
  useEffect(() => {
    if (storyIdToEdit) {
      apiRequest<{ story: any }>(`/stories/${storyIdToEdit}`)
        .then((res) => {
          if (res?.story) {
            setTitle(res.story.title);
            setSubtitle(res.story.subtitle || '');
            setContent(res.story.content || '');
            setCoverImage(res.story.cover_image);
            setCategoryId(res.story.category.id);
            setTileSize(res.story.tile_size);
            setActiveStoryId(res.story.id);
            setLastSavedTime(new Date());
          }
        })
        .catch(() => {});
    }
  }, [storyIdToEdit]);

  // Compute live word count, char count, reading time
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const charCount = content.length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  // Live "Last saved X seconds ago" counter
  useEffect(() => {
    if (!lastSavedTime) return;
    const interval = setInterval(() => {
      const secondsAgo = Math.floor((Date.now() - lastSavedTime.getTime()) / 1000);
      if (secondsAgo < 5) {
        setLastSavedText('Just now');
      } else if (secondsAgo < 60) {
        setLastSavedText(`Saved ${secondsAgo} seconds ago`);
      } else {
        const mins = Math.floor(secondsAgo / 60);
        setLastSavedText(`Saved ${mins} minute${mins > 1 ? 's' : ''} ago`);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [lastSavedTime]);

  // Real autosave draft every 20 seconds if title is not empty
  useEffect(() => {
    if (!user || !title.trim()) return;

    const autoSaveTimer = setInterval(async () => {
      try {
        if (activeStoryId) {
          await apiRequest(`/stories/${activeStoryId}`, {
            method: 'PUT',
            body: JSON.stringify({
              title,
              subtitle,
              content,
              cover_image: coverImage,
              category_id: categoryId,
              tile_size: tileSize,
              status: 'draft',
            }),
          });
          setLastSavedTime(new Date());
        } else {
          const res = await apiRequest<{ storyId: number }>('/stories', {
            method: 'POST',
            body: JSON.stringify({
              title,
              subtitle,
              content,
              cover_image: coverImage,
              category_id: categoryId,
              tile_size: tileSize,
              status: 'draft',
            }),
          });
          if (res?.storyId) {
            setActiveStoryId(res.storyId);
            setLastSavedTime(new Date());
          }
        }
      } catch {
        // Silent fail on auto-save
      }
    }, 20000);

    return () => clearInterval(autoSaveTimer);
  }, [user, title, subtitle, content, coverImage, categoryId, tileSize, activeStoryId]);

  // Manual save draft
  const handleSaveDraft = async () => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    if (!title.trim()) {
      setStatusMessage('Please enter a story title before saving.');
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      if (activeStoryId) {
        await apiRequest(`/stories/${activeStoryId}`, {
          method: 'PUT',
          body: JSON.stringify({
            title: title.trim(),
            subtitle: subtitle.trim(),
            content,
            cover_image: coverImage,
            category_id: categoryId,
            tile_size: tileSize,
            status: 'draft',
          }),
        });
      } else {
        const res = await apiRequest<{ storyId: number }>('/stories', {
          method: 'POST',
          body: JSON.stringify({
            title: title.trim(),
            subtitle: subtitle.trim(),
            content,
            cover_image: coverImage,
            category_id: categoryId,
            tile_size: tileSize,
            status: 'draft',
          }),
        });
        if (res?.storyId) setActiveStoryId(res.storyId);
      }
      setLastSavedTime(new Date());
      setStatusMessage('Draft saved successfully.');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setStatusMessage(err.message || 'Failed to save draft.');
    } finally {
      setIsSaving(false);
    }
  };

  // Publish story
  const handlePublish = async () => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    if (!title.trim()) {
      setStatusMessage('Please enter a story title.');
      return;
    }
    if (!content.trim()) {
      setStatusMessage('Please write some content before publishing.');
      return;
    }

    setIsPublishing(true);
    setStatusMessage(null);

    try {
      let finalSlug = '';
      if (activeStoryId) {
        await apiRequest(`/stories/${activeStoryId}`, {
          method: 'PUT',
          body: JSON.stringify({
            title: title.trim(),
            subtitle: subtitle.trim(),
            content,
            cover_image: coverImage,
            category_id: categoryId,
            tile_size: tileSize,
            status: 'published',
          }),
        });
        navigate(`/explore`);
      } else {
        const res = await apiRequest<{ storyId: number; slug: string }>('/stories', {
          method: 'POST',
          body: JSON.stringify({
            title: title.trim(),
            subtitle: subtitle.trim(),
            content,
            cover_image: coverImage,
            category_id: categoryId,
            tile_size: tileSize,
            status: 'published',
          }),
        });
        navigate(res?.slug ? `/story/${res.slug}` : '/explore');
      }
    } catch (err: any) {
      setStatusMessage(err.message || 'Failed to publish story.');
      setIsPublishing(false);
    }
  };

  // Insert markdown helper into textarea
  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const previous = textarea.value;
    const selected = previous.substring(start, end);

    const replacement = `${prefix}${selected || 'text'}${suffix}`;
    const newContent = previous.substring(0, start) + replacement + previous.substring(end);

    setContent(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected.length || 4));
    }, 20);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-black/10 dark:border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/explore')}
            className="p-2 text-[#857F77] hover:text-[#1C1917] dark:hover:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-serif text-2xl font-bold text-[#1C1917] dark:text-[#F5F3EF]">
              {storyIdToEdit ? 'Edit Story' : 'New Story Workspace'}
            </h1>
            <div className="flex items-center gap-2 text-xs text-[#857F77]">
              <span>{lastSavedText}</span>
              {statusMessage && (
                <span className="text-[#C85A32] dark:text-[#DE6D43] font-medium">• {statusMessage}</span>
              )}
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className="px-4 py-2 rounded-full border border-black/15 dark:border-white/20 text-xs font-semibold text-[#1C1917] dark:text-[#F5F3EF] hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{previewMode ? 'Edit Mode' : 'Preview'}</span>
          </button>

          <button
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="px-4 py-2 rounded-full border border-black/15 dark:border-white/20 text-xs font-semibold text-[#1C1917] dark:text-[#F5F3EF] hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
          </button>

          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="px-5 py-2 rounded-full bg-[#22382D] hover:bg-[#192B22] text-white dark:bg-[#DE6D43] dark:hover:bg-[#E77E57] dark:text-[#0F1012] text-xs font-semibold uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isPublishing ? 'Publishing...' : 'Publish Story'}</span>
          </button>
        </div>
      </div>

      {previewMode ? (
        /* PREVIEW MODE */
        <div className="max-w-3xl mx-auto py-6">
          <div className="mb-6">
            <span className="text-xs uppercase font-bold tracking-widest px-3 py-1 rounded-full bg-[#22382D] text-white">
              {categories.find((c) => c.id === categoryId)?.name || 'Category'}
            </span>
            <span className="text-xs text-[#857F77] ml-3">• {readingTime} min read preview</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-[#1C1917] dark:text-[#F5F3EF] mb-4 leading-tight">
            {title || 'Untitled Story'}
          </h1>

          {subtitle && (
            <p className="text-xl text-[#57534E] dark:text-[#A8A39C] font-editorial italic mb-8">
              {subtitle}
            </p>
          )}

          {coverImage && (
            <div className="rounded-3xl overflow-hidden mb-10 shadow-lg">
              <img src={coverImage} alt={title} className="w-full h-80 object-cover" />
            </div>
          )}

          <div className="reading-prose whitespace-pre-wrap leading-relaxed">
            {content || 'Start writing your story in the editor...'}
          </div>
        </div>
      ) : (
        /* EDITING WORKSPACE */
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Main Writing Column */}
          <div className="lg:col-span-8 space-y-6">
            {/* Title */}
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title: Write something worth remembering..."
                className="w-full font-serif text-3xl sm:text-4xl lg:text-5xl font-bold bg-transparent text-[#1C1917] dark:text-[#F5F3EF] placeholder-[#857F77]/50 focus:outline-hidden leading-tight"
              />
            </div>

            {/* Subtitle */}
            <div>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Subtitle: Add an editorial hook or meditation..."
                className="w-full font-editorial text-lg sm:text-xl italic bg-transparent text-[#57534E] dark:text-[#A8A39C] placeholder-[#857F77]/50 focus:outline-hidden leading-relaxed"
              />
            </div>

            {/* Editor Formatting Toolbar */}
            <div className="sticky top-20 z-20 p-2 rounded-2xl border border-black/10 dark:border-white/10 bg-[#FBF9F5]/90 dark:bg-[#18191D]/90 backdrop-blur-md flex items-center flex-wrap gap-1 shadow-xs">
              <button
                type="button"
                onClick={() => insertFormatting('**', '**')}
                title="Bold (Cmd+B)"
                className="p-2 rounded-xl text-[#57534E] dark:text-[#A8A39C] hover:text-[#1C1917] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                <Bold className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => insertFormatting('*', '*')}
                title="Italic (Cmd+I)"
                className="p-2 rounded-xl text-[#57534E] dark:text-[#A8A39C] hover:text-[#1C1917] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                <Italic className="w-4 h-4" />
              </button>

              <div className="w-px h-5 bg-black/10 dark:border-white/10 mx-1" />

              <button
                type="button"
                onClick={() => insertFormatting('# ')}
                title="Large Heading"
                className="p-2 rounded-xl text-[#57534E] dark:text-[#A8A39C] hover:text-[#1C1917] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                <Heading1 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => insertFormatting('## ')}
                title="Subheading"
                className="p-2 rounded-xl text-[#57534E] dark:text-[#A8A39C] hover:text-[#1C1917] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                <Heading2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => insertFormatting('> ')}
                title="Quote"
                className="p-2 rounded-xl text-[#57534E] dark:text-[#A8A39C] hover:text-[#1C1917] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                <Quote className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => insertFormatting('- ')}
                title="List Item"
                className="p-2 rounded-xl text-[#57534E] dark:text-[#A8A39C] hover:text-[#1C1917] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                <List className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => insertFormatting('`', '`')}
                title="Code block"
                className="p-2 rounded-xl text-[#57534E] dark:text-[#A8A39C] hover:text-[#1C1917] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                <Code className="w-4 h-4" />
              </button>

              {/* Counters */}
              <div className="ml-auto flex items-center gap-3 text-[11px] text-[#857F77] pr-2">
                <span>{wordCount} words</span>
                <span>•</span>
                <span>{readingTime} min read</span>
              </div>
            </div>

            {/* Content Textarea */}
            <div>
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Let your thoughts unfold. Write in paragraphs, reflect on discoveries, detail experiences..."
                rows={18}
                className="w-full font-serif text-lg leading-relaxed bg-transparent text-[#1C1917] dark:text-[#F5F3EF] placeholder-[#857F77]/40 focus:outline-hidden resize-y"
              />
            </div>
          </div>

          {/* Right Sidebar: Editorial Publishing Settings */}
          <div className="lg:col-span-4 space-y-6">
            {/* Category Selector */}
            <div className="p-5 rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#18191D]/70 shadow-xs">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#857F77] dark:text-[#A8A39C] mb-3">
                Editorial Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(parseInt(e.target.value, 10))}
                className="w-full p-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] text-[#1C1917] dark:text-[#F5F3EF] text-sm focus:outline-hidden"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tile Size Selector for the Signature Mosaic Wall */}
            <div className="p-5 rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#18191D]/70 shadow-xs">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#857F77] dark:text-[#A8A39C] mb-2">
                Mosaic Tile Size
              </label>
              <p className="text-[11px] text-[#857F77] mb-3">
                Controls the visual footprint of this story tile on the living mosaic wall:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(['small', 'medium', 'large', 'featured'] as TileSize[]).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setTileSize(sz)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold capitalize transition-all cursor-pointer ${
                      tileSize === sz
                        ? 'border-[#22382D] bg-[#22382D]/10 text-[#22382D] dark:border-[#DE6D43] dark:bg-[#DE6D43]/15 dark:text-[#DE6D43]'
                        : 'border-black/10 dark:border-white/10 text-[#57534E] dark:text-[#A8A39C] hover:border-black/20'
                    }`}
                  >
                    <span>{sz}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Cover Image Settings */}
            <div className="p-5 rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#18191D]/70 shadow-xs">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#857F77] dark:text-[#A8A39C] mb-2 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Cover Image</span>
              </label>

              {coverImage && (
                <div className="rounded-xl overflow-hidden mb-3 h-32 border border-black/10">
                  <img src={coverImage} alt="Cover Preview" className="w-full h-full object-cover" />
                </div>
              )}

              <input
                type="url"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] text-[#1C1917] dark:text-[#F5F3EF] mb-3"
              />

              <div className="text-[11px] font-semibold text-[#857F77] mb-2">Or select a curated cover:</div>
              <div className="grid grid-cols-3 gap-1.5">
                {presetCovers.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCoverImage(preset.url)}
                    className="h-12 rounded-lg overflow-hidden border border-black/10 hover:opacity-80 transition-opacity cursor-pointer relative"
                  >
                    <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                    {coverImage === preset.url && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
