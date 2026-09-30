import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { SearchModal } from './components/SearchModal';
import { HomePage } from './pages/HomePage';
import { ExplorePage } from './pages/ExplorePage';
import { StoryDetailPage } from './pages/StoryDetailPage';
import { WritePage } from './pages/WritePage';
import { ProfilePage } from './pages/ProfilePage';
import { CollectionsPage } from './pages/CollectionsPage';
import { SavedPage } from './pages/SavedPage';
import { DashboardPage } from './pages/DashboardPage';
import { AdminPage } from './pages/AdminPage';
import { NotFoundPage } from './pages/NotFoundPage';

function AppContent() {
  const { user, openAuthModal } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Sync with browser navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Route matching
  const renderRoute = () => {
    // 1. Home
    if (currentPath === '/') {
      return <HomePage navigate={navigate} />;
    }

    // 2. Explore / Discover
    if (currentPath === '/explore') {
      return <ExplorePage navigate={navigate} />;
    }

    // 3. Write Story
    if (currentPath.startsWith('/write')) {
      const urlParams = new URLSearchParams(window.location.search);
      const editId = urlParams.get('edit') ? parseInt(urlParams.get('edit')!, 10) : null;
      return <WritePage navigate={navigate} storyIdToEdit={editId} />;
    }

    // 4. Story Detail (/story/:slugOrId)
    if (currentPath.startsWith('/story/')) {
      const slugOrId = currentPath.replace('/story/', '').split('?')[0];
      return <StoryDetailPage slugOrId={slugOrId} navigate={navigate} />;
    }

    // 5. User Profile (/profile/:username)
    if (currentPath.startsWith('/profile/')) {
      const username = currentPath.replace('/profile/', '').split('?')[0];
      return <ProfilePage username={username} navigate={navigate} />;
    }

    // 6. My Mosaic shortcut
    if (currentPath === '/my-mosaic') {
      if (user) {
        return <ProfilePage username={user.username} navigate={navigate} />;
      }
      return <ExplorePage navigate={navigate} />;
    }

    // 7. Collections
    if (currentPath === '/collections') {
      return <CollectionsPage navigate={navigate} />;
    }

    // 8. Saved stories shelf
    if (currentPath === '/saved') {
      return <SavedPage navigate={navigate} />;
    }

    // 9. Creator Dashboard
    if (currentPath === '/dashboard') {
      return <DashboardPage navigate={navigate} />;
    }

    // 10. Admin
    if (currentPath === '/admin') {
      return <AdminPage navigate={navigate} />;
    }

    // 11. Auth routes shortcuts
    if (currentPath === '/login') {
      setTimeout(() => openAuthModal('login'), 10);
      return <HomePage navigate={navigate} />;
    }

    if (currentPath === '/register') {
      setTimeout(() => openAuthModal('register'), 10);
      return <HomePage navigate={navigate} />;
    }

    // 12. 404 Fallback
    return <NotFoundPage navigate={navigate} />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF9F5] text-[#1E1E1E] dark:bg-[#0F1012] dark:text-[#E8E6E1] transition-colors duration-300">
      {/* Top Navigation */}
      <Navbar
        currentPath={currentPath}
        navigate={navigate}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      {/* Main Page Body */}
      <main className="flex-1 pb-16 md:pb-0">
        {renderRoute()}
      </main>

      {/* Editorial Footer */}
      <footer className="border-t border-black/10 dark:border-white/10 bg-[#F3EFE6]/60 dark:bg-[#121316]/80 pt-12 pb-16 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-black/10 dark:border-white/10">
            {/* Brand column */}
            <div className="md:col-span-5 space-y-4">
              <span className="font-brand font-bold text-2xl tracking-[0.2em] text-[#1C1917] dark:text-[#F5F3EF]">
                MOSAIC
              </span>
              <p className="font-editorial text-sm italic text-[#57534E] dark:text-[#A8A39C] max-w-sm">
                "Different thoughts. One beautiful picture."
              </p>
              <p className="text-xs text-[#857F77] dark:text-[#6E6961] max-w-md leading-relaxed">
                A digital magazine and personal story archive designed to resist algorithmic conformity. Published stories are curated into an asymmetric editorial wall where every voice occupies its rightful space.
              </p>
            </div>

            {/* Navigation links */}
            <div className="md:col-span-3 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-[#857F77] dark:text-[#A8A39C] mb-3">
                Editorial Sections
              </h4>
              <ul className="space-y-2 text-xs">
                {['Technology', 'College', 'Design', 'Science', 'Programming', 'Travel', 'Philosophy'].map((cat) => (
                  <li key={cat}>
                    <button
                      onClick={() => navigate('/explore')}
                      className="text-[#57534E] dark:text-[#A8A39C] hover:text-[#1C1917] dark:hover:text-white transition-colors cursor-pointer"
                    >
                      {cat}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Platform links */}
            <div className="md:col-span-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-[#857F77] dark:text-[#A8A39C] mb-3">
                Archive & Craft
              </h4>
              <ul className="space-y-2 text-xs text-[#57534E] dark:text-[#A8A39C]">
                <li>
                  <button onClick={() => navigate('/collections')} className="hover:text-[#1C1917] dark:hover:text-white cursor-pointer">
                    Curated Collections
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/write')} className="hover:text-[#1C1917] dark:hover:text-white cursor-pointer">
                    Storyteller Workspace
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/saved')} className="hover:text-[#1C1917] dark:hover:text-white cursor-pointer">
                    Personal Reading Shelf
                  </button>
                </li>
                {user?.role === 'admin' && (
                  <li>
                    <button onClick={() => navigate('/admin')} className="text-[#C85A32] dark:text-[#DE6D43] font-semibold cursor-pointer">
                      Admin Moderation Console
                    </button>
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#857F77] dark:text-[#6E6961]">
            <p>© {new Date().getFullYear()} MOSAIC Editorial Magazine. All stories preserved with care.</p>
            <p className="font-editorial italic">Crafted with typographic discipline & sovereign data persistence.</p>
          </div>
        </div>
      </footer>

      {/* Global Modals */}
      <AuthModal />
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectStory={(slugOrId) => navigate(`/story/${slugOrId}`)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
