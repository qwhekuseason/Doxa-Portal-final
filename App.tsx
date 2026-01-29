import './src/index.css';
import React, { useEffect, useState, useRef } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot, updateDoc, arrayUnion } from 'firebase/firestore';
import { getToken } from 'firebase/messaging';
import { auth, db, messaging } from './src/firebase';
import { UserProfile } from './src/types';
import AuthPage from './src/components/AuthPage';
import { ThemeProvider, useTheme } from './src/components/ThemeContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { updateSpiritualStreak } from './src/utils/streakService';

import {
  GlobalAudioPlayer,
  NotificationPopover,
  SidebarItem,
  LoadingSpinner,
  useClickOutside,
  ToastContainer,
  useToast
} from './src/components/UIComponents';
import { ReminderSystem } from './src/components/ReminderSystem';

// Lazy load Screen Components
const AdminDashboardScreen = React.lazy(() => import('./src/screens/AdminDashboardScreen'));
const QuizScreen = React.lazy(() => import('./src/screens/QuizScreen'));
const GroupChatScreen = React.lazy(() => import('./src/screens/GroupChatScreen'));
const EventsCalendarScreen = React.lazy(() => import('./src/screens/EventsCalendarScreen'));
const TestimoniesScreen = React.lazy(() => import('./src/screens/TestimoniesScreen'));
const SermonLibraryScreen = React.lazy(() => import('./src/screens/SermonLibraryScreen'));
const GalleryScreen = React.lazy(() => import('./src/screens/GalleryScreen'));
const HomeScreen = React.lazy(() => import('./src/screens/HomeScreen'));
const LandingPage = React.lazy(() => import('./src/screens/LandingPage'));
const ProfileScreen = React.lazy(() => import('./src/screens/ProfileScreen'));
const BibleScreen = React.lazy(() => import('./src/screens/BibleScreen'));
const JourneyScreen = React.lazy(() => import('./src/screens/JourneyScreen'));
const LiveSessionScreen = React.lazy(() => import('./src/screens/LiveSessionScreen'));
const GivingScreen = React.lazy(() => import('./src/screens/GivingScreen'));
const AboutScreen = React.lazy(() => import('./src/screens/AboutScreen'));
const BirthdaysScreen = React.lazy(() => import('./src/screens/BirthdaysScreen'));
const PrayerRequestsScreen = React.lazy(() => import('./src/screens/PrayerRequestsScreen'));
const BibleStudyScreen = React.lazy(() => import('./src/screens/BibleStudyScreen'));
const StoriesScreen = React.lazy(() => import('./src/screens/StoriesScreen'));
import StoryManager from './src/components/admin/StoryManager';

// Admin Screens
import { PrayerModeration } from './src/components/admin/PrayerModeration';
import { EventManager } from './src/components/admin/EventManager';
import { LiveRoomManager } from './src/components/admin/LiveRoomManager';
import {
  AdminSermonManager,
  AdminUserManager,
  AdminTestimonyManager,
  AdminQuizManager,
  AdminGalleryManager,
  AdminSettingsManager,
  AdminStudyPlanManager
} from './src/components/AdminViews';



// Icons
import {
  Bell, Search, Sun, Moon, Brain, ImageIcon, Users,
  MessageCircle, Settings, Video, Headphones, Milestone, Book,
  Home, Heart, Calendar as CalendarIcon, Shield, BookOpen, LogOut, X, Menu, Cake, ChevronRight, PenTool, Activity, MessageSquare, Camera
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'home', icon: <Home size={20} />, label: 'Home' },
  { id: 'bible', icon: <Book size={20} />, label: 'Bible' },
  { id: 'bible-study', icon: <PenTool size={20} />, label: 'Study' },
  { id: 'sermons', icon: <Headphones size={20} />, label: 'Sermons' },
  { id: 'live', icon: <Video size={20} />, label: 'Live' },
  { id: 'chat', icon: <MessageSquare size={20} />, label: 'Chat' },
  { id: 'stories', icon: <Camera size={20} />, label: 'Stories' },
  { id: 'testimonies', icon: <MessageCircle size={20} />, label: 'Testimonies' },
  { id: 'quiz', icon: <Brain size={20} />, label: 'Quiz' },
  { id: 'journey', icon: <Milestone size={20} />, label: 'Journey' },
  { id: 'events', icon: <CalendarIcon size={20} />, label: 'Events' },
  { id: 'giving', icon: <Heart size={20} />, label: 'Giving' },
  { id: 'gallery', icon: <ImageIcon size={20} />, label: 'Gallery' },
];

