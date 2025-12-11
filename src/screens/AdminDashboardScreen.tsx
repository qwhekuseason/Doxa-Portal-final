

import React, { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirestoreQuery } from '../hooks';
import { RecentActivityFeed } from '../components/AdminViews';
import { Users, BookOpen, MessageCircle, Heart, AlertTriangle, ArrowUpRight, Shield, Zap } from 'lucide-react';
import { StatCard } from '../components/UIComponents';

const ActionButton: React.FC<{ label: string; icon: React.ReactNode; color: string; onClick?: () => void }> = ({ label, icon, color, onClick }) => (
  <button onClick={onClick} className="group flex items-center justify-between p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer">
    <div className="flex items-center gap-3">
      <div className={`p-2.5 rounded-lg ${color} bg-opacity-10 dark:bg-opacity-20`}>
        <div className={`${color.replace('bg-', 'text-')}`}>{icon}</div>
      </div>
      <span className="font-bold text-gray-700 dark:text-gray-200 group-hover:text-black dark:group-hover:text-white transition-colors">{label}</span>
    </div>
    <ArrowUpRight size={18} className="text-gray-300 group-hover:text-church-green group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
  </button>
);

const AdminDashboardScreen: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {

  const userQ = useMemo(() => query(collection(db, 'users')), []);
  const sermonQ = useMemo(() => query(collection(db, 'sermons')), []);
  const testimonyQ = useMemo(() => query(collection(db, 'testimonies'), where('approved', '==', false)), []);
  const prayerQ = useMemo(() => query(collection(db, 'prayer_requests'), where('approved', '==', false)), []);

  const { data: users, loading: l1 } = useFirestoreQuery(userQ);
  const { data: sermons, loading: l2 } = useFirestoreQuery(sermonQ);
  const { data: testimonies, loading: l3, error: e3 } = useFirestoreQuery(testimonyQ);
  const { data: prayers, loading: l4, error: e4 } = useFirestoreQuery(prayerQ);

  const navigateTo = (tab: string) => {
    if (onNavigate) onNavigate(tab);
  };

  return (
    <div className="space-y-8 animate-fade-in-up pb-20">

      {/* Header - Minimal Pop */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b border-gray-100 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold uppercase tracking-widest rounded-full">Administrator</span>
            <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full border border-green-100 dark:border-green-800">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div> Online
            </span>
          </div>
          <h1 className="text-4xl font-serif font-bold text-gray-900 dark:text-white tracking-tight">System Overview</h1>
          <p className="text-gray-500 mt-1 font-medium">Welcome back. Here's what's happening today.</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900 p-1.5 rounded-xl border border-gray-200 dark:border-gray-800 flex gap-2">
          <button className="px-4 py-2 bg-white dark:bg-black rounded-lg shadow-sm text-sm font-bold border border-gray-100 dark:border-gray-800 hover:text-church-green transition-colors">7 Days</button>
          <button className="px-4 py-2 text-gray-500 hover:text-black dark:hover:text-white text-sm font-bold transition-colors">30 Days</button>
        </div>
      </div>

      {(e3?.message.includes('requires an index') || e4?.message.includes('requires an index')) && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl flex items-center gap-3 border border-amber-100 dark:border-amber-800/50 mb-4 animate-in fade-in slide-in-from-top-2">
          <AlertTriangle size={20} />
          <span className="font-bold text-sm">Action Required: Database Indexes Missing. Check console for setup links.</span>
        </div>
      )}

      {/* Grid Layout - Clean & Pop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">

          {/* Stats Row - High Contrast Pop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard title="Total Congregation" value={users.length} icon={<Users />} color="bg-blue-600" trend="+12%" loading={l1} />
            <StatCard title="Sermon Library" value={sermons.length} icon={<BookOpen />} color="bg-church-green" loading={l2} />
            <StatCard title="Pending Testimonies" value={testimonies.length} icon={<MessageCircle />} color="bg-purple-600" loading={l3} />
            <StatCard title="Prayer Requests" value={prayers.length} icon={<Heart />} color="bg-rose-500" trend={`${prayers.length} pending`} loading={l4} />
          </div>

          {/* Quick Actions - "Pop" Buttons */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2"><Zap size={14} /> Quick Management</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ActionButton label="Review Prayers" icon={<Heart size={20} />} color="bg-rose-500" onClick={() => navigateTo('admin-prayers')} />
              <ActionButton label="Manage Events" icon={<Zap size={20} />} color="bg-amber-500" onClick={() => navigateTo('admin-events')} />
              <ActionButton label="Upload Sermon" icon={<BookOpen size={20} />} color="bg-church-green" onClick={() => navigateTo('admin-sermons')} />
              <ActionButton label="Approve Testimonies" icon={<Shield size={20} />} color="bg-purple-500" onClick={() => navigateTo('admin-testimonies')} />
            </div>
          </div>

        </div>

        {/* Sidebar - Activity Feed */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 h-full shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold font-serif text-xl dark:text-white">Live Activity</h3>
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            </div>
            <RecentActivityFeed />
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboardScreen;