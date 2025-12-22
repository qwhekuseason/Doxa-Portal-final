import './src/index.css';
import React, { useEffect, useState, useRef } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './src/firebase';
import { UserProfile } from './src/types';
import AuthPage from './src/components/AuthPage';
import { ThemeProvider, useTheme } from './src/components/ThemeContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';

// Import Screen Components
import AdminDashboardScreen from './src/screens/AdminDashboardScreen';
import QuizScreen from './src/screens/QuizScreen';
import PrayerWallScreen from './src/screens/PrayerWallScreen';
import EventsCalendarScreen from './src/screens/EventsCalendarScreen';
import TestimoniesScreen from './src/screens/TestimoniesScreen';
import SermonLibraryScreen from './src/screens/SermonLibraryScreen';
import GalleryScreen from './src/screens/GalleryScreen';
import HomeScreen from './src/screens/HomeScreen';
import LandingPage from './src/screens/LandingPage';
import ProfileScreen from './src/screens/ProfileScreen';
import BibleScreen from './src/screens/BibleScreen';
import JourneyScreen from './src/screens/JourneyScreen';
import LiveSessionScreen from './src/screens/LiveSessionScreen';
import GivingScreen from './src/screens/GivingScreen';
import AboutScreen from './src/screens/AboutScreen';

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
  AdminSettingsManager
} from './src/components/AdminViews';

// Import Components
import {
  GlobalAudioPlayer,
  NotificationPopover,
  SidebarItem,
  LoadingSpinner,
  useClickOutside
} from './src/components/UIComponents';

// Icons
import {
  Bell, Search, Sun, Moon, Brain, ImageIcon, Users,
  MessageCircle, Settings, Video, Headphones, Milestone, Book,
  Home, Heart, Calendar as CalendarIcon, Shield, BookOpen, LogOut, X, Menu
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'home', icon: <Home size={20} />, label: 'Dashboard' },
  { id: 'sermons', icon: <Headphones size={20} />, label: 'Sermons' },
  { id: 'live', icon: <Video size={20} />, label: 'Live' },
  { id: 'prayer', icon: <Heart size={20} />, label: 'Prayer' },
  { id: 'testimonies', icon: <MessageCircle size={20} />, label: 'Testimony' },
  { id: 'quiz', icon: <Brain size={20} />, label: 'Quiz' },
  { id: 'journey', icon: <Milestone size={20} />, label: 'Journey' },
  { id: 'bible', icon: <Book size={20} />, label: 'Bible' },
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
  { id: 'admin-users', icon: <Users size={20} />, label: 'Users' },
  { id: 'admin-gallery', icon: <ImageIcon size={20} />, label: 'Gallery' },
  { id: 'admin-testimonies', icon: <MessageCircle size={20} />, label: 'Testimonies' },
  { id: 'admin-settings', icon: <Settings size={20} />, label: 'System Settings' },
];

