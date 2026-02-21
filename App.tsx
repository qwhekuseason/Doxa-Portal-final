import './src/index.css';
import React, { useEffect, useState, useRef } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot, updateDoc, arrayUnion, setDoc, serverTimestamp } from 'firebase/firestore';
import { getToken } from 'firebase/messaging';
import { auth, db, messaging } from './src/firebase';
import { UserProfile } from './src/types';
import AuthPage from './src/components/AuthPage';
import { ThemeProvider, useTheme } from './src/components/ThemeContext';
import { SystemSettingsProvider, useSystemSettings } from './src/components/SystemSettingsContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { updateSpiritualStreak } from './src/utils/streakService';

import {
  GlobalAudioPlayer,
  SidebarItem,
  LoadingSpinner,
  useClickOutside,
  ToastContainer,
  useToast,
  NotificationPopover,
  NotificationBanner
} from './src/components/UIComponents';
import { ReminderSystem } from './src/components/ReminderSystem';
import { LivePulse } from './src/components/LivePulse';
import { DoxaAI } from './src/components/DoxaAI';
import { PrayerAlarmOverlay } from './src/components/PrayerAlarmOverlay';
import { WATCHES, getCurrentWatchIndex } from './src/utils/watchUtils';
import { useUnreadDMs } from './src/hooks/useUnreadDMs';
import { useNotifications } from './src/hooks/useNotifications';
// Lazy load Screen Components
const AdminDashboardScreen = React.lazy(() => import('./src/screens/AdminDashboardScreen')) as React.FC<any>;
const QuizScreen = React.lazy(() => import('./src/screens/QuizScreen'));
const ChatContainer = React.lazy(() => import('./src/screens/ChatContainer'));
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
const LibraryScreen = React.lazy(() => import('./src/screens/LibraryScreen'));
const PrayerWallScreen = React.lazy(() => import('./src/screens/PrayerWallScreen'));
const ServiceReviewScreen = React.lazy(() => import('./src/screens/ServiceReviewScreen'));
const AttendanceAnalysis = React.lazy(() => import('./src/components/admin/AttendanceAnalysis').then(m => ({ default: m.AttendanceAnalysis })));
const ReadingPlanScreen = React.lazy(() => import('./src/screens/ReadingPlanScreen'));
// Lazy load Admin Components
const StoryManager = React.lazy(() => import('./src/components/admin/StoryManager'));
const LibraryManager = React.lazy(() => import('./src/components/admin/LibraryManager').then(m => ({ default: m.LibraryManager })));
const ServiceReviewManager = React.lazy(() => import('./src/components/admin/ServiceReviewManager').then(m => ({ default: m.ServiceReviewManager })));
const PrayerModeration = React.lazy(() => import('./src/components/admin/PrayerModeration').then(m => ({ default: m.PrayerModeration })));
const EventManager = React.lazy(() => import('./src/components/admin/EventManager').then(m => ({ default: m.EventManager })));
const LiveRoomManager = React.lazy(() => import('./src/components/admin/LiveRoomManager').then(m => ({ default: m.LiveRoomManager })));

// Admin Views
const AdminSermonManager = React.lazy(() => import('@/src/components/admin/SermonManager').then(m => ({ default: m.AdminSermonManager })));
const AdminUserManager = React.lazy(() => import('@/src/components/admin/UserManager').then(m => ({ default: m.AdminUserManager })));
const AdminTestimonyManager = React.lazy(() => import('@/src/components/admin/TestimonyManager').then(m => ({ default: m.AdminTestimonyManager })));
const AdminQuizManager = React.lazy(() => import('@/src/components/admin/QuizManager').then(m => ({ default: m.AdminQuizManager })));
const AdminGalleryManager = React.lazy(() => import('@/src/components/admin/GalleryManager').then(m => ({ default: m.AdminGalleryManager })));
const AdminSettingsManager = React.lazy(() => import('@/src/components/admin/SystemSettingsManager').then(m => ({ default: m.AdminSettingsManager })));
const AdminStudyPlanManager = React.lazy(() => import('@/src/components/admin/StudyPlanManager').then(m => ({ default: m.AdminStudyPlanManager })));
const AdminReadingPlanManager = React.lazy(() => import('@/src/components/admin/ReadingPlanManager').then(m => ({ default: m.AdminReadingPlanManager })));



