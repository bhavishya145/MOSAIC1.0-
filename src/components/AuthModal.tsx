import React, { useState, useEffect } from 'react';
import { X, Lock, Mail, User as UserIcon, Sparkles, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, authModalMode, closeAuthModal, login, register, openAuthModal } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  
  // Forgot / Reset password state
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [devTokenNotice, setDevTokenNotice] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [demoUsers, setDemoUsers] = useState<any[]>([]);

  useEffect(() => {
    if (authModalMode) {
      setMode(authModalMode);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [authModalMode]);

  useEffect(() => {
    if (isAuthModalOpen) {
      apiRequest<{ demoUsers: any[] }>('/auth/demo-users')
        .then((res) => {
          if (res?.demoUsers) setDemoUsers(res.demoUsers);
        })
        .catch(() => {});
    }
  }, [isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setErrorMessage('Please enter your email or username, and password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await login(identifier.trim(), password);
    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Invalid email or password.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !email.trim() || !password) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await register({
      name: name.trim(),
      username: username.trim(),
      email: email.trim(),
      password,
      bio: bio.trim(),
    });

    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Failed to create account.');
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await apiRequest<{ message: string; devToken?: string; isDevMode?: boolean }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });

      setIsSubmitting(false);
      setSuccessMessage(res.message);
      if (res.devToken) {
        setDevTokenNotice(res.devToken);
        setResetToken(res.devToken);
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Unable to process request.');
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken || !newPassword || newPassword.length < 6) {
      setErrorMessage('Please provide a valid token and a new password (min 6 characters).');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await apiRequest<{ message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: resetToken, newPassword }),
      });
      setIsSubmitting(false);
      setSuccessMessage(res.message);
      setTimeout(() => {
        setMode('login');
        setSuccessMessage(null);
        setDevTokenNotice(null);
      }, 2000);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Failed to reset password.');
    }
  };

  const fillDemoAccount = (u: any) => {
    setIdentifier(u.username);
    setPassword('password123');
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-[#FBF9F5] dark:bg-[#18191D] border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 p-2 text-[#857F77] hover:text-[#1C1917] dark:hover:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="pt-8 px-6 sm:px-8 pb-4 text-center">
          <span className="font-brand font-bold text-xl tracking-[0.25em] text-[#1C1917] dark:text-[#F5F3EF]">
            MOSAIC
          </span>
          <h2 className="font-serif text-2xl font-bold text-[#1C1917] dark:text-[#F5F3EF] mt-2">
            {mode === 'login' && 'Welcome to the Archive'}
            {mode === 'register' && 'Become a Storyteller'}
            {mode === 'forgot' && 'Reset Your Password'}
            {mode === 'reset' && 'Set New Password'}
          </h2>
          <p className="text-xs text-[#857F77] dark:text-[#A8A39C] mt-1">
            {mode === 'login' && 'Sign in with your email or username to continue reading and writing.'}
            {mode === 'register' && 'Join an editorial collective of thoughtful readers and creators.'}
            {mode === 'forgot' && 'Enter your account email to receive reset instructions.'}
            {mode === 'reset' && 'Choose a secure new password for your MOSAIC account.'}
          </p>

          {/* Tab Switcher */}
          {mode !== 'reset' && (
            <div className="flex border-b border-black/10 dark:border-white/10 mt-6">
              <button
                type="button"
                onClick={() => { setMode('login'); setErrorMessage(null); setSuccessMessage(null); }}
                className={`flex-1 pb-3 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                  mode === 'login'
                    ? 'border-b-2 border-[#22382D] dark:border-[#DE6D43] text-[#1C1917] dark:text-[#F5F3EF]'
                    : 'text-[#857F77] hover:text-[#1C1917] dark:hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setErrorMessage(null); setSuccessMessage(null); }}
                className={`flex-1 pb-3 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                  mode === 'register'
                    ? 'border-b-2 border-[#22382D] dark:border-[#DE6D43] text-[#1C1917] dark:text-[#F5F3EF]'
                    : 'text-[#857F77] hover:text-[#1C1917] dark:hover:text-white'
                }`}
              >
                Register
              </button>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="px-6 sm:px-8 pb-6">
          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Development Reset Token Notice */}
          {devTokenNotice && (
            <div className="mb-4 p-3 rounded-2xl bg-[#DE6D43]/10 border border-[#DE6D43]/30 text-xs text-[#DE6D43]">
              <div className="font-semibold mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Development Reset Token</span>
              </div>
              <p className="text-[11px] text-[#57534E] dark:text-[#A8A39C] mb-2">
                Click below to proceed to the password reset form with this generated token:
              </p>
              <button
                type="button"
                onClick={() => {
                  setResetToken(devTokenNotice);
                  setMode('reset');
                }}
                className="px-3 py-1.5 rounded-lg bg-[#DE6D43] text-[#0F1012] font-semibold text-xs flex items-center gap-1 cursor-pointer"
              >
                <span>Continue to Set New Password</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A39C] mb-1">
                  Email or Username
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-3 text-[#857F77]" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="elena@mosaic.mag or elena"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] text-[#1C1917] dark:text-[#F5F3EF] text-sm focus:outline-hidden focus:ring-2 focus:ring-[#22382D] dark:focus:ring-[#DE6D43] transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A39C]">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setErrorMessage(null); setSuccessMessage(null); }}
                    className="text-xs text-[#857F77] hover:text-[#1C1917] dark:hover:text-[#DE6D43] transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3 text-[#857F77]" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] text-[#1C1917] dark:text-[#F5F3EF] text-sm focus:outline-hidden focus:ring-2 focus:ring-[#22382D] dark:focus:ring-[#DE6D43] transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 rounded-xl bg-[#22382D] hover:bg-[#192B22] text-white dark:bg-[#DE6D43] dark:hover:bg-[#E77E57] dark:text-[#0F1012] font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="inline-block animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                ) : (
                  <span>Sign In to MOSAIC</span>
                )}
              </button>

              {/* Fast Evaluation Accounts Picker */}
              <div className="mt-5 pt-4 border-t border-black/10 dark:border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#857F77] dark:text-[#A8A39C] flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#C85A32] dark:text-[#DE6D43]" />
                    Fast Evaluation Accounts
                  </span>
                  <span className="text-[10px] text-[#857F77] dark:text-[#A8A39C]">pw: password123</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {demoUsers.slice(0, 4).map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => fillDemoAccount(u)}
                      className="text-left p-1.5 rounded-lg border border-black/5 dark:border-white/5 bg-white/70 dark:bg-[#121316]/70 hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <img src={u.avatar_url} alt={u.name} className="w-5 h-5 rounded-full object-cover" />
                      <div className="truncate">
                        <div className="text-[11px] font-medium text-[#1C1917] dark:text-[#F5F3EF] truncate">{u.name}</div>
                        <div className="text-[9px] text-[#857F77] truncate">@{u.username} ({u.role})</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          )}

          {/* REGISTER FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A39C] mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Claire Rousseau"
                  className="w-full px-3 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] text-[#1C1917] dark:text-[#F5F3EF] text-sm focus:outline-hidden focus:ring-2 focus:ring-[#22382D] dark:focus:ring-[#DE6D43]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A39C] mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="claire_r"
                    className="w-full px-3 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] text-[#1C1917] dark:text-[#F5F3EF] text-sm focus:outline-hidden focus:ring-2 focus:ring-[#22382D] dark:focus:ring-[#DE6D43]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A39C] mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="claire@domain.com"
                    className="w-full px-3 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] text-[#1C1917] dark:text-[#F5F3EF] text-sm focus:outline-hidden focus:ring-2 focus:ring-[#22382D] dark:focus:ring-[#DE6D43]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A39C] mb-1">
                  Password (min 6 chars)
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] text-[#1C1917] dark:text-[#F5F3EF] text-sm focus:outline-hidden focus:ring-2 focus:ring-[#22382D] dark:focus:ring-[#DE6D43]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A39C] mb-1">
                  Short Bio (Optional)
                </label>
                <input
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Writer interested in architecture and software craft."
                  className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] text-[#1C1917] dark:text-[#F5F3EF] text-xs focus:outline-hidden focus:ring-2 focus:ring-[#22382D] dark:focus:ring-[#DE6D43]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 rounded-xl bg-[#22382D] hover:bg-[#192B22] text-white dark:bg-[#DE6D43] dark:hover:bg-[#E77E57] dark:text-[#0F1012] font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="inline-block animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                ) : (
                  <span>Create Storyteller Profile</span>
                )}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A39C] mb-1">
                  Account Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3 text-[#857F77]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="elena@mosaic.mag"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] text-[#1C1917] dark:text-[#F5F3EF] text-sm focus:outline-hidden focus:ring-2 focus:ring-[#22382D] dark:focus:ring-[#DE6D43]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-[#22382D] text-white dark:bg-[#DE6D43] dark:text-[#0F1012] font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Generating link...' : 'Send Reset Instructions'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-xs text-[#857F77] hover:text-[#1C1917] dark:hover:text-white transition-colors cursor-pointer"
                >
                  ← Return to Sign In
                </button>
              </div>
            </form>
          )}

          {/* RESET PASSWORD FORM */}
          {mode === 'reset' && (
            <form onSubmit={handleResetSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A39C] mb-1">
                  Reset Token
                </label>
                <input
                  type="text"
                  required
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] text-[#1C1917] dark:text-[#F5F3EF] text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A39C] mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-3 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] text-[#1C1917] dark:text-[#F5F3EF] text-sm focus:outline-hidden focus:ring-2 focus:ring-[#22382D] dark:focus:ring-[#DE6D43]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-[#22382D] text-white dark:bg-[#DE6D43] dark:text-[#0F1012] font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Updating password...' : 'Update Password & Sign In'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
