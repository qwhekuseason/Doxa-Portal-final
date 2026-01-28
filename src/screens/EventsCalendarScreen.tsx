import React, { useState, useMemo } from 'react';
import { collection, query, orderBy, addDoc, where, getDocs, writeBatch, updateDoc, arrayUnion, doc } from 'firebase/firestore';
import { db, messaging } from '../firebase';
import { useFirestoreQuery } from '../hooks';
import { UserProfile, CalendarEvent } from '../types';
import { Plus, Clock, Video, MapPin, Calendar as CalendarIcon, X, Bell } from 'lucide-react';
import { getToken } from 'firebase/messaging';
import { SkeletonCard, SectionHeader, LoadingSpinner } from '../components/UIComponents';

const EventsCalendarView: React.FC<{ user: UserProfile; onJoinLive?: (room: string) => void }> = ({ user, onJoinLive }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({ title: '', date: '', type: 'service', description: '', meetingLink: '' });

  // Get local ISO-like string (YYYY-MM-DDTHH:mm) for comparison
  const nowStr = useMemo(() => {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    return (new Date(Date.now() - tzoffset)).toISOString().slice(0, 16);
  }, []);

  // Filter events to only show upcoming ones
  const eventQ = useMemo(() => query(
    collection(db, 'events'),
    where('date', '>=', nowStr),
    orderBy('date', 'asc')
  ), [nowStr]);

  const { data: events, loading } = useFirestoreQuery<CalendarEvent>(eventQ);

  // Background cleanup for admins to physically delete old events
  React.useEffect(() => {
    if (user.role === 'admin') {
      const cleanup = async () => {
        try {
          const pastQ = query(collection(db, 'events'), where('date', '<', nowStr));
          const snapshot = await getDocs(pastQ);
          if (!snapshot.empty) {
            const batch = writeBatch(db);
            snapshot.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
            console.log(`Successfully cleared ${snapshot.size} past events.`);
          }
        } catch (e) {
          console.error('Error cleaning up past events:', e);
        }
      };
      cleanup();
    }
  }, [user.role, nowStr]);

  const handleCreate = async () => {
    if (!newEvent.title || !newEvent.date) return;
    await addDoc(collection(db, 'events'), { ...newEvent, createdBy: user.uid });
    setIsModalOpen(false);
  };

  const handleRemind = async (event: CalendarEvent) => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notification');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        const vapidKey = (import.meta as any).env.VITE_FIREBASE_VAPID_KEY;

        if (!vapidKey || vapidKey.includes('REPLACE')) {
          console.warn('VAPID key not configured. FCM tokens cannot be generated.');
          alert('Push reminders are currently unavailable - please configure VAPID key.');
          return;
        }

        const token = await getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration: registration
        });

        if (token) {
          await updateDoc(doc(db, 'users', user.uid), {
            fcmTokens: arrayUnion(token),
            [`reminders.${event.id}`]: true
          });
          alert(`Reminder set for "${event.title}"! You'll be notified.`);
        }
      } else {
        alert('Permission denied. We cannot enable reminders.');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to enable reminders. Check console.');
    }
  };

  return (
    <div className="space-y-10 animate-fade-in pb-10">
      <SectionHeader
        title="Events Calendar"
        subtitle="Stay connected with our community gatherings and spiritual services."
        action={
          user.role === 'admin' && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-church-green hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-3 shadow-premium transition-all active:scale-95 group"
            >
              <Plus size={20} className="group-hover:rotate-90 transition-transform" />
              <span className="text-xs uppercase tracking-widest">Add Event</span>
            </button>
          )
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => <SkeletonCard key={i} height="h-64" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-20 glass-card rounded-[2.5rem] flex flex-col items-center">
          <CalendarIcon size={64} className="text-gray-200 dark:text-gray-800 mb-6" />
          <h3 className="text-xl font-bold dark:text-white">No Upcoming Events</h3>
          <p className="text-gray-400 mt-2">Check back later for new updates.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
          {events.map((ev, index) => {
            const date = new Date(ev.date);
            const isLive = ev.meetingLink && ev.meetingLink.length > 0;
            return (
              <div
                key={ev.id}
                className="group glass-card rounded-[3rem] overflow-hidden shadow-premium hover:shadow-premium-green hover:-translate-y-3 transition-all duration-700 animate-fade-in-up flex flex-col h-full"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Visual Header Gradient */}
                <div className={`h-2.5 w-full ${ev.type === 'service' ? 'bg-church-green' : ev.type === 'youth' ? 'bg-church-gold' : 'bg-blue-500'}`}></div>

                <div className="p-8 flex-1 flex flex-col">
                  <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-5">
                      <div className="bg-gray-100 dark:bg-white/5 rounded-2xl p-4 text-center min-w-[70px] border border-gray-100 dark:border-white/5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-700 shadow-sm">
                        <div className="text-[10px] font-black text-church-green dark:text-church-gold uppercase tracking-[0.2em] mb-1">
                          {date.toLocaleString('default', { month: 'short' })}
                        </div>
                        <div className="text-3xl font-black dark:text-white leading-none tracking-tighter">
                          {date.getDate()}
                        </div>
                      </div>
                      <div>
                        <span className={`inline-flex items-center whitespace-nowrap px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border ${ev.type === 'service'
                          ? 'bg-church-green/10 text-church-green border-church-green/20'
                          : ev.type === 'youth'
                            ? 'bg-church-gold/10 text-church-gold border-church-gold/20'
                            : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                          }`}>
                          {ev.type === 'service' ? 'Service' : ev.type === 'youth' ? 'Youth' : 'Outreach'} Gathering
                        </span>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-2xl font-black dark:text-white mb-3 tracking-tighter group-hover:text-church-green transition-colors line-clamp-2 leading-tight">
                    {ev.title}
                  </h3>

                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-8 flex-1 line-clamp-3 leading-relaxed">
                    {ev.description}
                  </p>

                  <div className="space-y-4 mb-10 pt-6 border-t border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-3 text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center text-church-green">
                        <Clock size={16} />
                      </div>
                      <span>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {isLive && (
                      <div className="flex items-center gap-3 text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                        <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 animate-pulse">
                          <Video size={16} />
                        </div>
                        <span className="truncate">Digital Room: {ev.meetingLink}</span>
                      </div>
                    )}
                    <button
                      onClick={() => handleRemind(ev)}
                      className="flex items-center gap-3 text-[11px] font-black text-gray-400 hover:text-church-gold transition-colors uppercase tracking-widest"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                        <Bell size={16} />
                      </div>
                      <span>Sync Reminder</span>
                    </button>
                  </div>

                  {isLive && (
                    <button
                      onClick={() => onJoinLive && onJoinLive(ev.meetingLink!)}
                      className="w-full py-5 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-lg shadow-red-500/30 transition-all hover:scale-[1.03] active:scale-[0.97]"
                    >
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                      </span>
                      Join Service Now
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
          <div className="glass-card rounded-[3rem] w-full max-w-lg p-10 shadow-premium border-white/10 relative overflow-hidden">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400"
            >
              <X size={24} />
            </button>

            <div className="mb-8">
              <h3 className="text-3xl font-black dark:text-white tracking-tighter mb-2">Create New Event</h3>
              <p className="text-gray-500 font-medium">Schedule a collective meeting.</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-church-green uppercase tracking-[0.2em] ml-2">Event Title</label>
                <input
                  className="w-full p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 focus:border-church-green transition-all outline-none font-bold"
                  placeholder="e.g. Weekly Sunday Service"
                  onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-church-green uppercase tracking-[0.2em] ml-2">Date & Time</label>
                  <input
                    className="w-full p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 focus:border-church-green transition-all outline-none font-bold"
                    type="datetime-local"
                    onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-church-green uppercase tracking-[0.2em] ml-2">Event Type</label>
                  <select
                    className="w-full p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 focus:border-church-green transition-all outline-none font-bold appearance-none"
                    onChange={e => setNewEvent({ ...newEvent, type: e.target.value as any })}
                  >
                    <option value="service" className="dark:bg-gray-900">Weekly Service</option>
                    <option value="youth" className="dark:bg-gray-900">Youth Meeting</option>
                    <option value="outreach" className="dark:bg-gray-900">Outreach</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-church-green uppercase tracking-[0.2em] ml-2">Description</label>
                <textarea
                  className="w-full p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 focus:border-church-green transition-all outline-none font-bold h-32 resize-none"
                  placeholder="What is this event about?"
                  onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                />
              </div>

              <div className="p-6 bg-church-green/5 dark:bg-church-green/10 rounded-2xl border border-church-green/20">
                <div className="flex items-center gap-2 mb-3">
                  <Video size={18} className="text-church-green" />
                  <label className="text-[10px] font-black text-church-green uppercase tracking-[0.2em]">Live Interaction Room</label>
                </div>
                <input
                  className="w-full p-3 bg-white dark:bg-white/5 rounded-xl border border-church-green/20 focus:border-church-green transition-all outline-none font-bold text-sm"
                  placeholder="Room Name (e.g. sunday-service)"
                  onChange={e => setNewEvent({ ...newEvent, meetingLink: e.target.value })}
                />
                <p className="text-[10px] text-gray-500 font-bold mt-2 uppercase tracking-wide">Leave blank for physical-only events.</p>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Discard
                </button>
                <button
                  onClick={handleCreate}
                  className="flex-[2] bg-church-green text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-premium hover:bg-emerald-700 transition-all active:scale-95"
                >
                  Launch Event
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsCalendarView;