const ADMIN_NAV_ITEMS = [
  { id: 'admin', icon: <Shield size={20} />, label: 'Overview' },
  { id: 'admin-prayers', icon: <Heart size={20} />, label: 'Prayers' },
  { id: 'admin-events', icon: <CalendarIcon size={20} />, label: 'Events' },
  { id: 'admin-live-rooms', icon: <Video size={20} />, label: 'Live Rooms' },
  { id: 'admin-sermons', icon: <BookOpen size={20} />, label: 'Sermons' },
  { id: 'admin-quizzes', icon: <Brain size={20} />, label: 'Quizzes' },
  { id: 'admin-study-plans', icon: <PenTool size={20} />, label: 'Study Plans' },
  { id: 'admin-users', icon: <Users size={20} />, label: 'Users' },
  { id: 'admin-gallery', icon: <ImageIcon size={20} />, label: 'Gallery' },
  { id: 'admin-stories', icon: <ImageIcon size={20} />, label: 'Stories' },
  { id: 'admin-testimonies', icon: <MessageCircle size={20} />, label: 'Testimonies' },
  { id: 'admin-settings', icon: <Settings size={20} />, label: 'System Settings' },
];

const Dashboard: React.FC<{ user: UserProfile; refreshUser: () => void }> = ({ user, refreshUser }) => {
  const { theme, toggleTheme } = useTheme();
  const { toasts, addToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [currentSermon, setCurrentSermon] = useState(null);
  const [liveRoom, setLiveRoom] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Refs for click outside
  const settingsRef = useRef<HTMLDivElement>(null);
  const adminMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addToast("Back Online", "success");
    };
    const handleOffline = () => {
      setIsOnline(false);
      addToast("You are offline", "error");
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [addToast]);

  useClickOutside(settingsRef, () => setSettingsOpen(false));
  useClickOutside(adminMenuRef, () => setAdminMenuOpen(false));

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      setShowNotifPrompt(true);
    }
  }, []);

  const enableNotifications = async () => {
    if (!('Notification' in window)) return;
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted' && user?.uid) {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        const vapidKey = (import.meta as any).env.VITE_FIREBASE_VAPID_KEY;

        if (!vapidKey || vapidKey.length < 20) {
          console.warn('VAPID key not configured for standard notifications.');
          return;
        }

        const token = await getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration: registration
        });

        if (token) {
          await updateDoc(doc(db, 'users', user.uid), {
            fcmTokens: arrayUnion(token)
          });
        }
      }
    } catch (err) {
      console.error("FCM Registration error:", err);
    } finally {
      setShowNotifPrompt(false);
    }
  };

  const handleLogout = () => signOut(auth);

  const UserActions = () => (
    <div className="flex items-center gap-3 md:gap-4 lg:gap-6">
      {/* Global Header Search */}
      <div className="hidden lg:flex relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-church-green transition-all" size={16} />
        <input
          type="text"
          placeholder="Search everything..."
          className="bg-gray-100 dark:bg-white/5 border border-transparent focus:border-church-green/20 focus:bg-white dark:focus:bg-white/10 pl-11 pr-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider focus:outline-none transition-all w-48 xl:w-72 shadow-inner dark:text-white"
        />
      </div>

      {/* Notifications */}
      <div className="relative flex items-center gap-2">
        {!isOnline && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 text-red-500 rounded-full border border-red-500/20 animate-pulse">
            <Activity size={12} />
            <span className="text-[10px] font-black uppercase tracking-widest">Offline</span>
          </div>
        )}
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setNotificationsOpen(!notificationsOpen); }}
            className={`p-2.5 rounded-2xl transition-all hover:scale-105 active:scale-95 border ${theme === 'dark' ? 'bg-white/5 border-white/5 text-gray-300' : 'bg-green-50/50 border-green-100 text-church-green'}`}
          >
            <Bell size={20} />
            <span className={`absolute top-2.5 right-2.5 w-2 h-2 rounded-full border-2 animate-bounce ${theme === 'dark' ? 'bg-church-gold border-black' : 'bg-church-green border-white'}`}></span>
          </button>
          <NotificationPopover
            isOpen={notificationsOpen}
            onClose={() => setNotificationsOpen(false)}
            userId={user.uid}
            isAdmin={user.role === 'admin'}
          />
        </div>
      </div>

      {/* Settings Menu */}
      <div className="relative" ref={settingsRef}>
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className={`p-2.5 rounded-2xl transition-all hover:scale-105 active:scale-95 border ${theme === 'dark' ? 'bg-white/5 border-white/5 text-gray-400' : 'bg-green-50/50 border-green-100 text-church-green shadow-sm'}`}
        >
          <Settings size={20} />
        </button>

        {settingsOpen && (
          <div className="absolute top-full right-0 mt-4 w-72 p-2 glass-card rounded-3xl shadow-premium z-[60] flex flex-col gap-1 animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5 mb-2">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Preferences</p>
            </div>

            <button
              onClick={() => { setActiveTab('profile'); setSettingsOpen(false); }}
              className="flex items-center gap-4 px-5 py-3.5 rounded-2xl text-xs font-black transition-all hover:bg-gray-50 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300 group"
            >
              <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <Users size={16} />
              </div>
              MY ACCOUNT
            </button>

            <div className="h-px bg-gray-100 dark:bg-white/5 my-2"></div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-4 px-5 py-3.5 rounded-2xl text-xs font-black transition-all hover:bg-red-500 hover:text-white text-red-600 group"
            >
              <div className="p-2 bg-red-500/10 text-red-500 rounded-xl group-hover:bg-white/20 transition-colors">
                <LogOut size={16} />
              </div>
              SECURE LOGOUT
            </button>
          </div>
        )}
      </div>

      {/* Desktop Profile Avatar */}
      <div
        className="hidden md:flex items-center gap-4 pl-4 border-l border-gray-200 dark:border-white/10 cursor-pointer group"
        onClick={() => setActiveTab('profile')}
      >
        <div className="relative">
          <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} className="w-10 h-10 rounded-2xl border-2 border-transparent group-hover:border-church-green transition-all object-cover" alt="" />
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-church-green border-4 border-white dark:border-black rounded-full"></div>
        </div>
        <div className="hidden lg:block text-left">
          <p className="text-xs font-black leading-none dark:text-gray-200 tracking-tight">{user.displayName}</p>
          <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mt-1">{user.role}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen flex font-sans transition-colors duration-500 ${theme === 'dark' ? 'bg-[#050505] text-gray-100' : 'bg-gray-50 text-gray-900'}`}>

      {/* --- Desktop Sidebar (Persistent) --- */}
      <aside className="hidden lg:flex flex-col w-64 xl:w-72 sticky top-0 h-screen glass-header border-r border-gray-100 dark:border-white/5 z-50">
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-church-green/5 to-transparent pointer-events-none"></div>

        {/* Sidebar Logo */}
        <div className="p-8 pb-10 flex items-center gap-4 cursor-pointer group relative z-10" onClick={() => setActiveTab('home')}>
          <div className="w-12 h-12 bg-church-green rounded-2xl flex items-center justify-center shadow-lg shadow-church-green/30 group-hover:scale-110 transition-transform duration-500">
            <img src="/logo.png" alt="" className="w-7 h-7 object-contain" />
          </div>
          <div>
            <span className="font-sans font-black text-xl dark:text-white uppercase tracking-tighter leading-none block">Doxa Portal</span>
            <span className="text-[9px] font-black text-church-green uppercase tracking-[0.3em] mt-1 block opacity-60">Divine Grace</span>
          </div>
        </div>



        {/* Sidebar Navigation */}
        <div className="flex-1 overflow-y-auto px-6 space-y-1 hide-scrollbar">
          <div className="px-5 py-3 text-[10px] font-black uppercase text-gray-400 tracking-widest opacity-60">Community</div>
          {NAV_ITEMS.map(item => (
            <SidebarItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.id}
              onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
            />
          ))}

          {user.role === 'publicity' && (
            <>
              <div className="px-5 py-3 mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 opacity-60">Publicity</div>
              <SidebarItem
                icon={<Cake size={20} />}
                label="Birthdays"
                active={activeTab === 'birthdays'}
                onClick={() => { setActiveTab('birthdays'); setSidebarOpen(false); }}
              />
            </>
          )}

          {user.role === 'prayer' && (
            <>
              <div className="px-5 py-3 mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-church-gold opacity-60">Prayer Ministry</div>
              <SidebarItem
                icon={<Heart size={20} />}
                label="Prayer Requests"
                active={activeTab === 'prayer-requests'}
                onClick={() => { setActiveTab('prayer-requests'); setSidebarOpen(false); }}
              />
            </>
          )}

          {user.role === 'admin' && (
            <>
              <div className="px-5 py-3 mt-10 text-[10px] font-black uppercase tracking-[0.2em] text-purple-500 opacity-60">Admin System</div>
              {ADMIN_NAV_ITEMS.map(item => (
                <SidebarItem
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  active={activeTab === item.id}
                  onClick={() => setActiveTab(item.id)}
                />
              ))}
            </>
          )}
        </div>

        {/* Sidebar Bottom / Profile */}
        <div className="p-6 border-t border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-4 p-4 rounded-3xl bg-gray-50/50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 cursor-pointer group hover:border-church-green/30 transition-all hover:bg-white dark:hover:bg-white/5 shadow-sm" onClick={() => setActiveTab('profile')}>
            <div className="relative">
              <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} className="w-10 h-10 rounded-2xl object-cover border-2 border-transparent group-hover:border-church-green transition-all" alt="" />
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-church-green border-2 border-white dark:border-black rounded-full"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black truncate dark:text-white uppercase tracking-tight">{user.displayName}</p>
              <p className="text-[9px] font-bold text-church-green uppercase tracking-widest mt-0.5">{user.role}</p>
            </div>
            <ChevronRight size={14} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
          </div>

          <div className="mt-6">
            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 py-4 bg-red-500/5 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all font-black text-[10px] uppercase tracking-[0.2em] border border-red-500/10 shadow-sm">
              <LogOut size={16} /> Secure Logout
            </button>
          </div>
        </div>
      </aside >


      {/* --- Mobile Sidebar (Drawer) --- */}
      <div className={`fixed inset-0 z-[200] lg:hidden pointer-events-none transition-opacity duration-500 ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0'}`}>
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setSidebarOpen(false)}></div>

        {/* Drawer */}
        <aside className={`absolute top-0 left-0 bottom-0 w-[85%] max-w-sm bg-white dark:bg-[#050505] shadow-2xl transform transition-transform duration-500 ease-out z-[210] ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col overflow-hidden`}>
          <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-white/50 dark:bg-black/50 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-church-green rounded-xl flex items-center justify-center shadow-lg shadow-church-green/20">
                <img src="/logo.png" className="w-6 h-6" alt="Logo" />
              </div>
              <span className="font-sans font-black text-base dark:text-white uppercase tracking-tighter">Doxa Portal</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-white/5 rounded-2xl transition-all active:scale-90 text-gray-500"><X size={20} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-1 hide-scrollbar">
            <div className="mb-8 p-5 rounded-[2rem] bg-church-green/5 dark:bg-church-green/10 border border-church-green/10 flex items-center gap-4 cursor-pointer active:scale-95 transition-all shadow-sm" onClick={() => { setActiveTab('profile'); setSidebarOpen(false); }}>
              <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} className="w-14 h-14 rounded-2xl object-cover shadow-lg shadow-church-green/20" />
              <div className="flex-1 min-w-0">
                <div className="font-black text-xs dark:text-white uppercase tracking-tight truncate">{user.displayName}</div>
                <div className="text-[9px] uppercase font-black text-church-green tracking-widest mt-0.5">{user.role} Member</div>
              </div>
            </div>

            <div className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 opacity-60">Menu</div>
            {NAV_ITEMS.map(item => (
              <SidebarItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                active={activeTab === item.id}
                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
              />
            ))}

            {user.role === 'publicity' && (
              <>
                <div className="px-5 py-3 mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 opacity-60">Publicity Tools</div>
                <SidebarItem
                  icon={<Cake size={20} />}
                  label="Birthdays"
                  active={activeTab === 'birthdays'}
                  onClick={() => { setActiveTab('birthdays'); setSidebarOpen(false); }}
                />
              </>
            )}

            {user.role === 'prayer' && (
              <>
                <div className="px-5 py-3 mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-church-gold opacity-60">Ministry</div>
                <SidebarItem
                  icon={<Heart size={20} />}
                  label="Requests"
                  active={activeTab === 'prayer-requests'}
                  onClick={() => { setActiveTab('prayer-requests'); setSidebarOpen(false); }}
                />
              </>
            )}

            {user.role === 'admin' && (
              <>
                <div className="px-5 py-3 mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-purple-500 opacity-60">Administration</div>
                {ADMIN_NAV_ITEMS.map(item => (
                  <SidebarItem
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    active={activeTab === item.id}
                    onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                  />
                ))}
              </>
            )}

            <div className="mt-8 pb-10">
              <button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 py-5 bg-red-500/5 text-red-500 rounded-3xl hover:bg-red-500 hover:text-white transition-all font-black text-[10px] uppercase tracking-[0.3em] border border-red-500/10 active:scale-95 shadow-sm">
                <LogOut size={16} /> Secure Logout
              </button>
            </div>
          </div>

          <div className="p-6 border-t border-gray-100 dark:border-white/5 text-center bg-gray-50/50 dark:bg-black/20">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-loose">Securely Developed<br />© 2026 Doxa Portal v2.0</p>
          </div>
        </aside>
      </div>


      {/* --- Main Content --- */}
      <main className="flex-1 flex flex-col relative overflow-hidden">

        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-40 px-6 py-4 flex items-center justify-between glass-header">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-all">
            <Menu size={24} className="dark:text-white" />
          </button>

          <div className="flex items-center gap-2" onClick={() => setActiveTab('home')}>
            <img src="/logo.png" alt="" className="w-6 h-6 object-contain" />
            <span className="font-sans font-black text-lg dark:text-white uppercase tracking-tighter">Doxa</span>
          </div>

          <UserActions />
        </header >

        {/* Content Scroll Area */}
        < div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-8 scroll-smooth hide-scrollbar bg-gradient-to-b from-transparent to-gray-50/50 dark:to-transparent" >
          <div className="max-w-7xl mx-auto animate-fade-in-up">
            {/* Notification Prompt Widget */}
            {showNotifPrompt && (
              <div className="mb-8 p-6 rounded-[2rem] shadow-premium bg-gradient-to-br from-church-green to-emerald-800 text-white flex flex-col md:flex-row justify-between items-center gap-4 overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000"></div>

                <div className="flex gap-4 items-center relative z-10">
                  <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md">
                    <Bell className="animate-bounce" size={24} />
                  </div>
                  <div>
                    <p className="font-black text-sm uppercase tracking-wider">Enable Real-time Updates</p>
                    <p className="text-xs opacity-80 mt-1">Get instant alerts for live services and new content.</p>
                  </div>
                </div>

                <div className="flex gap-3 relative z-10 w-full md:w-auto">
                  <button onClick={() => setShowNotifPrompt(false)} className="flex-1 md:flex-none px-6 py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Later</button>
                  <button onClick={enableNotifications} className="flex-1 md:flex-none px-6 py-3 bg-white text-church-green hover:shadow-xl rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95">Enable Now</button>
                </div>
              </div>
            )}

            {/* Screen Rendering */}
            <div className="min-h-[calc(100vh-200px)]">
              <React.Suspense fallback={
                <div className="flex items-center justify-center p-20">
                  <LoadingSpinner />
                </div>
              }>
                {activeTab === 'home' && <HomeScreen user={user} onNavigate={(tab) => { setActiveTab(tab); }} />}
                {activeTab === 'sermons' && <SermonLibraryScreen />}
                {activeTab === 'events' && <EventsCalendarScreen user={user} onJoinLive={(room) => { setLiveRoom(room); setActiveTab('live'); }} />}
                {activeTab === 'live' && <LiveSessionScreen initialRoom={liveRoom} user={user} />}
                {activeTab === 'testimonies' && <TestimoniesScreen user={user} />}
                {activeTab === 'chat' && <GroupChatScreen user={user} />}
                {activeTab === 'quiz' && <QuizScreen user={user} onNavigate={(tab) => setActiveTab(tab)} />}
                {activeTab === 'bible' && <BibleScreen user={user} />}
                {activeTab === 'bible-study' && <BibleStudyScreen user={user} />}
                {activeTab === 'journey' && <JourneyScreen user={user} />}
                {activeTab === 'gallery' && <GalleryScreen />}
                {activeTab === 'giving' && <GivingScreen user={user} />}
                {activeTab === 'stories' && <StoriesScreen user={user} />}
                {activeTab === 'birthdays' && <BirthdaysScreen user={user} />}
                {activeTab === 'prayer-requests' && <PrayerRequestsScreen user={user} />}
                {activeTab === 'admin' && <AdminDashboardScreen onNavigate={(tab) => setActiveTab(tab)} />}
                {activeTab === 'profile' && <ProfileScreen user={user} refreshUser={refreshUser} />}

                {/* Admin Sub-Screens */}
                {activeTab === 'admin-prayers' && <div className="max-w-4xl mx-auto"><PrayerModeration /></div>}
                {activeTab === 'admin-events' && <div className="max-w-5xl mx-auto"><EventManager /></div>}
                {activeTab === 'admin-live-rooms' && <div className="max-w-6xl mx-auto"><LiveRoomManager /></div>}
                {activeTab === 'admin-sermons' && <AdminSermonManager />}
                {activeTab === 'admin-testimonies' && <AdminTestimonyManager />}
                {activeTab === 'admin-users' && <AdminUserManager />}
                {activeTab === 'admin-quizzes' && <AdminQuizManager />}
                {activeTab === 'admin-gallery' && <AdminGalleryManager />}
                {activeTab === 'admin-study-plans' && <AdminStudyPlanManager />}
                {activeTab === 'admin-stories' && <div className="max-w-6xl mx-auto"><StoryManager /></div>}
                {activeTab === 'admin-settings' && <AdminSettingsManager />}
              </React.Suspense>
            </div>
          </div>
        </div >

      </main >

      {/* Audio Player Overlay */}
      <React.Suspense fallback={null}>
        <GlobalAudioPlayer sermon={currentSermon} onClose={() => setCurrentSermon(null)} />
      </React.Suspense>

      {/* Global Utilities */}
      <ToastContainer toasts={toasts} />
      <ReminderSystem userId={user.uid} />
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'dashboard' | 'live_window'>('dashboard');
  const [initialRoom, setInitialRoom] = useState('');

  useEffect(() => {
    // Check for standalone mode (new window)
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'live_window') {
      setMode('live_window');
      setInitialRoom(params.get('room') || '');
    }

    let unsubscribeUserDoc: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Real-time listener for User Profile
        const userDocRef = doc(db, "users", firebaseUser.uid);
        unsubscribeUserDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data() as any;
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: userData.displayName || firebaseUser.displayName || 'User',
              photoURL: userData.photoURL || firebaseUser.photoURL,
              role: userData.role || 'member',
              phoneNumber: userData.phoneNumber,
              hostelName: userData.hostelName,
              dateOfBirth: userData.dateOfBirth,
              createdAt: userData.createdAt,
              isVerified: firebaseUser.emailVerified || firebaseUser.email === 'admin@gmail.com',
              stats: userData.stats || {},
              streak: userData.streak || { count: 0, lastChecked: '', best: 0 },
              lastActive: userData.lastActive,
              isOnline: userData.isOnline
            });

            // Trigger streak update check
            updateSpiritualStreak({
              uid: firebaseUser.uid,
              streak: userData.streak,
              ...userData
            } as any);
          } else {
            // Create default if missing
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'User',
              photoURL: firebaseUser.photoURL,
              role: firebaseUser.email === 'admin@gmail.com' ? 'admin' : 'member',
              isVerified: firebaseUser.emailVerified || firebaseUser.email === 'admin@gmail.com',
              stats: {}
            });
          }
          setLoading(false);
        }, (error) => {
          console.error("Firestore User Profile Error:", error);
          // Still create a basic user object so the app can load
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'User',
            photoURL: firebaseUser.photoURL,
            role: firebaseUser.email === 'admin@gmail.com' ? 'admin' : 'member',
            isVerified: firebaseUser.emailVerified || firebaseUser.email === 'admin@gmail.com',
            stats: {}
          });
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
        if (unsubscribeUserDoc) unsubscribeUserDoc();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, []);

  if (loading) {
    return (
      // Loading State centered on black or white background
      <div className="h-screen w-full flex items-center justify-center bg-white dark:bg-black">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        {user ? (
          (user.isVerified === false && user.email !== 'admin@gmail.com') ? (
            <AuthPage initialMode="verify" />
          ) : mode === 'live_window' ? (
            <LiveSessionScreen initialRoom={initialRoom} user={user} autoJoin={true} />
          ) : (
            <Dashboard user={user} refreshUser={() => { /* Real-time listener handles updates */ }} />
          )
        ) : (
          <UnauthenticatedView />
        )}
      </ThemeProvider>
    </ErrorBoundary>
  );
};

const UnauthenticatedView: React.FC = () => {
  const [view, setView] = useState<'landing' | 'login' | 'register'>('landing');

  const handleNavigate = (page: 'login' | 'register') => {
    setView(page);
  }

  if (view === 'landing') {
    return <LandingPage onNavigate={handleNavigate} />;
  }

  return <AuthPage initialMode={view} onBack={() => setView('landing')} />;
};

export default App;