import React, { useState, useMemo } from 'react';
import { collection, query, orderBy, addDoc, where, getDocs, writeBatch, updateDoc, arrayUnion, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirestoreQuery } from '../hooks';
import { UserProfile, CalendarEvent } from '../types';
import { Plus, Clock, Video, MapPin, Calendar as CalendarIcon, X, Bell } from 'lucide-react';

import { SkeletonCard, SectionHeader, LoadingSpinner, StatusModal } from '../components/UIComponents';

const EventsCalendarView: React.FC<{ user: UserProfile; onJoinLive?: (room: string) => void }> = ({ user, onJoinLive }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({ title: '', date: '', type: 'service', description: '', meetingLink: '' });
  const [status, setStatus] = useState<{ open: boolean, type: 'success' | 'error' | 'info', title: string, message: string } | null>(null);

  // Get local ISO-like string (YYYY-MM-DDTHH:mm) for comparison
  const nowStr = useMemo(() => {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    return (new Date(Date.now() - tzoffset)).toISOString().slice(0, 16);
  }, []);

  // Fetch all events and filter/sort in JS to avoid index issues
  const eventQ = useMemo(() => query(collection(db, 'events')), []);

  const { data: allEvents, loading, error } = useFirestoreQuery<CalendarEvent>(eventQ);

  const events = useMemo(() => {
    return allEvents
      .filter(ev => ev.date >= nowStr)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [allEvents, nowStr]);

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        <h3 className="font-bold">Error Loading Events</h3>
        <p>{error.message}</p>
      </div>
    );
  }

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
    try {
      await addDoc(collection(db, 'events'), { ...newEvent, createdBy: user.uid });
      setNewEvent({ title: '', date: '', type: 'service', description: '', meetingLink: '' });
      setIsModalOpen(false);
      setStatus({
        open: true,
        type: 'success',
        title: 'Event Launched',
        message: 'Your new event has been successfully coordinated and broadcasted.'
      });
    } catch (e) {
      setStatus({
        open: true,
        type: 'error',
        title: 'Launch Failed',
        message: 'Something went wrong while launching the event. Please try again.'
      });
    }
  };

  const addToCalendar = (event: CalendarEvent) => {
    // Generate .ics file content
    const startDate = new Date(event.date).toISOString().replace(/-|:|\.\d+/g, '');
    const endDate = new Date(new Date(event.date).getTime() + 3600000).toISOString().replace(/-|:|\.\d+/g, ''); // +1 hour

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `URL:${window.location.origin}`,
      `DTSTART:${startDate}`,
      `DTEND:${endDate}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.description}`,
      `LOCATION:${event.location || (event.meetingLink ? 'Digital Room' : 'Family Auditorium')}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${event.title.replace(/\s+/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRemind = async (event: CalendarEvent) => {
    // For now, we'll keep the logic but we could use a custom ChoiceModal if we had one.
    // However, since the user only asked for the "Create Event" popup, I'll stop here unless they want more.
    // But let's at least replace the alert with StatusModal at the end.

    const confirmChoice = window.confirm("Add this event to your calendar? (Best for mobile reminders)");

    if (confirmChoice) {
      addToCalendar(event);
      return;
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
          <CalendarIcon size={64} className="text-gray-200 dark:text-white/10 mb-6" />
          <h3 className="text-xl font-bold dark:text-white">No Upcoming Events</h3>
          <p className="text-gray-400 mt-2">Check back later for new updates.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {events.map((ev, index) => {
            const date = new Date(ev.date);
            const isLive = ev.meetingLink && ev.meetingLink.length > 0;
            return (
              <div
                key={ev.id}
                className="group relative glass-card card-pop glass-glow rounded-[2.5rem] overflow-hidden transition-all duration-500 animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Visual Accent */}
                <div className={`absolute top-0 inset-x-0 h-2 ${ev.type === 'service' ? 'bg-church-green' : ev.type === 'youth' ? 'bg-church-gold' : 'bg-blue-500'}`}></div>

                <div className="p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gray-50 dark:bg-white/5 rounded-2xl flex flex-col items-center justify-center border border-gray-100 dark:border-white/10 group-hover:bg-church-green/10 group-hover:border-church-green/20 transition-colors">
                        <span className="text-[9px] font-black text-church-green dark:text-church-gold uppercase tracking-tighter">{date.toLocaleString('default', { month: 'short' })}</span>
                        <span className="text-xl font-black dark:text-white leading-none">{date.getDate()}</span>
                      </div>
                      <div className="space-y-1">
                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${ev.type === 'service' ? 'bg-church-green/10 text-church-green' : 'bg-church-gold/10 text-church-gold'}`}>
                          {ev.type}
                        </span>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemind(ev)}
                      className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-church-gold transition-all active:scale-90"
                    >
                      <Bell size={18} />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tighter group-hover:text-church-green transition-colors">{ev.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed line-clamp-2">{ev.description}</p>
                  </div>

                  <div className="pt-4 border-t border-gray-50 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-400">
                      <MapPin size={14} className="text-church-green" />
                      <span className="text-[9px] font-black uppercase tracking-widest">{isLive ? 'Digital Room' : 'Family Auditorium'}</span>
                    </div>
                    {isLive ? (
                      <button
                        onClick={() => onJoinLive && onJoinLive(ev.meetingLink!)}
                        className="px-6 py-2.5 bg-red-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-all flex items-center gap-2"
                      >
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                        Join Live
                      </button>
                    ) : (
                      <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">In Person</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}


      {/* Add Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in p-0 md:p-6">
          <div className="bg-white dark:bg-[#0A0A0A] w-full max-w-xl rounded-t-[3rem] md:rounded-[3.5rem] border-t md:border border-white/20 dark:border-white/10 shadow-2xl relative overflow-hidden max-h-[95vh] flex flex-col animate-slide-up md:animate-bounce-in">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-church-green/10 to-transparent pointer-events-none"></div>

            <div className="p-8 md:p-12 relative flex-1 overflow-y-auto hide-scrollbar">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 p-3 hover:bg-gray-100 dark:hover:bg-white/5 rounded-2xl transition-all text-gray-400 active:scale-95"
              >
                <X size={24} />
              </button>

              <div className="mb-10 text-center md:text-left">
                <span className="px-3 py-1 bg-church-green/10 text-church-green text-[10px] font-black uppercase tracking-widest rounded-full mb-4 inline-block">Admin Action</span>
                <h3 className="text-3xl md:text-4xl font-black dark:text-white tracking-tighter uppercase mb-2">Create New Event</h3>
                <p className="text-gray-500 font-medium">Coordinate a session for the community.</p>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Event Title</label>
                  <input
                    className="w-full p-5 bg-gray-50 dark:bg-white/5 rounded-3xl border-2 border-transparent focus:border-church-green/30 transition-all outline-none font-bold text-lg dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-700"
                    placeholder="e.g. Weekly Sunday Service"
                    onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Date & Time</label>
                    <input
                      className="w-full p-5 bg-gray-50 dark:bg-white/5 rounded-3xl border-2 border-transparent focus:border-church-green/30 transition-all outline-none font-bold dark:text-white"
                      type="datetime-local"
                      onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Meeting Type</label>
                    <div className="relative">
                      <select
                        className="w-full p-5 bg-gray-50 dark:bg-white/5 rounded-3xl border-2 border-transparent focus:border-church-green/30 transition-all outline-none font-bold dark:text-white appearance-none cursor-pointer"
                        onChange={e => setNewEvent({ ...newEvent, type: e.target.value as any })}
                      >
                        <option value="service">Weekly Service</option>
                        <option value="youth">Youth Meeting</option>
                        <option value="outreach">Outreach Gathering</option>
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <Clock size={18} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Description</label>
                  <textarea
                    className="w-full p-5 bg-gray-50 dark:bg-white/5 rounded-3xl border-2 border-transparent focus:border-church-green/30 transition-all outline-none font-bold h-36 resize-none dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-700"
                    placeholder="Provide details about the service or gathering..."
                    onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                  />
                </div>

                <div className="p-8 bg-church-green/5 dark:bg-white/5 rounded-[2.5rem] border-2 border-church-green/10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-church-green/20 text-church-green flex items-center justify-center">
                      <Video size={20} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Digital Room</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Enable live interaction</p>
                    </div>
                  </div>
                  <input
                    className="w-full p-4 bg-white dark:bg-black/20 rounded-2xl border-2 border-church-green/10 focus:border-church-green transition-all outline-none font-bold text-sm dark:text-white"
                    placeholder="Room Slug (e.g. sunday-live)"
                    onChange={e => setNewEvent({ ...newEvent, meetingLink: e.target.value })}
                  />
                </div>

                <div className="flex flex-col md:flex-row gap-4 pt-4 pb-8 md:pb-0">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="order-2 md:order-1 flex-1 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-red-500 transition-colors"
                  >
                    Discard Changes
                  </button>
                  <button
                    onClick={handleCreate}
                    className="order-1 md:order-2 flex-[2] bg-church-green text-white py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-xl shadow-church-green/20 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Launch Event
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {status && (
        <StatusModal
          isOpen={status.open}
          onClose={() => setStatus(null)}
          type={status.type}
          title={status.title}
          message={status.message}
          actionLabel="Excellent"
        />
      )}
    </div>
  );
};

export default EventsCalendarView;