// Icons
import {
  Bell, Search, Sun, Moon, Brain, ImageIcon, Users,
  MessageCircle, Settings, Video, Headphones, Milestone, Book,
  Home, Heart, Calendar as CalendarIcon, Shield, BookOpen, LogOut, X, Menu, Cake, ChevronRight, ChevronLeft, PenTool, Activity, MessageSquare, Camera, Coins, Hand, Library, Star, Target
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'home', icon: <Home size={20} />, label: 'Home' },
  { id: 'prayer', icon: <Hand size={20} />, label: 'Prayer' },
  { id: 'bible', icon: <Book size={20} />, label: 'Bible' },
  { id: 'reading-plans', icon: <Target size={20} />, label: 'Plans' },
  { id: 'bible-study', icon: <PenTool size={20} />, label: 'Study' },
  { id: 'sermons', icon: <Headphones size={20} />, label: 'Sermons' },
  { id: 'live', icon: <Video size={20} />, label: 'Live' },
  { id: 'chat', icon: <MessageSquare size={20} />, label: 'Chat' },
  { id: 'stories', icon: <Camera size={20} />, label: 'Stories' },
  { id: 'testimonies', icon: <MessageCircle size={20} />, label: 'Testimonies' },
  { id: 'quiz', icon: <Brain size={20} />, label: 'Quiz' },
  { id: 'journey', icon: <Milestone size={20} />, label: 'Journey' },
  { id: 'events', icon: <CalendarIcon size={20} />, label: 'Events' },
  { id: 'giving', icon: <Coins size={20} />, label: 'Giving' },
  { id: 'library', icon: <Library size={20} />, label: 'Library' },
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
  { id: 'admin-reading-plans', icon: <Target size={20} />, label: 'Reading Plans' },
  { id: 'admin-users', icon: <Users size={20} />, label: 'Users' },
  { id: 'admin-gallery', icon: <ImageIcon size={20} />, label: 'Gallery' },
  { id: 'admin-stories', icon: <ImageIcon size={20} />, label: 'Stories' },
  { id: 'admin-testimonies', icon: <MessageCircle size={20} />, label: 'Testimonies' },
  { id: 'admin-library', icon: <Library size={20} />, label: 'Library' },
  { id: 'admin-attendance', icon: <Activity size={20} />, label: 'Attendance' },
  { id: 'admin-reviews', icon: <Star size={20} />, label: 'Reviews' },
  { id: 'admin-settings', icon: <Settings size={20} />, label: 'System Settings' },
];



