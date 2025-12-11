import './src/index.css';
import React, { useEffect, useState } from 'react';
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

// Admin Screens
import { PrayerModeration } from './src/components/admin/PrayerModeration';
import { EventManager } from './src/components/admin/EventManager';
import {
  AdminSermonManager,
  AdminUserManager,
  AdminTestimonyManager,
  AdminQuizManager,
  AdminGalleryManager
} from './src/components/AdminViews';

// Import Components
import {
  GlobalAudioPlayer,
  NotificationPopover,
  SidebarItem,
  LoadingSpinner
} from './src/components/UIComponents';

// Icons
import {
  LogOut, Home, BookOpen, Calendar as CalendarIcon, Heart, Shield, Menu, X,
  Bell, Search, Sun, Moon, Brain, ImageIcon, Users,
  MessageCircle, Settings, Video
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'home', icon: <Home size={20} />, label: 'Dashboard' },
  { id: 'sermons', icon: <BookOpen size={20} />, label: 'Sermons' },
  { id: 'bible', icon: <BookOpen size={20} />, label: 'Bible' },
  { id: 'events', icon: <CalendarIcon size={20} />, label: 'Events' },
  { id: 'live', icon: <Video size={20} />, label: 'Live' }, // Added Live
  { id: 'prayer', icon: <Heart size={20} />, label: 'Prayer' },
  { id: 'quiz', icon: <Brain size={20} />, label: 'Quiz' },
  { id: 'journey', icon: <MessageCircle size={20} />, label: 'Journey' },
  { id: 'gallery', icon: <ImageIcon size={20} />, label: 'Gallery' },
];

const ADMIN_NAV_ITEMS = [
  { id: 'admin', icon: <Shield size={20} />, label: 'Overview' },
  { id: 'admin-prayers', icon: <Heart size={20} />, label: 'Prayers' },
  { id: 'admin-events', icon: <CalendarIcon size={20} />, label: 'Events' },
  { id: 'admin-sermons', icon: <BookOpen size={20} />, label: 'Sermons' },
  { id: 'admin-quizzes', icon: <Brain size={20} />, label: 'Quizzes' },
  { id: 'admin-users', icon: <Users size={20} />, label: 'Users' },
  { id: 'admin-gallery', icon: <ImageIcon size={20} />, label: 'Gallery' },
  { id: 'admin-testimonies', icon: <MessageCircle size={20} />, label: 'Testimonies' },
];

