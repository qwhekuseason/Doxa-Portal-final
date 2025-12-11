import React, { useState, useMemo } from 'react';
import { collection, query, orderBy, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirestoreQuery } from '../hooks';
import { UserProfile, CalendarEvent } from '../types';
import { Plus, Clock } from 'lucide-react';
import { SkeletonCard } from '../components/UIComponents';

const EventsCalendarView: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({ title: '', date: '', type: 'service', description: '' });

  const eventQ = useMemo(() => query(collection(db, 'events'), orderBy('date', 'asc')), []);
  const { data: events, loading } = useFirestoreQuery<CalendarEvent>(eventQ);

  const handleCreate = async () => {
    if (!newEvent.title || !newEvent.date) return;
    await addDoc(collection(db, 'events'), { ...newEvent, createdBy: user.uid });
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold font-serif dark:text-white">Events Calendar</h2>
          <p className="text-gray-500 mt-1">Join us in fellowship.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-church-green hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95">
          <Plus size={18} /> Add Event
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <SkeletonCard key={i} height="h-40" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map(ev => {
            const date = new Date(ev.date);
            return (
              <div key={ev.id} className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all group relative">
                <div className={`h-2 w-full ${ev.type === 'service' ? 'bg-church-green' : ev.type === 'youth' ? 'bg-church-gold' : 'bg-emerald-500'}`}></div>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-3 text-center min-w-[70px]">
                      <div className="text-xs font-bold text-red-500 uppercase">{date.toLocaleString('default', { month: 'short' })}</div>
                      <div className="text-2xl font-bold dark:text-white">{date.getDate()}</div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${ev.type === 'service' ? 'bg-church-muted text-church-green border-church-green/20' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{ev.type}</span>
                  </div>
                  <h3 className="text-xl font-bold font-serif dark:text-white mb-2 group-hover:text-church-green transition-colors">{ev.title}</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 line-clamp-2">{ev.description}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-400 font-bold uppercase tracking-wide">
                    <Clock size={14} /> {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <h3 className="text-2xl font-bold dark:text-white mb-6">Add Event</h3>
            <div className="space-y-4">
              <input className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border dark:border-gray-700" placeholder="Event Title" onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} />
              <input className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border dark:border-gray-700" type="datetime-local" onChange={e => setNewEvent({ ...newEvent, date: e.target.value })} />
              <textarea className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border dark:border-gray-700" placeholder="Description" onChange={e => setNewEvent({ ...newEvent, description: e.target.value })} />
              <select className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border dark:border-gray-700" onChange={e => setNewEvent({ ...newEvent, type: e.target.value as any })}>
                <option value="service">Service</option><option value="youth">Youth</option><option value="outreach">Outreach</option>
              </select>
              <button onClick={handleCreate} className="w-full bg-church-green text-white py-3 rounded-xl font-bold shadow-lg">Create Event</button>
              <button onClick={() => setIsModalOpen(false)} className="w-full text-gray-500 py-2">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsCalendarView;