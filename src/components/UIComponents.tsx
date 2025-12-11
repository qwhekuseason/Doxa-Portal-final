import React from 'react';
import { Loader2, ChevronRight, ArrowUpRight, Bell, Sun, Moon, Plus } from 'lucide-react';

export const SkeletonCard: React.FC<{ height?: string }> = ({ height = "h-48" }) => (
  <div className={`bg-gray-100 dark:bg-gray-800 rounded-3xl animate-pulse ${height} w-full shadow-sm`}></div>
);

export const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center p-12">
    <Loader2 className="animate-spin text-church-gold" size={40} />
  </div>
);

export const FloatingSocialMenu: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
      {/* Social Actions */}
      <div className={`flex flex-col gap-3 transition-all duration-300 ${isOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-90 pointer-events-none'}`}>
        <a href="https://wa.me/" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-[#25D366] text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>
        </a>
        <a href="https://youtube.com/" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-[#FF0000] text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
        </a>
        <a href="https://vm.tiktok.com/" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-black text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" /></svg>
        </a>
      </div>

      {/* Main Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-gradient-to-r from-church-green to-church-gold text-white rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all flex items-center justify-center"
      >
        <div className={`transition-transform duration-300 ${isOpen ? 'rotate-45' : 'rotate-0'}`}>
          <Plus size={28} />
        </div>
      </button>
    </div>
  );
};

export const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  color: string;
  loading?: boolean;
  onClick?: () => void;
}> = ({ title, value, icon, trend, color, loading, onClick }) => {
  const colorBase = color.split('-')[1];

  if (loading) return <SkeletonCard height="h-32" />;

  return (
    <div onClick={onClick} className={`group relative bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden ${onClick ? 'cursor-pointer' : ''}`}>
      <div className={`absolute top-0 right-0 w-24 h-24 bg-${colorBase}-500/10 rounded-full blur-2xl -mr-6 -mt-6 transition-all group-hover:bg-${colorBase}-500/20`}></div>

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className={`p-3.5 rounded-2xl ${color} bg-opacity-10 dark:bg-opacity-20 text-${colorBase}-600 dark:text-${colorBase}-400 group-hover:scale-110 transition-transform duration-300`}>
            {React.isValidElement(icon)
              ? React.cloneElement(icon as React.ReactElement<any>, { size: 22 })
              : icon
            }
          </div>
          {trend && (
            <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-100 dark:bg-green-500/20 dark:text-green-400 px-2.5 py-1 rounded-full">
              <ArrowUpRight size={12} /> {trend}
            </span>
          )}
        </div>
        <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-1 tracking-tight">{value}</h3>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
      </div>
    </div>
  );
};

export const SidebarItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${active
      ? 'bg-church-green text-white shadow-lg shadow-church-green/25'
      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-church-green dark:hover:text-church-gold'
      }`}
  >
    {active && (
      <div className="absolute inset-0 bg-gradient-to-r from-church-green to-emerald-600 opacity-100 z-0"></div>
    )}
    <div className={`relative z-10 transition-transform duration-300 group-hover:scale-110 ${active ? 'text-white' : 'text-gray-500 group-hover:text-church-green dark:text-gray-400 dark:group-hover:text-church-gold'}`}>
      {icon}
    </div>
    <span className="relative z-10 font-medium tracking-wide text-sm">{label}</span>
    {active && <ChevronRight size={16} className="relative z-10 ml-auto opacity-70 animate-pulse" />}
  </button>
);

import { useNotifications } from '../hooks/useNotifications';

export const NotificationPopover: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { notifications, markAsRead, loading } = useNotifications();

  if (!isOpen) return null;

  return (
    <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 animate-fade-in-up overflow-hidden">
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
        <h3 className="font-bold text-gray-900 dark:text-white">Notifications</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <span className="sr-only">Close</span>
          &times;
        </button>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500 text-sm">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">No new notifications</div>
        ) : (
          notifications.map(notif => (
            <div
              key={notif.id}
              onClick={() => markAsRead(notif.id)}
              className={`p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${!notif.read ? 'bg-church-muted/50 dark:bg-church-green/10' : ''}`}
            >
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className={`text-sm text-gray-900 dark:text-white ${!notif.read ? 'font-bold' : 'font-medium'}`}>{notif.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{notif.message}</p>
                </div>
                {!notif.read && <span className="w-2 h-2 rounded-full bg-church-green mt-1.5 shrink-0"></span>}
              </div>
              <p className="text-xs text-gray-400 mt-2 text-right">
                {notif.timestamp?.toDate ? notif.timestamp.toDate().toLocaleDateString() : 'Just now'}
              </p>
            </div>
          ))
        )}
      </div>
      <div className="p-4 border-t border-gray-100 dark:border-gray-700 text-center">
        <button className="text-sm font-bold text-church-green dark:text-church-gold hover:underline">View All</button>
      </div>
    </div>
  );
};

export const GlobalAudioPlayer: React.FC<{ sermon: any; onClose: () => void }> = ({ sermon, onClose }) => {
  if (!sermon) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-church-green to-emerald-800 text-white p-6 shadow-2xl z-40">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <img src={sermon.coverUrl} alt={sermon.title} className="w-16 h-16 rounded-lg object-cover" />
          <div className="min-w-0">
            <p className="font-bold text-sm truncate">{sermon.title}</p>
            <p className="text-sm opacity-75 truncate">{sermon.preacher}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-white/20 rounded-full transition-colors">▶</button>
          <input type="range" min="0" max="100" className="w-32 h-1 rounded-full" />
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">✕</button>
        </div>
      </div>
    </div>
  );
};

