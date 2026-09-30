import React, { useState, useEffect } from 'react';
import { Shield, Users, BookOpen, MessageSquare, Eye, Trash2, AlertCircle } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface AdminPageProps {
  navigate: (path: string) => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ navigate }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statsRes, usersRes] = await Promise.all([
        apiRequest<{ usersCount: number; storiesCount: number; commentsCount: number; viewsTotal: number }>('/admin/stats'),
        apiRequest<{ users: any[] }>('/admin/users'),
      ]);
      setStats(statsRes);
      setUsers(usersRes.users || []);
    } catch (err: any) {
      setError(err.message || 'Access denied or server error.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchAdminData();
    } else {
      setIsLoading(false);
      setError('Administrator access required.');
    }
  }, [user]);

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user and all their published content?')) return;
    try {
      await apiRequest(`/admin/users/${id}`, { method: 'DELETE' });
      await fetchAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user.');
    }
  };

  if (error || user?.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <Shield className="w-12 h-12 text-[#C85A32] dark:text-[#DE6D43] mx-auto mb-3" />
        <h2 className="font-serif text-2xl font-bold text-[#1C1917] dark:text-[#F5F3EF]">
          RESTRICTED EDITORIAL CONSOLE
        </h2>
        <p className="text-xs text-[#857F77] dark:text-[#A8A39C] mt-2 mb-6">
          This area is strictly reserved for MOSAIC platform administrators.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-5 py-2.5 rounded-full bg-[#22382D] text-white text-xs font-semibold"
        >
          Return to Archive
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="pb-6 mb-8 border-b border-black/10 dark:border-white/10">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#C85A32] dark:text-[#DE6D43] mb-1">
          <Shield className="w-4 h-4" />
          <span>Platform Administration</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#1C1917] dark:text-[#F5F3EF]">
          MOSAIC Admin Console
        </h1>
        <p className="text-xs sm:text-sm text-[#857F77] dark:text-[#A8A39C] mt-1">
          Monitor system metrics, review community accounts, and moderate content.
        </p>
      </div>

      {/* Global Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <div className="p-5 rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#18191D]/70 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#857F77] flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> Total Users
          </span>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1917] dark:text-[#F5F3EF] mt-1">
            {stats?.usersCount || 0}
          </div>
        </div>

        <div className="p-5 rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#18191D]/70 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#857F77] flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5" /> Total Stories
          </span>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1917] dark:text-[#F5F3EF] mt-1">
            {stats?.storiesCount || 0}
          </div>
        </div>

        <div className="p-5 rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#18191D]/70 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#857F77] flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5" /> Total Comments
          </span>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1917] dark:text-[#F5F3EF] mt-1">
            {stats?.commentsCount || 0}
          </div>
        </div>

        <div className="p-5 rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#18191D]/70 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#857F77] flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" /> System Reads
          </span>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1917] dark:text-[#F5F3EF] mt-1">
            {stats?.viewsTotal?.toLocaleString() || 0}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#18191D]/70 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-black/10 dark:border-white/10">
          <h2 className="font-serif text-xl font-bold text-[#1C1917] dark:text-[#F5F3EF]">
            Registered Members ({users.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-black/5 dark:bg-white/5 uppercase text-[10px] tracking-wider text-[#857F77]">
              <tr>
                <th className="p-4 pl-6">Member</th>
                <th className="p-4">Email</th>
                <th className="p-4">Role</th>
                <th className="p-4">Stories</th>
                <th className="p-4">Joined</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                  <td className="p-4 pl-6 font-semibold text-[#1C1917] dark:text-[#F5F3EF]">
                    <div>{u.name}</div>
                    <div className="text-[10px] text-[#857F77]">@{u.username}</div>
                  </td>
                  <td className="p-4 text-[#57534E] dark:text-[#A8A39C]">{u.email}</td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        u.role === 'admin'
                          ? 'bg-[#DE6D43]/15 text-[#DE6D43]'
                          : u.role === 'creator'
                          ? 'bg-emerald-500/15 text-emerald-600'
                          : 'bg-black/5 text-[#857F77]'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4 font-semibold">{u.stories_count || 0}</td>
                  <td className="p-4 text-[#857F77]">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4 pr-6 text-right">
                    {u.id !== user?.id && (
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-500/10 cursor-pointer"
                        title="Delete user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
