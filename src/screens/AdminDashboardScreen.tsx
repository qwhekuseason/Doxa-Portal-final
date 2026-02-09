
import React, { useMemo, useState } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirestoreQuery } from '../hooks';
import { RecentActivityFeed } from '../components/AdminViews';
import { Users, BookOpen, MessageCircle, Heart, AlertTriangle, ArrowUpRight, Shield, Zap, Image as ImageIcon, BarChart3, TrendingUp, TrendingDown, Star, Bell } from 'lucide-react';
import { StatCard } from '../components/UIComponents';
import { AttendanceProjector } from '../components/admin/AttendanceProjector';
import { UserProfile } from '../types';
import { createNotification, sendBrowserNotification } from '../utils/notificationService';

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

type TimeFilter = '7days' | '30days';

interface AdminDashboardProps {
  onNavigate?: (tab: string) => void;
  addToast?: (msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

const AdminDashboardScreen: React.FC<AdminDashboardProps> = ({ onNavigate, addToast }) => {
  const [showProjector, setShowProjector] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('7days');

  const handleTestNotification = async () => {
    const testNotif = {
      title: '🧪 System Test Notification',
      message: 'This is a test notification to verify the system is active.',
      type: 'info' as const,
    };
    await createNotification(testNotif);
    sendBrowserNotification(testNotif.title, testNotif.message);
    if (addToast) {
      addToast("Test notification dispatched!", "success");
    } else {
      alert("Test notification sent! Check the bell icon.");
    }
  };

  const userQ = useMemo(() => query(collection(db, 'users')), []);
  const sermonQ = useMemo(() => query(collection(db, 'sermons')), []);
  const testimonyQ = useMemo(() => query(collection(db, 'testimonies'), where('approved', '==', false)), []);
  const prayerQ = useMemo(() => query(collection(db, 'prayer_requests'), where('approved', '==', false)), []);

  const { data: users, loading: l1 } = useFirestoreQuery<UserProfile>(userQ);
  const { data: sermons, loading: l2 } = useFirestoreQuery(sermonQ);
  const { data: testimonies, loading: l3, error: e3 } = useFirestoreQuery(testimonyQ);
  const { data: prayers, loading: l4, error: e4 } = useFirestoreQuery(prayerQ);

  // Calculate user growth based on time filter
  const userGrowth = useMemo(() => {
    if (!users || users.length === 0) return { percentage: 0, isPositive: true, count: 0 };

    const now = new Date();
    const daysAgo = timeFilter === '7days' ? 7 : 30;
    const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    // Count users created in the selected period
    const newUsers = users.filter(user => {
      if (!user.createdAt) return false;

      let userDate: Date;
      if (typeof user.createdAt === 'string') {
        userDate = new Date(user.createdAt);
      } else if ((user.createdAt as any).toDate) {
        userDate = (user.createdAt as any).toDate();
      } else {
        return false;
      }

      return userDate >= cutoffDate;
    });

    const newUserCount = newUsers.length;
    const previousUserCount = users.length - newUserCount;

    // Calculate percentage growth
    let percentage = 0;
    if (previousUserCount > 0) {
      percentage = Math.round((newUserCount / previousUserCount) * 100);
    } else if (newUserCount > 0) {
      percentage = 100; // If no previous users, 100% growth
    }

    return {
      percentage,
      isPositive: newUserCount >= 0,
      count: newUserCount
    };
  }, [users, timeFilter]);

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
          <p className="text-gray-500 mt-1 font-medium">Welcome back. Here's what's happening {timeFilter === '7days' ? 'this week' : 'this month'}.</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900 p-1.5 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-wrap gap-2">
          <button
            onClick={() => setTimeFilter('7days')}
            className={`px-4 py-2 rounded-lg shadow-sm text-sm font-bold border transition-all ${timeFilter === '7days'
              ? 'bg-white dark:bg-black border-gray-100 dark:border-gray-800 text-church-green scale-105'
              : 'text-gray-500 hover:text-black dark:hover:text-white border-transparent'
              }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setTimeFilter('30days')}
            className={`px-4 py-2 rounded-lg shadow-sm text-sm font-bold border transition-all ${timeFilter === '30days'
              ? 'bg-white dark:bg-black border-gray-100 dark:border-gray-800 text-church-green scale-105'
              : 'text-gray-500 hover:text-black dark:hover:text-white border-transparent'
              }`}
          >
            30 Days
          </button>
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-800 my-auto mx-1"></div>
          <button
            onClick={handleTestNotification}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-church-green/10 text-church-green hover:bg-church-green hover:text-white transition-all text-sm font-bold border border-church-green/20"
            title="Send test notification to verify system"
          >
            <Bell size={14} /> Test Notif
          </button>
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
            <StatCard
              title="Members"
              value={users.length}
              icon={<Users />}
              color="bg-church-green"
              trend={userGrowth.percentage > 0 ? `${userGrowth.isPositive ? '+' : '-'}${userGrowth.percentage}%` : undefined}
              loading={l1}
              onClick={() => navigateTo('admin-users')}
            />
            <StatCard
              title="Content Library"
              value={sermons.length}
              icon={<BookOpen />}
              color="bg-blue-600"
              loading={l2}
              onClick={() => navigateTo('admin-sermons')}
            />
            <StatCard
              title="Pending Testimonies"
              value={testimonies.length}
              icon={<Shield />}
              color="bg-purple-600"
              loading={l3}
              onClick={() => navigateTo('admin-testimonies')}
            />
            <StatCard
              title="Support Requests"
              value={prayers.length}
              icon={<Heart />}
              color="bg-rose-500"
              trend={prayers.length > 0 ? `${prayers.length} pending` : undefined}
              loading={l4}
              onClick={() => navigateTo('admin-prayers')}
            />
          </div>

          {/* User Growth Insight Card */}
          {!l1 && userGrowth.count > 0 && (
            <div className="glass-card p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-900/10">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-blue-500/10 rounded-2xl">
                    {userGrowth.isPositive ? (
                      <TrendingUp size={28} className="text-blue-600" />
                    ) : (
                      <TrendingDown size={28} className="text-orange-600" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">
                      {userGrowth.count} New {userGrowth.count === 1 ? 'Member' : 'Members'}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mt-1">
                      Joined in the last {timeFilter === '7days' ? '7 days' : '30 days'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-black ${userGrowth.isPositive ? 'text-green-600' : 'text-orange-600'}`}>
                    {userGrowth.isPositive ? '+' : ''}{userGrowth.percentage}%
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Growth Rate</p>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions - "Pop" Buttons */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2 animate-fade-in"><Zap size={14} /> Quick Management</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-bottom duration-500 delay-100">
              <ActionButton label="Launch Attendance Projector" icon={<Users size={20} />} color="bg-indigo-600" onClick={() => setShowProjector(true)} />
              <ActionButton label="Review Attendance Analytics" icon={<BarChart3 size={20} />} color="bg-emerald-600" onClick={() => navigateTo('admin-attendance')} />
              <ActionButton label="Review Support" icon={<Heart size={20} />} color="bg-rose-500" onClick={() => navigateTo('admin-prayers')} />
              <ActionButton label="Manage Events" icon={<Zap size={20} />} color="bg-amber-500" onClick={() => navigateTo('admin-events')} />
              <ActionButton label="Post Community Story" icon={<ImageIcon size={20} />} color="bg-blue-500" onClick={() => navigateTo('admin-stories')} />
              <ActionButton label="Upload Content Library" icon={<BookOpen size={20} />} color="bg-church-green" onClick={() => navigateTo('admin-sermons')} />
              <ActionButton label="Approve Testimonies" icon={<Shield size={20} />} color="bg-purple-500" onClick={() => navigateTo('admin-testimonies')} />
              <ActionButton label="Manage Service Reviews" icon={<Star size={20} />} color="bg-church-gold" onClick={() => navigateTo('admin-reviews')} />
            </div>
          </div>

        </div>

        {/* Sidebar - Activity Feed */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm hover:shadow-md transition-shadow sticky top-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold font-serif text-xl dark:text-white">Live Activity</h3>
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            </div>
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto hide-scrollbar">
              <RecentActivityFeed />
            </div>
          </div>
        </div>

      </div>

      {showProjector && <AttendanceProjector onClose={() => setShowProjector(false)} />}
    </div>
  );
};

export default AdminDashboardScreen;