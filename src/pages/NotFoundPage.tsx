import React from 'react';
import { Compass, ArrowLeft, BookX } from 'lucide-react';

interface NotFoundPageProps {
  navigate: (path: string) => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ navigate }) => {
  return (
    <div className="max-w-2xl mx-auto px-4 py-24 sm:py-32 text-center">
      <div className="w-16 h-16 rounded-3xl bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto mb-6 text-[#857F77]">
        <BookX className="w-8 h-8 stroke-1" />
      </div>

      <span className="text-xs uppercase font-bold tracking-widest text-[#C85A32] dark:text-[#DE6D43]">
        404 — Page Not Found
      </span>

      <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-[#1C1917] dark:text-[#F5F3EF] mt-3 mb-4">
        THIS STORY DOESN'T EXIST
      </h1>

      <p className="text-sm sm:text-base text-[#57534E] dark:text-[#A8A39C] max-w-md mx-auto font-editorial italic mb-8">
        "The passage you are seeking has either dissolved into memory or has not yet been inked."
      </p>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 rounded-full bg-[#22382D] hover:bg-[#192B22] text-white dark:bg-[#DE6D43] dark:hover:bg-[#E77E57] dark:text-[#0F1012] text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to MOSAIC</span>
        </button>

        <button
          onClick={() => navigate('/explore')}
          className="px-6 py-3 rounded-full border border-black/15 dark:border-white/20 text-[#1C1917] dark:text-[#F5F3EF] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
        >
          <Compass className="w-4 h-4" />
          <span>Explore Stories</span>
        </button>
      </div>
    </div>
  );
};