const Dashboard: React.FC<{ user: UserProfile; refreshUser: () => void }> = ({ user, refreshUser }) => {
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [currentSermon, setCurrentSermon] = useState(null);
  const [liveRoom, setLiveRoom] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false); // New state
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);

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
    <div className="flex items-center gap-2 md:gap-4">
      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => setNotificationsOpen(!notificationsOpen)}
          className={`p-2 md:p-2.5 rounded-full transition-all hover:scale-110 border ${theme === 'dark' ? 'bg-[#222] border-gray-700 text-gray-300' : 'bg-white border-green-100 text-green-600'}`}
        >
          <Bell size={20} />
          <span className={`absolute top-2 right-2.5 w-2 h-2 rounded-full border-2 animate-pulse ${theme === 'dark' ? 'bg-yellow-400 border-black' : 'bg-green-500 border-white'}`}></span>
        </button>
        <NotificationPopover isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      </div>

      {/* Settings Menu */}
      <div className="relative">
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className={`p-2 md:p-2.5 rounded-full transition-all hover:scale-110 border ${theme === 'dark' ? 'bg-[#222] border-gray-700 text-gray-300' : 'bg-white border-green-100 text-green-600'}`}
        >
          <Settings size={20} />
        </button>

        {/* Settings Dropdown */}
        {settingsOpen && (
          <div className="absolute top-full right-0 mt-4 w-64 p-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl z-50 flex flex-col gap-1 animate-in fade-in zoom-in-95">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 mb-1">
              <p className="text-xs font-bold uppercase text-gray-400 tracking-wider">Settings</p>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
            >
              <div className="flex items-center gap-3">
                {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                <span>Appearance</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs opacity-60">{theme === 'dark' ? 'Dark' : 'Light'}</span>
                <div className={`w-8 h-4 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-church-gold' : 'bg-gray-300'}`}>
                  <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${theme === 'dark' ? 'translate-x-4' : ''}`}></div>
                </div>
              </div>
            </button>

            {/* Profile Link */}
            <button
              onClick={() => { setActiveTab('profile'); setSettingsOpen(false); }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
            >
              <Users size={18} /> Profile & Account
            </button>

            {/* Sign Out */}
            <div className="h-px bg-gray-100 dark:bg-gray-800 my-1"></div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 w-full text-left"
            >
              <LogOut size={18} /> Sign Out
            </button>
          </div>
        )}
      </div>

      {/* Profile Avatar (Quick Link) */}
      <div className="hidden md:flex items-center gap-3 pl-2 border-l border-gray-200 dark:border-gray-800 cursor-pointer" onClick={() => setActiveTab('profile')}>
        <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} className={`w-9 h-9 rounded-full border-2 ${theme === 'dark' ? 'border-yellow-500' : 'border-green-600'}`} alt="" />
        <div className="hidden lg:block text-left">
          <p className="text-xs font-bold leading-none dark:text-gray-200">{user.displayName}</p>
          <p className="text-[10px] opacity-70 uppercase dark:text-gray-400">{user.role}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-500 ${theme === 'dark' ? 'bg-black text-gray-100' : 'bg-gray-50 text-gray-900'}`}>

      {/* --- Desktop Top Bar --- */}
      <header className={`hidden lg:flex sticky top-0 z-50 items-center justify-between px-8 py-4 backdrop-blur-xl border-b transition-colors ${theme === 'dark' ? 'bg-black/80 border-gray-800' : 'bg-white/90 border-green-100'}`}>
        {/* Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('home')}>
          <img src="/logo.png" alt="Doxa Portal" className="w-9 h-9 object-contain" />
          <span className="font-serif font-bold text-xl tracking-tight bg-gradient-to-r from-green-700 to-yellow-500 bg-clip-text text-transparent">Doxa Portal</span>
        </div>

        {/* Navigation Links */}
        <nav className="flex items-center gap-1 bg-gray-100/50 dark:bg-gray-900/50 p-1.5 rounded-full border border-gray-200 dark:border-gray-800">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${activeTab === item.id
                ? (theme === 'dark' ? 'bg-[#222] text-white shadow-lg shadow-yellow-900/10' : 'bg-white text-church-green shadow-sm')
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`}
            >
              {item.label}
            </button>
          ))}

          {/* Admin Dropdown */}
          {user.role === 'admin' && (
            <div className="relative">
              <button
                onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-1 ${activeTab.startsWith('admin') ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'text-gray-500 hover:text-black dark:hover:text-white'}`}
              >
                Admin <Shield size={14} />
              </button>
              {adminMenuOpen && (
                <div className="absolute top-full right-0 mt-4 w-56 p-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl z-50 flex flex-col gap-1 animate-in fade-in zoom-in-95">
                  {ADMIN_NAV_ITEMS.map(item => (
                    <button
                      key={item.id}
                      onClick={() => { setActiveTab(item.id); setAdminMenuOpen(false); }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === item.id
                        ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
                    >
                      {React.cloneElement(item.icon as React.ReactElement, { size: 16 })} {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Right Actions */}
        <UserActions />
      </header>


      {/* --- Mobile Sidebar (Drawer) --- */}
      <div className={`fixed inset-0 z-50 lg:hidden pointer-events-none transition-opacity duration-300 ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0'}`}>
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}></div>

        {/* Drawer */}
        <aside className={`absolute top-0 left-0 bottom-0 w-80 bg-white dark:bg-[#111] shadow-2xl transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
          <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo.png" className="w-8 h-8" />
              <span className="font-serif font-bold text-lg dark:text-white">Doxa Portal</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"><X size={20} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            <div className="mb-6 mx-2 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 flex items-center gap-3" onClick={() => setActiveTab('profile')}>
              <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} className="w-10 h-10 rounded-full" />
              <div>
                <div className="font-bold text-sm dark:text-white">{user.displayName}</div>
                <div className="text-[10px] uppercase font-bold text-church-green">{user.role}</div>
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
                <div className="px-4 py-2 mt-4 text-[10px] font-bold uppercase text-gray-400">Admin Tools</div>
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

          {/* Reformatted Bottom Section - No Big Logout, just version or legal */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 text-center">
            <p className="text-xs text-gray-400">© 2025 Doxa Portal v1.2</p>
          </div>
        </aside>
      </div>


      {/* --- Main Content --- */}
      <main className="flex-1 flex flex-col relative overflow-hidden">

        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-30 px-6 py-4 flex items-center justify-between backdrop-blur-md border-b bg-white/90 dark:bg-black/80 dark:border-gray-800">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <Menu size={24} className="dark:text-white" />
          </button>
          <span className="font-serif font-bold text-lg dark:text-white">Doxa Portal</span>
          <UserActions />
        </header>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-32 scroll-smooth">
          <div className="max-w-7xl mx-auto animate-fade-in-up">
            {/* Notification Prompt Widget */}
            {showNotifPrompt && (
              <div className="mb-6 p-4 rounded-xl shadow-lg border bg-gradient-to-r from-church-green to-emerald-600 text-white flex justify-between items-center">
                <div className="flex gap-3 items-center">
                  <Bell className="animate-pulse text-yellow-300" />
                  <div><p className="font-bold">Enable Notifications</p><p className="text-xs opacity-90">Never miss a sermon.</p></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowNotifPrompt(false)} className="px-3 py-1 bg-white/20 rounded-lg text-xs font-bold">Later</button>
                  <button onClick={enableNotifications} className="px-3 py-1 bg-white text-church-green rounded-lg text-xs font-bold shadow-md">Enable</button>
                </div>
              </div>
            )}

            {/* Screen Rendering */}
            {activeTab === 'home' && <HomeScreen user={user} onNavigate={(tab) => { setActiveTab(tab); setSidebarOpen(false); }} />}
            {activeTab === 'sermons' && <SermonLibraryScreen />}
            {activeTab === 'events' && <EventsCalendarScreen user={user} onJoinLive={(room) => { setLiveRoom(room); setActiveTab('live'); }} />}
            {activeTab === 'live' && <LiveSessionScreen initialRoom={liveRoom} />}
            {activeTab === 'testimonies' && <TestimoniesScreen user={user} />}
            {activeTab === 'prayer' && <PrayerWallScreen user={user} />}
            {activeTab === 'quiz' && <QuizScreen />}
            {activeTab === 'bible' && <BibleScreen user={user} />}
            {activeTab === 'journey' && <JourneyScreen user={user} />}
            {activeTab === 'gallery' && <GalleryScreen />}
            {activeTab === 'admin' && <AdminDashboardScreen onNavigate={(tab) => setActiveTab(tab)} />}
            {activeTab === 'profile' && <ProfileScreen user={user} refreshUser={refreshUser} />}

            {/* Admin Sub-Screens */}
            {activeTab === 'admin-prayers' && <div className="max-w-4xl mx-auto"><PrayerModeration /></div>}
            {activeTab === 'admin-events' && <div className="max-w-5xl mx-auto"><EventManager /></div>}
            {activeTab === 'admin-sermons' && <AdminSermonManager />}
            {activeTab === 'admin-testimonies' && <AdminTestimonyManager />}
            {activeTab === 'admin-users' && <AdminUserManager />}
            {activeTab === 'admin-quizzes' && <AdminQuizManager />}
            {activeTab === 'admin-gallery' && <AdminGalleryManager />}
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

  useEffect(() => {
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
          <Dashboard user={user} refreshUser={() => { /* Real-time listener handles updates */ }} />
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