import React, { useEffect, useRef } from 'react';
import { Loader2, ChevronRight, ArrowUpRight, Bell, Sun, Moon, Plus, Users, Calendar, Activity, TrendingUp, ChevronUp, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { useNotifications, DoxaNotification } from '../hooks/useNotifications';

// --- Hooks ---
export const useClickOutside = (ref: React.RefObject<HTMLElement>, handler: () => void) => {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
};

// --- Atomic Components ---

export const SkeletonCard: React.FC<{ height?: string }> = ({ height = "h-48" }) => (
  <div className={`bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse ${height} w-full relative overflow-hidden shadow-sm`}>
    <div className="absolute inset-0 shimmer-bg opacity-30"></div>
  </div>
);

export const LoadingSpinner: React.FC<{ size?: number; color?: string }> = ({ size = 64, color }) => {
  const sizePx = typeof size === 'number' ? `${size}px` : size;
  return (
    <div className="flex flex-col justify-center items-center p-8 gap-8 animate-page-enter">
      <div className="relative" style={{ width: sizePx, height: sizePx }}>
        <div className={`absolute inset-0 rounded-full border-[10px] ${color ? color.replace('text-', 'border-').replace('/20', '') + '/10' : 'border-church-green/10'} blur-xl`}></div>
        <div className={`w-full h-full border-[2px] ${color ? color.replace('text-', 'border-').replace('/20', '') + '/20' : 'border-church-green/20'} ${color ? color.replace('text-', 'border-') : 'border-t-church-green'} rounded-full animate-spin border-t-transparent shadow-[0_0_20px_rgba(22,163,74,0.3)]`}></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className={`animate-pulse ${color ? color.replace('border-', 'text-') : 'text-church-green'}`} size={size * 0.4} />
        </div>
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="text-[11px] font-black uppercase tracking-[0.4em] text-gray-900 dark:text-white animate-pulse">Initializing Portal</span>
        <div className="w-12 h-1 bg-church-green/20 rounded-full overflow-hidden">
          <div className="w-full h-full bg-church-green animate-shimmer scale-x-50 origin-left"></div>
        </div>
      </div>
    </div>
  );
};

export const SectionHeader: React.FC<{ title: string; subtitle?: string; icon?: React.ReactNode; action?: React.ReactNode }> = ({ title, subtitle, icon, action }) => (
  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 group">
    <div>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-1 bg-church-green rounded-full transition-all group-hover:w-10"></div>
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-church-green/60 uppercase">Doxa Module</span>
      </div>
      <div className="flex items-center gap-3">
        {icon && <div className="text-church-green transition-transform group-hover:scale-110 group-hover:rotate-6">{icon}</div>}
        <h2 className="text-2xl font-black font-sans dark:text-white tracking-tight uppercase">{title}</h2>
      </div>
      {subtitle && <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium max-w-md">{subtitle}</p>}
    </div>
    {action && <div className="flex-shrink-0 animate-fade-in">{action}</div>}
  </div>
);

export const PageHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="mb-10">
    <div className="flex items-center gap-3 mb-2">
      <div className="w-12 h-1 bg-gradient-to-r from-church-green to-emerald-500 rounded-full"></div>
      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-church-green/40">Action Center</span>
    </div>
    <h1 className="text-4xl font-black font-sans dark:text-white tracking-tighter">{title}</h1>
    {subtitle && <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium max-w-xl">{subtitle}</p>}
  </div>
);

export const FloatingSocialMenu: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, () => setIsOpen(false));

  return (
    <div ref={menuRef} className="fixed bottom-24 right-6 md:bottom-8 md:right-8 z-50 flex flex-col items-end gap-4">
      {/* Social Actions */}
      <div className={`flex flex-col gap-3 transition-all duration-500 ${isOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-90 pointer-events-none'}`}>
        <a href="https://wa.me/" target="_blank" rel="noopener noreferrer" className="w-14 h-14 bg-[#25D366] text-white rounded-2xl shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 group-hover:rotate-12 transition-transform"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>
        </a>
        <a href="https://youtube.com/" target="_blank" rel="noopener noreferrer" className="w-14 h-14 bg-[#FF0000] text-white rounded-2xl shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 group-hover:scale-110 transition-transform"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
        </a>
        <a href="https://vm.tiktok.com/" target="_blank" rel="noopener noreferrer" className="w-14 h-14 bg-black text-white rounded-2xl shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group border border-white/10">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 group-hover:bounce transition-transform"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" /></svg>
        </a>
      </div>

      {/* Main Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-3xl shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center border-t border-white/20 ${isOpen ? 'bg-black text-white' : 'bg-gradient-to-br from-church-green to-emerald-700 text-white shadow-church-green/30'}`}
      >
        <div className={`transition-transform duration-500 ${isOpen ? 'rotate-[135deg]' : 'rotate-0'}`}>
          <ChevronUp size={32} />
        </div>
      </button>
    </div>
  );
};

export const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: string;
  loading?: boolean;
  onClick?: () => void;
}> = ({ title, value, icon, color, trend, loading, onClick }) => {
  if (loading) return <SkeletonCard height="h-32" />;

  return (
    <div
      onClick={onClick}
      className={`glass-card p-8 rounded-[2.5rem] card-pop relative overflow-hidden group cursor-pointer border border-white/20 dark:border-white/5 spring-interaction ${onClick ? 'active:scale-95' : ''}`}
    >
      <div className={`absolute top-0 right-0 w-32 h-32 ${color} opacity-[0.03] dark:opacity-[0.05] rounded-full blur-3xl -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-[2000ms]`}></div>

      <div className="relative z-10 flex items-center gap-6">
        <div className={`w-16 h-16 rounded-2xl ${color} bg-opacity-10 dark:bg-opacity-20 flex items-center justify-center transition-all duration-700 group-hover:scale-110 group-hover:rotate-6`}>
          <div className={`${color.replace('bg-', 'text-')} group-hover:drop-shadow-[0_0_8px_currentColor]`}>
            {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 28 }) : icon}
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">{value}</h3>
            {trend && (
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${trend.startsWith('+') ? 'bg-church-green/10 text-church-green' : 'bg-rose-500/10 text-rose-500'} border border-current/10`}>
                {trend}
              </span>
            )}
          </div>
          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em] font-sans">{title}</p>
        </div>
      </div>
    </div>
  );
};

export const SidebarItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  badge?: number;
}> = ({ icon, label, active, onClick, badge }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-5 py-4 rounded-3xl spring-interaction group relative overflow-hidden ${active
      ? 'bg-church-green text-white shadow-heavy-green scale-[1.02] z-10'
      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-church-green hover:translate-x-2'
      }`}
  >
    <div className={`relative z-10 transition-all duration-700 ${active ? 'scale-110 drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]' : 'group-hover:scale-110 group-active:scale-90 opacity-60 group-hover:opacity-100'}`}>
      {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 20 }) : icon}
    </div>
    <span className={`relative z-10 font-black text-[10px] uppercase tracking-[0.2em] ${active ? 'opacity-100' : 'opacity-50 group-hover:opacity-100'}`}>{label}</span>
    <div className="ml-auto relative z-10">
      {badge !== undefined && badge > 0 ? (
        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${active ? 'bg-white text-church-green' : 'bg-red-500 text-white shadow-lg shadow-red-500/20 animate-pulse'}`}>
          {badge}
        </span>
      ) : active ? (
        <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_white] animate-pulse"></div>
      ) : null}
    </div>
  </button>
);

export const NotificationPopover: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onClear?: () => void;
  userId?: string;
  isAdmin?: boolean;
  onNavigate?: (tab: string) => void;
  onMessageUser?: (target: { uid: string; displayName: string; photoURL?: string }) => void;
}> = ({ isOpen, onClose, onClear, userId, isAdmin, onNavigate, onMessageUser }) => {
  const { notifications, markAsRead, clearAll, loading } = useNotifications(userId, isAdmin);
  const popoverRef = useRef<HTMLDivElement>(null);

  useClickOutside(popoverRef, onClose);

  const handleNotificationClick = (notif: DoxaNotification) => {
    markAsRead(notif.id);

    // Deep Linking Logic
    if (notif.category === 'message') {
      if (notif.targetId && onMessageUser) {
        onMessageUser({ uid: notif.targetId, displayName: notif.title.replace('📧 Message from ', '').replace('💬 ', '').split(' in ')[0] });
      } else if (onNavigate) {
        onNavigate('chat');
      }
    } else if (notif.category === 'sermon' && onNavigate) {
      onNavigate('sermons');
    } else if (notif.category === 'event' && onNavigate) {
      onNavigate('events');
    } else if (notif.category === 'testimony' && onNavigate) {
      onNavigate('testimonies');
    } else if (notif.category === 'prayer' && onNavigate) {
      onNavigate('prayer');
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div ref={popoverRef} className="fixed inset-x-4 top-20 md:absolute md:inset-auto md:top-full md:right-0 md:mt-3 md:w-80 glass-card rounded-3xl shadow-premium z-50 animate-fade-in-up overflow-hidden max-h-[80vh] flex flex-col">
      <div className="p-5 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
        <div>
          <h3 className="font-black text-xs uppercase tracking-[0.2em] text-gray-900 dark:text-white">Updates</h3>
          <p className="text-[10px] text-gray-400 font-bold mt-0.5">{notifications.filter(n => !n.read).length} new messages</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-colors text-gray-400">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="max-h-[400px] overflow-y-auto hide-scrollbar flex-1">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="animate-spin text-church-green mx-auto mb-2" size={24} />
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fetching Content...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <Bell className="text-gray-200 dark:text-gray-800 mb-4" size={48} />
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Notifications Cleared</p>
          </div>
        ) : (
          notifications.map(notif => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`p-5 border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-all ${!notif.read ? 'bg-church-green/5 dark:bg-church-green/10' : ''}`}
            >
              <div className="flex justify-between items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!notif.read ? 'bg-church-green animate-pulse' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                <div className="flex-1">
                  <p className={`text-sm text-gray-900 dark:text-white ${!notif.read ? 'font-black tracking-tight' : 'font-medium'}`}>{notif.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{notif.message}</p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-1 mt-3 opacity-40">
                <Calendar size={10} />
                <p className="text-[9px] font-bold uppercase tracking-tighter">
                  {notif.timestamp?.toDate ? notif.timestamp.toDate().toLocaleDateString() : 'New'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="p-4 border-t border-gray-100 dark:border-white/5 text-center bg-gray-50/30 dark:bg-white/5">
        <button
          onClick={() => { clearAll(); onClear?.(); }}
          className="text-[10px] font-black uppercase tracking-[0.2em] text-church-green hover:text-emerald-600 transition-colors"
        >
          Clear All Notifications
        </button>
      </div>
    </div>
  );
};


// --- Toast System ---
export interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export const useToast = () => {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = (message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  return { toasts, addToast };
};

export const ToastContainer: React.FC<{ toasts: Toast[] }> = ({ toasts }) => (
  <div className="fixed bottom-24 md:bottom-10 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 pointer-events-none w-full max-w-xs px-4">
    {toasts.map(toast => (
      <div
        key={toast.id}
        className={`px-8 py-4 rounded-2xl shadow-premium animate-in slide-in-from-bottom-5 pointer-events-auto flex items-center gap-4 border ${toast.type === 'success' ? 'bg-church-green text-white border-white/20' :
          toast.type === 'error' ? 'bg-red-600 text-white border-white/20' :
            toast.type === 'warning' ? 'bg-church-gold text-black border-black/10' :
              'bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-100 dark:border-white/10'
          }`}
      >
        {toast.type === 'success' && <CheckCircle2 size={20} />}
        {toast.type === 'error' && <AlertCircle size={20} />}
        {toast.type === 'warning' && <Sparkles size={20} />}
        <p className="text-xs font-black uppercase tracking-widest leading-tight">{toast.message}</p>
      </div>
    ))}
  </div>
);

export const NotificationBanner: React.FC<{
  notification: { title: string; message: string; type: string } | null;
  onClose: () => void;
}> = ({ notification, onClose }) => {
  if (!notification) return null;

  return (
    <div className="fixed top-4 inset-x-4 md:top-6 md:right-6 md:left-auto md:w-96 z-[300] animate-in slide-in-from-top-full duration-500">
      <div
        onClick={onClose}
        className="glass-card !bg-white/80 dark:!bg-gray-900/80 backdrop-blur-2xl rounded-[2rem] p-4 shadow-2xl border border-white/40 dark:border-white/10 flex gap-4 items-center cursor-pointer active:scale-95 transition-all"
      >
        <div className="w-12 h-12 bg-church-green rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-church-green/20">
          <img src="/logo.png" className="w-7 h-7" alt="" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-0.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-church-green">Doxa Notification</span>
            <span className="text-[9px] font-bold text-gray-400 uppercase">Now</span>
          </div>
          <p className="font-black text-sm text-gray-900 dark:text-white truncate tracking-tight">{notification.title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{notification.message}</p>
        </div>
        <div className="w-1 h-8 bg-gray-200 dark:bg-white/10 rounded-full"></div>
      </div>
    </div>
  );
};


export const BackToTop: React.FC = () => {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-24 right-24 hidden xl:flex w-14 h-14 bg-white dark:bg-gray-800 text-church-green rounded-2xl shadow-premium border border-gray-100 dark:border-white/5 items-center justify-center hover:-translate-y-2 transition-all active:scale-95 z-[40]"
    >
      <ChevronUp size={24} />
    </button>
  );
};

const X: React.FC<{ [key: string]: any }> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);

export const GlobalAudioPlayer: React.FC<{ sermon: any; onClose: () => void }> = ({ sermon, onClose }) => {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [currentTime, setCurrentTime] = React.useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (sermon && audioRef.current) {
      audioRef.current.play().catch(e => console.error("Auto-play blocked:", e));
      setIsPlaying(true);
    }
  }, [sermon]);

  if (!sermon) return null;

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
    setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const seekTo = (parseFloat(e.target.value) / 100) * duration;
    audioRef.current.currentTime = seekTo;
    setProgress(parseFloat(e.target.value));
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 glass-header text-white p-6 shadow-premium z-[100] animate-in fade-in slide-in-from-bottom-5">
      <audio
        ref={audioRef}
        src={sermon.audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5 flex-1 min-w-0 w-full md:w-auto">
          <div className="relative group">
            <img src={sermon.coverUrl} alt={sermon.title} className="w-16 h-16 rounded-2xl object-cover shadow-lg group-hover:scale-105 transition-transform" />
            <div className="absolute inset-0 bg-black/20 rounded-2xl flex items-center justify-center">
              {isPlaying && <Activity size={24} className="animate-pulse text-church-green" />}
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-church-green mb-1">Now Streaming</p>
            <p className="font-bold text-lg dark:text-white truncate tracking-tight">{sermon.title}</p>
            <p className="text-sm text-gray-500 font-medium truncate italic">with {sermon.speaker}</p>
          </div>
        </div>

        <div className="flex items-center gap-6 w-full md:w-auto">
          <div className="flex flex-col gap-2 flex-1 md:w-64">
            <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-tighter">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={progress || 0}
              onChange={handleSeek}
              className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-full appearance-none accent-church-green cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={togglePlay}
              className="w-14 h-14 bg-church-green hover:bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-church-green/30 transition-all hover:scale-105 active:scale-95"
            >
              {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
            </button>
            <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-2xl transition-all text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Play: React.FC<{ [key: string]: any }> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
);

const Pause: React.FC<{ [key: string]: any }> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
);


export const StatusModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ isOpen, onClose, type, title, message, actionLabel, onAction }) => {
  if (!isOpen) return null;

  const themes = {
    success: {
      icon: <CheckCircle2 size={48} />,
      color: "text-church-green",
      bg: "bg-church-green/10",
      accent: "bg-church-green",
      glow: "shadow-church-green/30"
    },
    error: {
      icon: <AlertCircle size={48} />,
      color: "text-red-500",
      bg: "bg-red-500/10",
      accent: "bg-red-500",
      glow: "shadow-red-500/30"
    },
    info: {
      icon: <Sparkles size={48} />,
      color: "text-church-gold",
      bg: "bg-church-gold/10",
      accent: "bg-church-gold",
      glow: "shadow-church-gold/30"
    }
  };

  const theme = themes[type];

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fade-in" onClick={onClose}></div>
      <div className="relative w-full max-w-sm glass-card !bg-white/80 dark:!bg-gray-900/80 backdrop-blur-2xl rounded-[3rem] p-10 flex flex-col items-center text-center shadow-2xl animate-bounce-in border border-white/40 dark:border-white/10">
        <div className={`w-24 h-24 ${theme.bg} ${theme.color} rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl ${theme.glow} animate-float`}>
          {theme.icon}
        </div>
        <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-4">{title}</h3>
        <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed mb-10">{message}</p>

        <div className="w-full space-y-3">
          {actionLabel && (
            <button
              onClick={() => { onAction?.(); onClose(); }}
              className={`w-full py-5 ${theme.accent} text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] shadow-xl ${theme.glow} hover:scale-[1.02] active:scale-95 transition-all`}
            >
              {actionLabel}
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full py-5 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white/40 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