const Dashboard: React.FC<{ user: UserProfile; refreshUser: () => void }> = ({ user, refreshUser }) => {
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [currentSermon, setCurrentSermon] = useState(null);
  const [liveRoom, setLiveRoom] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);

  // Refs for click outside
  const settingsRef = useRef<HTMLDivElement>(null);
  const adminMenuRef = useRef<HTMLDivElement>(null);

  useClickOutside(settingsRef, () => setSettingsOpen(false));
  if (user.role === 'admin') useClickOutside(adminMenuRef, () => setAdminMenuOpen(false));

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      setShowNotifPrompt(true);
    }
  }, []);

  const enableNotifications = async () => {
    if (!('Notification' in window)) return;
    await Notification.requestPermission();
    setShowNotifPrompt(false);
  };

  const handleLogout = () => signOut(auth);

  const UserActions = () => (
    <div className="flex items-center gap-3 md:gap-5">
      {/* Search - Desktop Only */}
      <div className="hidden xl:flex relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-church-green transition-colors" size={18} />
        <input
          type="text"
          placeholder="Quick search..."
          className="bg-gray-100 dark:bg-white/5 border border-transparent focus:border-church-green/50 pl-11 pr-5 py-2.5 rounded-2xl text-xs font-bold focus:outline-none transition-all w-48 focus:w-64 dark:text-white"
        />
      </div>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={(e) => { e.stopPropagation(); setNotificationsOpen(!notificationsOpen); }}
          className={`p-2.5 rounded-2xl transition-all hover:scale-105 active:scale-95 border ${theme === 'dark' ? 'bg-white/5 border-white/5 text-gray-300' : 'bg-green-50/50 border-green-100 text-church-green'}`}
        >
          <Bell size={20} />
          <span className={`absolute top-2.5 right-2.5 w-2 h-2 rounded-full border-2 animate-bounce ${theme === 'dark' ? 'bg-church-gold border-black' : 'bg-church-green border-white'}`}></span>
        </button>
        <NotificationPopover isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      </div>

      {/* Settings Menu */}
      <div className="relative" ref={settingsRef}>
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className={`p-2.5 rounded-2xl transition-all hover:scale-105 active:scale-95 border ${theme === 'dark' ? 'bg-white/5 border-white/5 text-gray-300' : 'bg-green-50/50 border-green-100 text-church-green'}`}
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
        {/* Sidebar Logo */}
        <div className="p-6 pb-6 flex items-center gap-3 cursor-pointer group" onClick={() => setActiveTab('home')}>
          <div className="w-9 h-9 bg-gradient-to-br from-church-green to-emerald-700 rounded-xl flex items-center justify-center shadow-lg shadow-church-green/20 group-hover:scale-110 transition-transform">
            <img src="/logo.png" alt="" className="w-5 h-5 object-contain" />
          </div>
          <span className="font-sans font-black text-xl tracking-tighter dark:text-white uppercase group-hover:text-church-green transition-colors">Doxa<span className="text-church-green group-hover:text-white transition-colors">Portal</span></span>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 overflow-y-auto px-6 space-y-1 hide-scrollbar">
          <div className="px-5 py-3 text-[10px] font-black uppercase text-gray-400 tracking-widest opacity-60">Fellowship</div>
          {NAV_ITEMS.map(item => (
            <SidebarItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.id}
              onClick={() => setActiveTab(item.id)}
            />
          ))}

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
        <div className="p-5 border-t border-gray-100 dark:border-white/5 bg-gray-50/30 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 cursor-pointer group hover:border-church-green/50 transition-all" onClick={() => setActiveTab('profile')}>
            <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} className="w-9 h-9 rounded-xl object-cover" alt="" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black truncate dark:text-white uppercase tracking-tight">{user.displayName}</p>
              <p className="text-[9px] font-bold text-church-green uppercase tracking-widest mt-0.2">{user.role}</p>
            </div>
            <Settings size={12} className="text-gray-400 group-hover:rotate-90 transition-transform" />
          </div>

          <div className="mt-5 flex items-center justify-between px-1 gap-2">
            <button onClick={handleLogout} className="p-3 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm flex-1 flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </aside>


      {/* --- Mobile Sidebar (Drawer) --- */}
      <div className={`fixed inset-0 z-[200] lg:hidden pointer-events-none transition-opacity duration-500 ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0'}`}>
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}></div>

        {/* Drawer */}
        <aside className={`absolute top-4 left-4 bottom-4 w-72 glass-card rounded-4xl shadow- premium transform transition-transform duration-500 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-[110%]'} flex flex-col overflow-hidden`}>
          <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-white/50 dark:bg-black/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-church-green rounded-xl flex items-center justify-center">
                <img src="/logo.png" className="w-5 h-5" />
              </div>
              <span className="font-sans font-black text-sm dark:text-white uppercase tracking-tighter">Doxa Portal</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors text-gray-400"><X size={20} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-1 hide-scrollbar">
            <div className="mb-6 mx-1 p-4 rounded-3xl bg-church-green/5 dark:bg-church-green/10 border border-church-green/10 flex items-center gap-4 cursor-pointer" onClick={() => { setActiveTab('profile'); setSidebarOpen(false); }}>
              <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} className="w-12 h-12 rounded-2xl object-cover shadow-lg shadow-church-green/20" />
              <div>
                <div className="font-black text-xs dark:text-white uppercase tracking-tight">{user.displayName}</div>
                <div className="text-[9px] uppercase font-black text-church-green tracking-widest mt-0.5">{user.role} Member</div>
              </div>
            </div>

            {NAV_ITEMS.map(item => (
              <SidebarItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                active={activeTab === item.id}
                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
              />
            ))}

            {user.role === 'admin' && (
              <>
                <div className="px-5 py-3 mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-purple-500 opacity-60">Admin System</div>
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
          </div>

          <div className="p-6 border-t border-gray-100 dark:border-white/5 text-center bg-gray-50/50 dark:bg-black/20">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-loose">Holy Ghost Powered<br />© 2025 Doxa Portal v2.0</p>
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
        </header>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-8 scroll-smooth hide-scrollbar bg-gradient-to-b from-transparent to-gray-50/50 dark:to-transparent">
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
                    <p className="font-black text-sm uppercase tracking-wider">Enable Divine Updates</p>
                    <p className="text-xs opacity-80 mt-1">Get real-time alerts for live sessions and new sermons.</p>
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
              {activeTab === 'home' && <HomeScreen user={user} onNavigate={(tab) => { setActiveTab(tab); }} />}
              {activeTab === 'sermons' && <SermonLibraryScreen />}
              {activeTab === 'events' && <EventsCalendarScreen user={user} onJoinLive={(room) => { setLiveRoom(room); setActiveTab('live'); }} />}
              {activeTab === 'live' && <LiveSessionScreen initialRoom={liveRoom} user={user} />}
              {activeTab === 'testimonies' && <TestimoniesScreen user={user} />}
              {activeTab === 'prayer' && <PrayerWallScreen user={user} />}
              {activeTab === 'quiz' && <QuizScreen user={user} />}
              {activeTab === 'bible' && <BibleScreen user={user} />}
              {activeTab === 'journey' && <JourneyScreen user={user} />}
              {activeTab === 'gallery' && <GalleryScreen />}
              {activeTab === 'giving' && <GivingScreen />}
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
              {activeTab === 'admin-settings' && <AdminSettingsManager />}
            </div>
          </div>
        </div>

      </main>

      {/* Audio Player Overlay */}
      <GlobalAudioPlayer sermon={currentSermon} onClose={() => setCurrentSermon(null)} />

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
              stats: userData.stats || {}
            });
          } else {
            // Create default if missing
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'User',
              photoURL: firebaseUser.photoURL,
              role: 'member',
              stats: {}
            });
          }
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
          mode === 'live_window' ? (
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