const Dashboard: React.FC<{ user: UserProfile; refreshUser: () => void }> = ({ user, refreshUser }) => {
  const { theme, toggleTheme, setTheme } = useTheme();
  const { settings } = useSystemSettings();

  // Apply saved theme preference on mount/change
  useEffect(() => {
    if (user.themePreference && user.themePreference !== theme) {
      setTheme(user.themePreference);
    }
  }, [user.themePreference]);

  const { toasts, addToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Initialize from URL or default to 'home'
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('tab') || 'home';
    }
    return 'home';
  });

  // Keep track of visit history to intelligently handle the "Back" button
  const [navHistory, setNavHistory] = useState<string[]>([]);

  const [currentSermon, setCurrentSermon] = useState(null);
  const [liveRoom, setLiveRoom] = useState('');
  const [chatTarget, setChatTarget] = useState<{ uid: string; displayName: string; photoURL?: string } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [activeBanner, setActiveBanner] = useState<{ title: string; message: string; type: string } | null>(null);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isStoryOpen, setIsStoryOpen] = useState(false);
  const [reviewSessionId, setReviewSessionId] = useState<string | null>(null);
  const [alarmOpen, setAlarmOpen] = useState(false);
  const [lastNotifiedWatchIdx, setLastNotifiedWatchIdx] = useState(() => {
    return parseInt(localStorage.getItem('last_alarm_watch_idx') || '-1');
  });
  const [bibleContext, setBibleContext] = useState<{ book?: string, chapter?: number } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('reviewSession');
    if (sessionId) {
      setReviewSessionId(sessionId);
      setActiveTab('service-review');

      // Update URL to reflect the correct tab while keeping history consistent
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'service-review');
      window.history.replaceState({ tab: 'service-review' }, '', url.toString());
    }
  }, []);

  // Sync with Browser History (Back/Forward buttons & Gestures)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // When the user presses Back/Forward, update the UI
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab') || 'home';

      setActiveTab(tab);

      // Update our internal history tracker
      // If we are going back, we pop. If forward, we might not know,
      // but for simple "Back" button logic, clearing or reducing history is safer
      // to avoid infinite loops in custom back button logic.
      setNavHistory(prev => prev.length > 0 ? prev.slice(0, -1) : []);
    };

    window.addEventListener('popstate', handlePopState);

    // Ensure the initial URL has the tab param if it's missing (for consistency)
    const params = new URLSearchParams(window.location.search);
    if (!params.has('tab')) {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'home');
      window.history.replaceState({ tab: 'home' }, '', url.toString());
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Custom Navigation function that integrates with History API
  const navigate = (tab: string, context?: any) => {
    if (tab === activeTab && !context) return;

    // Handle Bible navigation with context
    if (tab === 'bible' && context) {
      setBibleContext(context);
    } else if (tab !== 'bible') {
      setBibleContext(null);
    }

    // Push new state with URL param
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);

    // Add context to URL if it's a deep link (optional but good for reload)
    if (context?.book) url.searchParams.set('book', context.book);
    if (context?.chapter) url.searchParams.set('chapter', context.chapter.toString());

    window.history.pushState({ tab, ...context }, '', url.toString());

    setNavHistory(prev => [...prev, activeTab]);
    setActiveTab(tab);
  };

  const goBack = () => {
    if (navHistory.length > 0) {
      // Use browser back if we have history
      window.history.back();
    } else {
      // Fallback for deep links: Go Home
      navigate('home');
    }
  };

  const startChat = (target: { uid: string; displayName: string; photoURL?: string }) => {
    setChatTarget(target);
    setIsChatOpen(true);
    navigate('chat');
  };

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const unreadDMs = useUnreadDMs(user?.uid);
  const { notifications, unreadCount } = useNotifications(user?.uid, user?.role === 'admin');

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      const timer = setTimeout(() => setShowNotifPrompt(true), 15000); // Show prompt after 15s
      return () => clearTimeout(timer);
    }
  }, []);

  // Unread count sync is handled by useNotifications hook
  useEffect(() => {
    // We no longer sync to a local activeBanner state as per user request to remove in-app banners
  }, [notifications]);

  // Refs for click outside
  const settingsRef = useRef<HTMLDivElement>(null);
  const adminMenuRef = useRef<HTMLDivElement>(null);

  // Update Online Status
  useEffect(() => {
    if (!user?.uid) return;
    const userRef = doc(db, 'users', user.uid);

    const setStatus = (status: boolean) => {
      if (!auth.currentUser || auth.currentUser.uid !== user.uid) return;
      updateDoc(userRef, {
        isOnline: status,
        lastActive: serverTimestamp()
      }).catch(err => {
        // Silently ignore permissions errors that happen on logout/unmount
        if (err.code !== 'permission-denied') {
          console.error("Status update error:", err);
        }
      });
    };

    setStatus(true);

    const handleVisibilityChange = () => {
      setStatus(document.visibilityState === 'visible');
    };

    window.addEventListener('beforeunload', () => setStatus(false));
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      setStatus(false);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.uid]);

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

  // Prayer Alarm Global In-App Monitor
  useEffect(() => {
    if (!user?.uid) return;

    const checkWatch = () => {
      const now = new Date();
      const currentIdx = getCurrentWatchIndex(now);
      const isNight = now.getHours() >= 21 || now.getHours() < 6;

      // If notifications are enabled for watches
      const notificationsEnabled = localStorage.getItem('watchNotifications') !== 'false';

      if (notificationsEnabled && currentIdx !== lastNotifiedWatchIdx) {
        // Only show alarm if user is not already in prayer wall or live session (to avoid interruption)
        if (activeTab !== 'prayer' && activeTab !== 'live') {
          setAlarmOpen(true);
        }
        setLastNotifiedWatchIdx(currentIdx);
        localStorage.setItem('last_alarm_watch_idx', currentIdx.toString());
      }
    };

    // Check every 30 seconds
    const interval = setInterval(checkWatch, 30000);
    checkWatch(); // Initial check

    return () => clearInterval(interval);
  }, [user?.uid, lastNotifiedWatchIdx, activeTab]);

  const handleLogout = () => signOut(auth);

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
    } catch (err: any) {
      if (err.name === 'SecurityError') {
        console.warn("FCM Registration blocked: Service Workers require a secure context (HTTPS or localhost). Push notifications will not be available on this origin.");
      } else {
        console.error("FCM Registration error:", err);
      }
    } finally {
      setShowNotifPrompt(false);
    }
  };

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
      <div className="relative">
        <button
          onClick={() => setNotificationsOpen(!notificationsOpen)}
          className={`p-3 rounded-2xl transition-all hover:scale-105 active:scale-95 border group ${notificationsOpen ? 'bg-church-green text-white border-church-green shadow-lg shadow-church-green/20' : theme === 'dark' ? 'bg-white/5 border-white/5 text-gray-400' : 'bg-gray-50 border-gray-100 text-gray-400'}`}
        >
          <Bell size={20} className={unreadCount > 0 ? 'animate-bell' : ''} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[9px] font-black rounded-full border-2 border-white dark:border-black flex items-center justify-center animate-bounce shadow-lg">
              {unreadCount}
            </span>
          )}
        </button>

        <NotificationPopover
          isOpen={notificationsOpen}
          onClose={() => setNotificationsOpen(false)}
          onClear={() => { /* Handled locally in Popover */ }}
          userId={user.uid}
          isAdmin={user.role === 'admin'}
          onNavigate={navigate}
          onMessageUser={startChat}
        />
      </div>

      {/* Settings Menu */}
      <div className="relative" ref={settingsRef}>
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className={`p-3 rounded-2xl transition-all hover:scale-105 active:scale-95 border ${theme === 'dark' ? 'bg-white/5 border-white/5 text-gray-400' : 'bg-green-50/50 border-green-100 text-church-green shadow-sm'}`}
        >
          <Settings size={20} />
        </button>

        {settingsOpen && (
          <div className="absolute top-full right-0 mt-4 w-72 p-2 glass-card rounded-3xl shadow-premium z-[60] flex flex-col gap-1 animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5 mb-2">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Preferences</p>
            </div>

            <button
              onClick={() => { navigate('profile'); setSettingsOpen(false); }}
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
        onClick={() => navigate('profile')}
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
    <div className={`min-h-screen flex font-sans transition-colors duration-500 relative ${theme === 'dark' ? 'bg-[#050505] text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      {/* Dynamic Atmospheric Blobs */}
      <div className="glass-bg">
        <div className="liquid-bg"></div>
        <div className="blob w-[500px] h-[500px] bg-church-green/20 -top-20 -left-20 animate-blob"></div>
        <div className="blob w-[400px] h-[400px] bg-church-gold/20 top-1/2 -right-20 animate-blob" style={{ animationDelay: '-3s' }}></div>
        <div className="blob w-[600px] h-[600px] bg-blue-500/10 -bottom-32 left-1/3 animate-blob" style={{ animationDelay: '-5s' }}></div>
      </div>

      {/* --- Desktop Sidebar (Persistent) --- */}
      <aside className="hidden lg:flex flex-col w-64 xl:w-72 sticky top-0 h-screen glass-sidebar z-50">
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-church-green/10 to-transparent pointer-events-none"></div>

        {/* Sidebar Logo */}
        <div className="p-8 pb-10 flex items-center gap-4 cursor-pointer group relative z-10 glass-sheen" onClick={() => navigate('home')}>
          <div className="w-12 h-12 bg-church-green rounded-2xl flex items-center justify-center shadow-lg shadow-church-green/30 group-hover:scale-110 transition-transform duration-500">
            <img src="/logo.png" alt="" className="w-7 h-7 object-contain" />
          </div>
          <div>
            <span className="font-sans font-black text-xl dark:text-white uppercase tracking-tighter leading-none block">{settings?.systemName || 'Doxa Portal'}</span>
            <span className="text-[9px] font-black text-church-green uppercase tracking-[0.3em] mt-1 block opacity-60">Family</span>
          </div>
        </div>



        {/* Sidebar Navigation */}
        <div className="flex-1 overflow-y-auto px-6 space-y-1 hide-scrollbar">
          <div className="px-5 py-3 text-[10px] font-black uppercase text-gray-400 tracking-widest opacity-60">Community</div>
          {NAV_ITEMS.filter(item => {
            if (item.id === 'chat' && settings?.enableChat === false) return false;
            if (item.id === 'live' && settings?.enableLive === false) return false;
            if (item.id === 'gallery' && settings?.enableGallery === false) return false;
            return true;
          }).map(item => (
            <SidebarItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.id}
              onClick={() => { navigate(item.id); setSidebarOpen(false); }}
              badge={item.id === 'chat' ? unreadDMs : undefined}
            />
          ))}

          {settings.enableAI && (
            <div className="p-2">
              <DoxaAI user={user} />
            </div>
          )}

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
        <aside className={`absolute top-0 left-0 bottom-0 w-[85%] max-w-[300px] glass-sidebar shadow-2xl transform transition-transform duration-500 cubic-bezier(0.2, 0.8, 0.2, 1) z-[210] ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col overflow-hidden`}>
          <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-white/20 dark:bg-black/20 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-church-green rounded-xl flex items-center justify-center shadow-lg shadow-church-green/20">
                <img src="/logo.png" className="w-6 h-6" alt="Logo" />
              </div>
              <span className="font-sans font-black text-base dark:text-white uppercase tracking-tighter">Doxa Portal</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-white/5 rounded-2xl transition-all active:scale-90 text-gray-500"><X size={20} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-1 hide-scrollbar">
            <div className="mb-8 p-5 rounded-[2rem] bg-church-green/5 dark:bg-church-green/10 border border-church-green/10 flex items-center gap-4 cursor-pointer active:scale-95 transition-all shadow-sm" onClick={() => { navigate('profile'); setSidebarOpen(false); }}>
              <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} className="w-14 h-14 rounded-2xl object-cover shadow-lg shadow-church-green/20" />
              <div className="flex-1 min-w-0">
                <div className="font-black text-xs dark:text-white uppercase tracking-tight truncate">{user.displayName}</div>
                <div className="text-[9px] uppercase font-black text-church-green tracking-widest mt-0.5">{user.role} Member</div>
              </div>
            </div>

            <div className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 opacity-60">Menu</div>
            {NAV_ITEMS.filter(item => {
              if (item.id === 'chat' && settings?.enableChat === false) return false;
              if (item.id === 'live' && settings?.enableLive === false) return false;
              if (item.id === 'gallery' && settings?.enableGallery === false) return false;
              return true;
            }).map(item => (
              <SidebarItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                active={activeTab === item.id}
                onClick={() => { navigate(item.id); setSidebarOpen(false); }}
                badge={item.id === 'chat' ? unreadDMs : undefined}
              />
            ))}

            {user.role === 'publicity' && (
              <>
                <div className="px-5 py-3 mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 opacity-60">Publicity Tools</div>
                <SidebarItem
                  icon={<Cake size={20} />}
                  label="Birthdays"
                  active={activeTab === 'birthdays'}
                  onClick={() => { navigate('birthdays'); setSidebarOpen(false); }}
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
                  onClick={() => { navigate('prayer-requests'); setSidebarOpen(false); }}
                />
              </>
            )}

            {settings.enableAI && (
              <div className="p-2">
                <DoxaAI user={user} />
              </div>
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
                    onClick={() => { navigate(item.id); setSidebarOpen(false); }}
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

          <div className="p-6 border-t border-gray-100 dark:border-white/5 text-center bg-white/10 dark:bg-black/10">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-loose">Securely Developed<br />© 2026 Doxa Portal v2.0</p>
          </div>
        </aside>
      </div>


      {/* --- Main Content --- */}
      <main className="flex-1 flex flex-col relative overflow-hidden">

        {/* Header - Fixed to Top (Mobile & Desktop) */}
        {(!isChatOpen && activeTab !== 'chat') && activeTab !== 'stories' && !isStoryOpen && (
          <header className={`fixed top-0 inset-x-0 lg:left-64 xl:left-72 z-40 px-5 pt-12 lg:pt-8 pb-5 flex items-center justify-between bg-white/95 dark:bg-[#050505]/95 backdrop-blur-xl border-b border-gray-100 dark:border-white/5 shadow-sm transition-all shadow-church-green/5`}>
            <div className="flex items-center gap-4">
              <div className="lg:hidden">
                {activeTab !== 'home' ? (
                  <button
                    onClick={goBack}
                    className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full bg-white/10 dark:bg-white/5 active:scale-90 transition-all text-gray-800 dark:text-white"
                  >
                    <ChevronLeft size={24} />
                  </button>
                ) : (
                  <button onClick={() => setSidebarOpen(true)} className="w-10 h-10 -ml-2 flex items-center justify-center hover:bg-white/10 dark:hover:bg-white/5 rounded-full transition-all active:scale-90 text-gray-800 dark:text-white">
                    <Menu size={24} />
                  </button>
                )}
              </div>

              <div className="flex flex-col">
                <span className="font-display font-black text-lg dark:text-white uppercase tracking-tighter leading-none">{settings?.systemName || 'Doxa Portal'}</span>
                <span className="text-[8px] font-black text-church-green tracking-[0.2em] uppercase opacity-80">Family</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <UserActions />
            </div>
          </header >
        )}

        {/* Content Scroll Area */}
        <div className={`flex-1 ${activeTab === 'chat' || activeTab === 'stories' || activeTab === 'live' ? 'overflow-hidden p-0' : 'overflow-y-auto p-4 md:p-6 pt-32 lg:pt-28 pb-safe'} scroll-smooth hide-scrollbar bg-gradient-to-b from-transparent to-gray-50/50 dark:to-transparent`} >
          <div className={`${(activeTab === 'chat' || activeTab === 'stories' || activeTab === 'live') ? 'max-w-none h-full' : 'max-w-7xl mx-auto'} ${isStoryOpen ? '' : 'animate-fade-in-up'} flex flex-col`}>
            {/* Desktop Navigation Helper (Back Button) */}
            {activeTab !== 'home' && activeTab !== 'chat' && activeTab !== 'stories' && (
              <div className="hidden lg:flex items-center gap-4 mb-6 sticky top-0 z-20 backdrop-blur-sm p-2 rounded-2xl">
                <button
                  onClick={goBack}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 hover:bg-church-green/10 text-gray-500 hover:text-church-green rounded-xl transition-all font-black text-[10px] uppercase tracking-widest border border-black/5 dark:border-white/5 active:scale-95 shadow-sm"
                >
                  <ChevronLeft size={14} /> Back
                </button>
              </div>
            )}

            {/* Notification Prompt Widget */}
            {showNotifPrompt && (
              <div className="mb-8 p-6 lg:rounded-[2rem] rounded-3xl shadow-premium bg-gradient-to-br from-church-green to-emerald-800 text-white flex flex-col md:flex-row justify-between items-center gap-4 overflow-hidden relative group">
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
            <div
              key={activeTab}
              className={`${activeTab === 'chat' || activeTab === 'stories' || activeTab === 'live' ? 'h-full' : 'min-h-[calc(100vh-200px)]'} animate-page-enter`}
            >
              <React.Suspense fallback={
                <div className="flex items-center justify-center p-20">
                  <LoadingSpinner />
                </div>
              }>
                {activeTab === 'home' && <HomeScreen user={user} onNavigate={(tab) => { navigate(tab); }} onMessageUser={startChat} onStoryStateChange={setIsStoryOpen} />}
                {activeTab === 'sermons' && <SermonLibraryScreen onPlay={(sermon) => setCurrentSermon(sermon)} />}
                {activeTab === 'chat' && <ChatContainer user={user} initialTarget={chatTarget} onClearTarget={() => setChatTarget(null)} onStateChange={setIsChatOpen} onMenuToggle={() => setSidebarOpen(true)} />}
                {activeTab === 'testimonies' && <TestimoniesScreen user={user} onMessageUser={startChat} />}
                {activeTab === 'quiz' && <QuizScreen user={user} onNavigate={(tab) => navigate(tab)} />}
                {activeTab === 'bible' && <BibleScreen user={user} context={bibleContext} onClearContext={() => setBibleContext(null)} />}
                {activeTab === 'reading-plans' && <ReadingPlanScreen user={user} onNavigate={navigate} />}
                {activeTab === 'bible-study' && <BibleStudyScreen user={user} />}
                {activeTab === 'journey' && <JourneyScreen user={user} />}
                {activeTab === 'gallery' && <GalleryScreen />}
                {activeTab === 'giving' && <GivingScreen user={user} />}
                {activeTab === 'library' && <LibraryScreen user={user} />}
                {activeTab === 'stories' && <StoriesScreen user={user} onMessageUser={startChat} onStateChange={setIsStoryOpen} onMenuToggle={() => setSidebarOpen(true)} />}
                {activeTab === 'birthdays' && <BirthdaysScreen user={user} />}
                {activeTab === 'prayer-requests' && <PrayerRequestsScreen user={user} />}
                {activeTab === 'prayer' && <PrayerWallScreen user={user} />}
                {activeTab === 'live' && <LiveSessionScreen user={user} onMenuToggle={() => setSidebarOpen(true)} />}
                {activeTab === 'admin' && <AdminDashboardScreen onNavigate={(tab) => navigate(tab)} addToast={addToast} />}
                {activeTab === 'profile' && <ProfileScreen user={user} refreshUser={refreshUser} />}
                {activeTab === 'events' && <EventsCalendarScreen user={user} />}
                {activeTab === 'service-review' && <ServiceReviewScreen user={user} sessionId={reviewSessionId || undefined} onBack={() => { setReviewSessionId(null); navigate('home'); }} />}

                {/* Admin Sub-Screens */}
                {activeTab === 'admin-prayers' && <div className="max-w-4xl mx-auto"><PrayerModeration /></div>}
                {activeTab === 'admin-events' && <div className="max-w-5xl mx-auto"><EventManager /></div>}
                {activeTab === 'admin-live-rooms' && <div className="max-w-6xl mx-auto"><LiveRoomManager /></div>}
                {activeTab === 'admin-sermons' && <AdminSermonManager />}
                {activeTab === 'admin-testimonies' && <AdminTestimonyManager />}
                {activeTab === 'admin-users' && <AdminUserManager />}
                {activeTab === 'admin-quizzes' && <AdminQuizManager />}
                {activeTab === 'admin-gallery' && <AdminGalleryManager />}
                {activeTab === 'admin-library' && <div className="max-w-6xl mx-auto"><LibraryManager /></div>}
                {activeTab === 'admin-study-plans' && <AdminStudyPlanManager />}
                {activeTab === 'admin-reading-plans' && <AdminReadingPlanManager />}
                {activeTab === 'admin-stories' && <div className="max-w-6xl mx-auto"><StoryManager /></div>}
                {activeTab === 'admin-attendance' && <div className="max-w-6xl mx-auto"><AttendanceAnalysis onBack={() => navigate('admin')} /></div>}
                {activeTab === 'admin-reviews' && <ServiceReviewManager />}
                {activeTab === 'admin-settings' && <AdminSettingsManager />}
              </React.Suspense>
            </div>
          </div>
        </div>

        {/* --- Mobile Bottom Navigation --- */}
        {!isChatOpen && activeTab !== 'stories' && !isStoryOpen && (
          <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 px-4 pb-10 pt-4 bg-gradient-to-t from-white via-white/40 to-transparent dark:from-black dark:via-black/40 dark:to-transparent pointer-events-none">
            <div className="flex items-center justify-around p-2 glass-morphic rounded-[2.5rem] pointer-events-auto max-w-sm mx-auto">
              {[
                { id: 'home', icon: <Home size={22} />, label: 'Home' },
                { id: 'sermons', icon: <Headphones size={22} />, label: 'Listen' },
                { id: 'bible', icon: <Book size={22} />, label: 'Bible' },
                { id: 'chat', icon: <MessageSquare size={22} />, label: 'Chat', badge: unreadDMs },
                { id: 'giving', icon: <Coins size={22} />, label: 'Give' }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className={`relative p-3.5 rounded-2xl flex flex-col items-center gap-1 spring-interaction ${activeTab === item.id ? 'text-church-green' : 'text-gray-400 opacity-60'}`}
                >
                  <div className={`transition-all ${activeTab === item.id ? 'translate-y-[-2px] scale-110 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]' : ''}`}>
                    {item.id === 'chat' && item.badge > 0 ? (
                      <div className="relative">
                        {item.icon}
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full border-2 border-white dark:border-black flex items-center justify-center">
                          {item.badge}
                        </span>
                      </div>
                    ) : item.icon}
                  </div>
                  {activeTab === item.id && (
                    <div className="absolute -bottom-1 w-1 h-1 bg-church-green rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse"></div>
                  )}
                </button>
              ))}
            </div>
          </nav>
        )}


      </main>

      {/* Audio Player Overlay */}
      <React.Suspense fallback={null}>
        <GlobalAudioPlayer sermon={currentSermon} onClose={() => setCurrentSermon(null)} />
      </React.Suspense>

      {/* Global Utilities */}
      <ToastContainer toasts={toasts} />
      <ReminderSystem userId={user.uid} />
      <LivePulse uid={user.uid} displayName={user.displayName} />
      {activeTab === 'home' && <DoxaAI user={user} />}

      <PrayerAlarmOverlay
        isOpen={alarmOpen}
        onClose={() => setAlarmOpen(false)}
        onJoin={() => {
          setAlarmOpen(false);
          navigate('prayer');
        }}
      />
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
            const nowIso = new Date().toISOString();
            const newUserProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'User',
              photoURL: firebaseUser.photoURL,
              role: firebaseUser.email === 'admin@gmail.com' ? 'admin' : 'member',
              isVerified: firebaseUser.emailVerified || firebaseUser.email === 'admin@gmail.com',
              stats: {},
              createdAt: nowIso,
              streak: { count: 0, lastChecked: '', best: 0 },
              isOnline: true,
              lastActive: nowIso
            };

            // Create in Firestore using serverTimestamp for accuracy
            setDoc(userDocRef, {
              ...newUserProfile,
              createdAt: serverTimestamp(),
              lastActive: serverTimestamp()
            }).catch(err => console.error("Error creating user profile:", err));

            // Set local state immediately for UI responsiveness
            setUser(newUserProfile);
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
      <SystemSettingsProvider>
        <ThemeProvider>
          {user ? (
            (user.isVerified === false && user.email !== 'admin@gmail.com') ? (
              <AuthPage initialMode="verify" />
            ) : mode === 'live_window' ? (
              <>
                <LiveSessionScreen initialRoom={initialRoom} user={user} autoJoin={true} />
                <LivePulse uid={user.uid} displayName={user.displayName} />
              </>
            ) : (
              <Dashboard user={user} refreshUser={() => { /* Real-time listener handles updates */ }} />
            )
          ) : (
            <UnauthenticatedView />
          )}
        </ThemeProvider>
      </SystemSettingsProvider>
    </ErrorBoundary>
  );
};

const UnauthenticatedView: React.FC = () => {
  const [view, setView] = useState<'landing' | 'login' | 'register' | 'service-review'>('landing');
  const [reviewSessionId, setReviewSessionId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('reviewSession');
    if (sessionId) {
      setReviewSessionId(sessionId);
      setView('service-review');
    }
  }, []);

  const handleNavigate = (page: 'login' | 'register') => {
    setView(page);
  }

  if (view === 'service-review') {
    return (
      <div className="min-h-screen bg-white dark:bg-[#050505] pt-12">
        <React.Suspense fallback={<div className="flex items-center justify-center p-20"><LoadingSpinner /></div>}>
          <ServiceReviewScreen
            user={null}
            sessionId={reviewSessionId || undefined}
            onBack={() => setView('landing')}
          />
        </React.Suspense>
      </div>
    );
  }

  if (view === 'landing') {
    return <LandingPage onNavigate={handleNavigate} />;
  }

  return <AuthPage initialMode={view} onBack={() => setView('landing')} />;
};

export default App;