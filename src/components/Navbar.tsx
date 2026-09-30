import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  Bookmark, 
  PenTool, 
  User as UserIcon, 
  Search, 
  Bell, 
  Sun, 
  Moon, 
  LogOut, 
  Sparkles,
  BarChart3,
  Shield,
  Layers,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { apiRequest } from '../lib/api';
import { NotificationItem } from '../types';

interface NavbarProps {
  currentPath: string;
  navigate: (path: string) => void;
  onOpenSearch: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPath, navigate, onOpenSearch }) => {
  const { user, logout, openAuthModal } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotifMenuOpen, setIsNotifMenuOpen] = useState(false);
  const [isDemoMenuOpen, setIsDemoMenuOpen] = useState(false);
  const [demoUsers, setDemoUsers] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Fetch demo users for fast evaluation accounts switcher
  useEffect(() => {
    apiRequest<{ demoUsers: any[] }>('/auth/demo-users')
      .then((res) => {
        if (res && res.demoUsers) setDemoUsers(res.demoUsers);
      })
      .catch(() => {});
  }, []);

  // Fetch notifications if logged in
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    apiRequest<{ notifications: NotificationItem[]; unreadCount: number }>('/notifications')
      .then((res) => {
        if (res) {
          setNotifications(res.notifications || []);
          setUnreadCount(res.unreadCount || 0);
        }
      })
      .catch(() => {});
  }, [user, currentPath]);

  const handleMarkAllRead = async () => {
    try {
      await apiRequest('/notifications/read-all', { method: 'PUT' });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    } catch {
      // ignore
    }
  };

  const { login } = useAuth();
  const handleQuickLogin = async (username: string) => {
    await login(username, 'password123');
    setIsDemoMenuOpen(false);
  };

  const navLinks = [
    { label: 'Explore', path: '/explore', icon: Compass },
    { label: 'Collections', path: '/collections', icon: Layers },
    { label: 'Write', path: '/write', icon: PenTool },
    { label: 'My Mosaic', path: user ? `/profile/${user.username}` : '/my-mosaic', icon: UserIcon },
  ];

  return (
    <>
      {/* Desktop Header */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#FBF9F5]/90 dark:bg-[#0F1012]/90 border-b border-black/[0.06] dark:border-white/[0.08] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate('/')}
              className="text-left group flex items-baseline gap-3 cursor-pointer"
            >
              <span className="font-brand font-bold text-2xl tracking-[0.2em] text-[#1C1917] dark:text-[#F5F3EF] group-hover:text-[#22382D] dark:group-hover:text-[#DE6D43] transition-colors">
                MOSAIC
              </span>
              <span className="hidden lg:inline-block text-xs uppercase tracking-widest text-[#857F77] dark:text-[#A8A39C] border-l border-black/10 dark:border-white/10 pl-3">
                Different thoughts. One picture.
              </span>
            </button>
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = currentPath === link.path || (link.path.startsWith('/profile') && currentPath.startsWith('/profile'));
              return (
                <button
                  key={link.label}
                  onClick={() => {
                    if (link.path === '/my-mosaic' && !user) {
                      openAuthModal('login');
                    } else {
                      navigate(link.path);
                    }
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-[#22382D] text-white dark:bg-[#DE6D43] dark:text-[#0F1012] shadow-xs'
                      : 'text-[#57534E] dark:text-[#A8A39C] hover:text-[#1C1917] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{link.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Icons & Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search Icon */}
            <button
              onClick={onOpenSearch}
              title="Search stories (Ctrl+K)"
              className="p-2 rounded-full text-[#57534E] dark:text-[#A8A39C] hover:text-[#1C1917] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Fast Evaluation Accounts Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsDemoMenuOpen(!isDemoMenuOpen);
                  setIsProfileMenuOpen(false);
                  setIsNotifMenuOpen(false);
                }}
                title="Switch Evaluation Account"
                className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border border-[#C85A32]/30 bg-[#C85A32]/10 text-[#C85A32] dark:border-[#DE6D43]/30 dark:bg-[#DE6D43]/10 dark:text-[#DE6D43] hover:bg-[#C85A32]/20 transition-all cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Demo Accounts</span>
              </button>

              {isDemoMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-[#18191D] border border-black/10 dark:border-white/10 shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-black/10 dark:border-white/10">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#857F77] dark:text-[#A8A39C]">
                      Fast Evaluation Accounts
                    </span>
                    <button
                      onClick={() => setIsDemoMenuOpen(false)}
                      className="text-[#857F77] hover:text-[#1C1917] dark:hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-[#857F77] dark:text-[#A8A39C] mb-2">
                    Click any account to instantly authenticate with seeded credentials:
                  </p>
                  <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                    {demoUsers.map((du) => (
                      <button
                        key={du.id}
                        onClick={() => handleQuickLogin(du.username)}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer ${
                          user?.username === du.username
                            ? 'bg-[#22382D]/10 dark:bg-[#DE6D43]/10 font-semibold'
                            : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <img
                            src={du.avatar_url}
                            alt={du.name}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                          <div>
                            <div className="text-[#1C1917] dark:text-[#F5F3EF] leading-tight">
                              {du.name}
                            </div>
                            <div className="text-[10px] text-[#857F77] dark:text-[#A8A39C]">
                              @{du.username} • {du.role}
                            </div>
                          </div>
                        </div>
                        {user?.username === du.username && (
                          <span className="text-[10px] uppercase font-bold text-[#22382D] dark:text-[#DE6D43]">
                            Active
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Notifications Icon (if logged in) */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => {
                    setIsNotifMenuOpen(!isNotifMenuOpen);
                    setIsProfileMenuOpen(false);
                    setIsDemoMenuOpen(false);
                  }}
                  title="Notifications"
                  className="p-2 rounded-full text-[#57534E] dark:text-[#A8A39C] hover:text-[#1C1917] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors relative cursor-pointer"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#C85A32] ring-2 ring-[#FBF9F5] dark:ring-[#0F1012]" />
                  )}
                </button>

                {isNotifMenuOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-[#18191D] border border-black/10 dark:border-white/10 shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-3 mb-2 border-b border-black/10 dark:border-white/10">
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-bold text-base text-[#1C1917] dark:text-[#F5F3EF]">
                          Editorial Dispatches
                        </span>
                        {unreadCount > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C85A32]/10 text-[#C85A32]">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-xs text-[#857F77] hover:text-[#1C1917] dark:hover:text-white underline cursor-pointer"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center text-xs text-[#857F77] dark:text-[#A8A39C]">
                          You're all caught up. No new notifications.
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`p-2.5 rounded-xl transition-colors text-xs ${
                              n.is_read
                                ? 'bg-transparent text-[#57534E] dark:text-[#A8A39C]'
                                : 'bg-[#22382D]/5 dark:bg-[#DE6D43]/10 text-[#1C1917] dark:text-[#F5F3EF] font-medium'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              {n.actor_avatar && (
                                <img
                                  src={n.actor_avatar}
                                  alt={n.actor_name}
                                  className="w-5 h-5 rounded-full object-cover mt-0.5"
                                />
                              )}
                              <div className="flex-1">
                                <p className="leading-snug">{n.message}</p>
                                <span className="text-[10px] text-[#857F77] dark:text-[#A8A39C] mt-1 block">
                                  {new Date(n.created_at).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} theme`}
              className="p-2 rounded-full text-[#57534E] dark:text-[#A8A39C] hover:text-[#1C1917] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {/* User Profile or Sign In */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => {
                    setIsProfileMenuOpen(!isProfileMenuOpen);
                    setIsNotifMenuOpen(false);
                    setIsDemoMenuOpen(false);
                  }}
                  className="flex items-center gap-2 p-1 pl-2 rounded-full border border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 transition-all cursor-pointer"
                >
                  <span className="hidden sm:inline text-xs font-medium text-[#1C1917] dark:text-[#F5F3EF] max-w-[100px] truncate">
                    {user.name.split(' ')[0]}
                  </span>
                  <img
                    src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'}
                    alt={user.name}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                </button>

                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#18191D] border border-black/10 dark:border-white/10 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2 border-b border-black/10 dark:border-white/10 mb-1">
                      <p className="text-xs font-bold text-[#1C1917] dark:text-[#F5F3EF] truncate">
                        {user.name}
                      </p>
                      <p className="text-[11px] text-[#857F77] dark:text-[#A8A39C] truncate">
                        @{user.username}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        navigate(`/profile/${user.username}`);
                        setIsProfileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[#57534E] dark:text-[#A8A39C] hover:text-[#1C1917] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <UserIcon className="w-3.5 h-3.5" />
                      <span>My Profile & Stories</span>
                    </button>

                    <button
                      onClick={() => {
                        navigate('/saved');
                        setIsProfileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[#57534E] dark:text-[#A8A39C] hover:text-[#1C1917] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>Saved Reading Shelf</span>
                    </button>

                    <button
                      onClick={() => {
                        navigate('/dashboard');
                        setIsProfileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[#57534E] dark:text-[#A8A39C] hover:text-[#1C1917] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>Creator Dashboard</span>
                    </button>

                    {user.role === 'admin' && (
                      <button
                        onClick={() => {
                          navigate('/admin');
                          setIsProfileMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[#C85A32] dark:text-[#DE6D43] hover:bg-[#C85A32]/10 transition-colors cursor-pointer font-medium"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span>Admin Console</span>
                      </button>
                    )}

                    <div className="border-t border-black/10 dark:border-white/10 my-1 pt-1">
                      <button
                        onClick={async () => {
                          await logout();
                          setIsProfileMenuOpen(false);
                          navigate('/');
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-red-600 hover:bg-red-500/10 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openAuthModal('login')}
                  className="text-xs font-semibold px-4 py-2 rounded-full border border-black/15 dark:border-white/20 text-[#1C1917] dark:text-[#F5F3EF] hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => openAuthModal('register')}
                  className="hidden sm:inline-block text-xs font-semibold px-4 py-2 rounded-full bg-[#22382D] text-white dark:bg-[#DE6D43] dark:text-[#0F1012] hover:opacity-90 transition-all shadow-xs cursor-pointer"
                >
                  Join MOSAIC
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FBF9F5]/95 dark:bg-[#0F1012]/95 backdrop-blur-lg border-t border-black/10 dark:border-white/10 px-4 py-2">
        <div className="flex items-center justify-around">
          <button
            onClick={() => navigate('/')}
            className={`flex flex-col items-center gap-1 text-[10px] font-medium p-1 ${
              currentPath === '/' ? 'text-[#22382D] dark:text-[#DE6D43]' : 'text-[#857F77]'
            }`}
          >
            <span className="font-brand font-bold text-base leading-none">M</span>
            <span>Home</span>
          </button>

          <button
            onClick={() => navigate('/explore')}
            className={`flex flex-col items-center gap-1 text-[10px] font-medium p-1 ${
              currentPath === '/explore' ? 'text-[#22382D] dark:text-[#DE6D43]' : 'text-[#857F77]'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Explore</span>
          </button>

          <button
            onClick={() => {
              if (!user) openAuthModal('login');
              else navigate('/write');
            }}
            className="flex flex-col items-center justify-center w-10 h-10 -mt-4 rounded-full bg-[#22382D] dark:bg-[#DE6D43] text-white dark:text-[#0F1012] shadow-lg cursor-pointer"
          >
            <PenTool className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              if (!user) openAuthModal('login');
              else navigate('/saved');
            }}
            className={`flex flex-col items-center gap-1 text-[10px] font-medium p-1 ${
              currentPath === '/saved' ? 'text-[#22382D] dark:text-[#DE6D43]' : 'text-[#857F77]'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>Saved</span>
          </button>

          <button
            onClick={() => {
              if (!user) openAuthModal('login');
              else navigate(`/profile/${user.username}`);
            }}
            className={`flex flex-col items-center gap-1 text-[10px] font-medium p-1 ${
              currentPath.startsWith('/profile') ? 'text-[#22382D] dark:text-[#DE6D43]' : 'text-[#857F77]'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>Profile</span>
          </button>
        </div>
      </div>
    </>
  );
};
