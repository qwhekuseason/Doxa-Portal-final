import './src/index.css';
import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './src/firebase';
import { UserProfile } from './src/types';
import AuthPage from './src/components/AuthPage';
import { ThemeProvider, useTheme } from './src/components/ThemeContext';

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
  MessageCircle
} from 'lucide-react';

const Dashboard: React.FC<{ user: UserProfile; refreshUser: () => void }> = ({ user, refreshUser }) => {
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [currentSermon, setCurrentSermon] = useState(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);

  useEffect(() => {
    if (Notification.permission === 'default') setShowNotifPrompt(true);
  }, []);

  const enableNotifications = async () => {
    await Notification.requestPermission();
    setShowNotifPrompt(false);
  };

  const handleLogout = () => signOut(auth);

  const handleAdminNav = (subTab: string) => {
    setActiveTab('admin');
    window.location.hash = `#admin/${subTab}`;
    setSidebarOpen(false);
  };

  return (
    <div className={`min-h-screen flex font-sans transition-colors duration-500 ${theme === 'dark'
      ? 'bg-black text-gray-100' // Deepest black for background
      : 'bg-gray-50 text-gray-900'
      }`}>

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-4 bottom-4 left-4 h-[calc(100vh-32px)] w-72 rounded-3xl z-50 transform transition-all duration-500 lg:translate-x-0 border ${sidebarOpen ? 'translate-x-4' : '-translate-x-[120%]'
        } ${theme === 'dark'
          ? 'bg-[#111] border-yellow-600/20 shadow-[0_0_30px_rgba(234,179,8,0.1)]' // Dark card, subtle gold glow
          : 'bg-white border-green-100 shadow-[0_20px_40px_rgba(22,163,74,0.1)]' // White card, subtle green shadow
        }`}>

        {/* Sidebar Header */}
        <div className="p-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Doxa Portal" className="w-10 h-10 object-contain" />
            <span className="font-serif font-bold text-xl tracking-tight bg-gradient-to-r from-green-700 to-yellow-500 bg-clip-text text-transparent drop-shadow-sm">Doxa Portal</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className={`lg:hidden p-2 rounded-lg transition-all duration-300 ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-green-50'
              }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Sidebar Nav */}
        <div className="px-4 py-2 h-[calc(100%-140px)] overflow-y-auto">

          {/* User Profile Card - High Contrast Pop */}
          <div className={`mb-8 p-4 rounded-2xl border cursor-pointer transition-all duration-300 hover:scale-105 ${theme === 'dark'
            ? 'bg-[#1a1a1a] border-yellow-500/30 hover:border-yellow-500 hover:shadow-lg hover:shadow-yellow-500/10' // Dark pop
            : 'bg-white border-green-200 shadow-md hover:shadow-xl hover:shadow-green-900/10 hover:border-green-400' // Light pop
            } flex items-center gap-3`}
            onClick={() => { setActiveTab('profile'); setSidebarOpen(false); }}>
            <img
              src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`}
              className={`w-10 h-10 rounded-full border-2 shadow-sm ${theme === 'dark' ? 'border-yellow-500' : 'border-green-600'
                }`}
              alt=""
            />
            <div className="overflow-hidden">
              <p className={`font-bold text-sm truncate ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
                {user.displayName}
              </p>
              <p className={`text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-yellow-400' : 'text-green-600'
                }`}>
                {user.role}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            {[
              { id: 'home', icon: <Home size={20} />, label: 'Dashboard' },
              { id: 'sermons', icon: <BookOpen size={20} />, label: 'Sermons' },
              { id: 'events', icon: <CalendarIcon size={20} />, label: 'Events' },
              { id: 'testimonies', icon: <MessageCircle size={20} />, label: 'Testimonies' },
              { id: 'prayer', icon: <Heart size={20} />, label: 'Prayer Wall' },
              { id: 'quiz', icon: <Brain size={20} />, label: 'Bible Quiz' },
              { id: 'gallery', icon: <ImageIcon size={20} />, label: 'Gallery' },
            ].map((item) => (
              <SidebarItem
                key={item.id}
                icon={React.cloneElement(item.icon, {
                  color: activeTab === item.id
                    ? (theme === 'dark' ? '#EAB308' : '#16A34A') // Gold or Green Icon
                    : undefined
                })}
                label={item.label}
                active={activeTab === item.id}
                // Note: Ensure your SidebarItem component accepts specific classes or style overrides if possible. 
                // Since I can't see SidebarItem, I'm assuming it handles active states. 
                // If not, wrappers would be needed here.
                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
              />
            ))}

            {/* Admin Section */}
            {user.role === 'admin' && (
              <div className={`mt-8 pt-4 border-t transition-colors duration-300 ${theme === 'dark' ? 'border-gray-800' : 'border-green-100'
                }`}>
                <p className={`px-4 text-[10px] font-bold uppercase tracking-widest mb-3 ${theme === 'dark' ? 'text-gray-500' : 'text-green-800/60'
                  }`}>
                  Admin Panel
                </p>
                <SidebarItem
                  icon={<Shield size={20} />}
                  label="Overview"
                  active={activeTab === 'admin'}
                  onClick={() => { setActiveTab('admin'); setSidebarOpen(false); }}
                />
                <SidebarItem
                  icon={<Heart size={20} />}
                  label="Prayer Approvals"
                  active={activeTab === 'admin-prayers'}
                  onClick={() => { setActiveTab('admin-prayers'); setSidebarOpen(false); }}
                />
                <SidebarItem
                  icon={<CalendarIcon size={20} />}
                  label="Manage Events"
                  active={activeTab === 'admin-events'}
                  onClick={() => { setActiveTab('admin-events'); setSidebarOpen(false); }}
                />
                <SidebarItem
                  icon={<BookOpen size={20} />}
                  label="Manage Sermons"
                  active={activeTab === 'admin-sermons'}
                  onClick={() => { setActiveTab('admin-sermons'); setSidebarOpen(false); }}
                />
                <SidebarItem
                  icon={<Brain size={20} />}
                  label="Manage Quizzes"
                  active={activeTab === 'admin-quizzes'}
                  onClick={() => { setActiveTab('admin-quizzes'); setSidebarOpen(false); }}
                />
                <SidebarItem
                  icon={<ImageIcon size={20} />}
                  label="Manage Gallery"
                  active={activeTab === 'admin-gallery'}
                  onClick={() => { setActiveTab('admin-gallery'); setSidebarOpen(false); }}
                />
                <SidebarItem
                  icon={<MessageCircle size={20} />}
                  label="Testimonies"
                  active={activeTab === 'admin-testimonies'}
                  onClick={() => { setActiveTab('admin-testimonies'); setSidebarOpen(false); }}
                />
                <SidebarItem
                  icon={<Users size={20} />}
                  label="Manage Users"
                  active={activeTab === 'admin-users'}
                  onClick={() => { setActiveTab('admin-users'); setSidebarOpen(false); }}
                />
              </div>
            )}
          </nav>
        </div>

        {/* Logout Button */}
        <div className="absolute bottom-0 w-full p-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl transition-all duration-300 font-bold text-sm active:scale-95 bg-gradient-to-r from-green-700 to-yellow-500 text-white shadow-lg shadow-green-900/20 hover:shadow-xl hover:from-green-800 hover:to-yellow-600 transform hover:-translate-y-1"
          >
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden relative">

        {/* Header */}
        <header className={`sticky top-0 z-30 px-8 py-5 flex items-center justify-between transition-colors duration-500 backdrop-blur-md border-b ${theme === 'dark'
          ? 'bg-black/80 border-gray-800'
          : 'bg-white/90 border-green-100'
          }`}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className={`lg:hidden p-2 rounded-xl shadow-sm transition-all duration-300 hover:scale-110 ${theme === 'dark'
                ? 'bg-[#222] hover:bg-[#333] text-gray-300'
                : 'bg-white hover:bg-green-50 text-green-700 border border-green-100'
                }`}
            >
              <Menu size={20} />
            </button>

            {/* Search Bar */}
            <div className="relative hidden md:block group">
              <Search
                className={`absolute left-4 top-3 transition-colors duration-300 ${theme === 'dark'
                  ? 'text-gray-500 group-focus-within:text-yellow-400'
                  : 'text-gray-400 group-focus-within:text-green-600'
                  }`}
                size={18}
              />
              <input
                type="text"
                placeholder="Search anything..."
                className={`pl-12 pr-4 py-3 rounded-2xl text-sm focus:ring-2 shadow-sm w-72 transition-all duration-300 border focus:outline-none ${theme === 'dark'
                  ? 'bg-[#1a1a1a] text-white focus:ring-yellow-500/50 border-gray-800 focus:border-yellow-500/50 placeholder-gray-600'
                  : 'bg-white text-gray-900 focus:ring-green-500/50 border-green-200 focus:border-green-500 placeholder-gray-400'
                  }`}
              />
            </div>
          </div>

          {/* Right Side Icons */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className={`p-3 rounded-full shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-110 border ${theme === 'dark'
                ? 'bg-[#222] border-gray-700 hover:bg-[#333] text-yellow-400'
                : 'bg-white border-green-100 hover:bg-green-50 text-green-600'
                }`}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className={`p-3 rounded-full shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-110 relative border ${theme === 'dark'
                  ? 'bg-[#222] border-gray-700 hover:bg-[#333] text-gray-300'
                  : 'bg-white border-green-100 hover:bg-green-50 text-green-600'
                  }`}
              >
                <Bell size={20} />
                <span className={`absolute top-2 right-2.5 w-2 h-2 rounded-full border-2 animate-pulse ${theme === 'dark'
                  ? 'bg-yellow-400 border-black'
                  : 'bg-green-500 border-white'
                  }`}></span>
              </button>
              <NotificationPopover isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
            </div>
          </div>
        </header>

        {/* Notification Prompt */}
        {showNotifPrompt && (
          <div className={`mx-8 mt-4 p-4 rounded-xl shadow-xl flex justify-between items-center animate-fade-in-up transition-all duration-500 transform hover:scale-[1.01] border ${theme === 'dark'
            ? 'bg-[#1a1a1a] border-yellow-500/40 text-gray-100 shadow-yellow-500/5'
            : 'bg-gradient-to-r from-green-700 to-green-600 border-green-600 text-white shadow-green-900/20'
            }`}>
            <div className="flex items-center gap-3">
              <Bell className="animate-pulse text-yellow-400" size={20} />
              <div>
                <p className="font-bold">Stay Updated!</p>
                <p className="text-sm opacity-90">Enable notifications to never miss a sermon or event.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowNotifPrompt(false)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 hover:scale-105 ${theme === 'dark'
                  ? 'hover:bg-white/10 text-gray-400 hover:text-white'
                  : 'hover:bg-black/10 text-white'
                  }`}
              >
                Later
              </button>
              <button
                onClick={enableNotifications}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 hover:scale-105 shadow-md ${theme === 'dark'
                  ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                  : 'bg-white text-green-700 hover:bg-green-50'
                  }`}
              >
                Enable
              </button>
            </div>
          </div>
        )}

        {/* Page Content with Smooth Transitions */}
        <div className={`flex-1 overflow-y-auto p-4 md:p-8 pb-32 scroll-smooth transition-all duration-500 ${theme === 'dark' ? 'bg-black' : 'bg-gray-50'
          }`}>
          {/* 
            NOTE: The screens below (HomeScreen, SermonLibraryScreen, etc.)
            inherit the theme context. Ensure those components also use 
            'bg-white'/'bg-[#111]' logic instead of purples/grays for consistent design. 
          */}
          <div className="animate-fade-in-up">
            {activeTab === 'home' && <HomeScreen user={user} />}
            {activeTab === 'sermons' && <SermonLibraryScreen />}
            {activeTab === 'events' && <EventsCalendarScreen user={user} />}
            {activeTab === 'testimonies' && <TestimoniesScreen user={user} />}
            {activeTab === 'prayer' && <PrayerWallScreen user={user} />}
            {activeTab === 'quiz' && <QuizScreen />}
            {activeTab === 'gallery' && <GalleryScreen />}
            {activeTab === 'admin' && <AdminDashboardScreen />}
            {activeTab === 'profile' && <ProfileScreen user={user} refreshUser={refreshUser} />}

            {/* Admin Routes */}
            {activeTab === 'admin-prayers' && (
              <div className="max-w-4xl mx-auto py-8">
                <PrayerModeration />
              </div>
            )}
            {activeTab === 'admin-events' && (
              <div className="max-w-5xl mx-auto py-8">
                <EventManager />
              </div>
            )}
            {activeTab === 'admin-sermons' && <AdminSermonManager />}
            {activeTab === 'admin-testimonies' && <AdminTestimonyManager />}
            {activeTab === 'admin-users' && <AdminUserManager />}
            {activeTab === 'admin-quizzes' && <AdminQuizManager />}
            {activeTab === 'admin-gallery' && <AdminGalleryManager />}
          </div>
        </div>

        {/* Audio Player */}
        <GlobalAudioPlayer sermon={currentSermon} onClose={() => setCurrentSermon(null)} />
      </main>
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (uid: string, currentUser: any) => {
    try {
      const userDocRef = doc(db, "users", uid);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        const userData = userSnap.data() as any;
        setUser({
          uid,
          email: currentUser.email,
          displayName: userData.displayName || currentUser.displayName,
          photoURL: currentUser.photoURL,
          role: userData.role || 'member',
          phoneNumber: userData.phoneNumber,
          hostelName: userData.hostelName,
          dateOfBirth: userData.dateOfBirth
        });
      } else {
        setUser({
          uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
          role: 'member'
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        fetchUserData(firebaseUser.uid, firebaseUser);
      } else {
        setUser(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
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
    <ThemeProvider>
      {user ? (
        <Dashboard user={user} refreshUser={() => fetchUserData(user.uid, auth.currentUser)} />
      ) : (
        <UnauthenticatedView />
      )}
    </ThemeProvider>
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