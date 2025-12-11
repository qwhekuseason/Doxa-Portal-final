import React, { useState, useMemo } from 'react';
import { collection, query, orderBy, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useFirestoreQuery } from '../../hooks';
import { CalendarEvent } from '../../types';
import { Calendar, Trash2, Plus, MapPin, Loader2, Clock, Video } from 'lucide-react';

export const EventManager: React.FC = () => {
    const q = useMemo(() => query(collection(db, 'events'), orderBy('date', 'asc')), []);
    const { data: events, loading, error } = useFirestoreQuery<CalendarEvent>(q);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        date: '',
        type: 'service' as 'service' | 'youth' | 'outreach',
        location: '',
        meetingLink: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.date) return;

        setSubmitting(true);
        try {
            await addDoc(collection(db, 'events'), {
                ...formData,
                createdAt: new Date().toISOString(),
                createdBy: 'admin' // In real app, user.uid
            });
            setFormData({
                title: '',
                description: '',
                date: '',
                type: 'service',
                location: '',
                meetingLink: ''
            });
            alert('Event created successfully');
        } catch (err) {
            console.error(err);
            alert('Failed to create event');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this event?')) return;
        try {
            await deleteDoc(doc(db, 'events', id));
        } catch (err) {
            console.error(err);
            alert('Failed to delete event');
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Create Event Form */}
            <div className="lg:col-span-1">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 sticky top-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-church-green/10 flex items-center justify-center text-church-green">
                            <Calendar size={20} />
                        </div>
                        <h3 className="font-bold text-lg dark:text-white">New Event</h3>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Event Title</label>
                            <input
                                type="text"
                                required
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-church-green focus:border-transparent outline-none transition-all"
                                placeholder="e.g., Sunday Service"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date & Time</label>
                            <input
                                type="datetime-local"
                                required
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-church-green outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                            <select
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-church-green outline-none"
                            >
                                <option value="service">Church Service</option>
                                <option value="youth">Youth Event</option>
                                <option value="outreach">Outreach</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location (Optional)</label>
                            <div className="relative">
                                <MapPin size={16} className="absolute left-3 top-3 text-gray-400" />
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-church-green outline-none"
                                    placeholder="Main Auditorium"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-church-green outline-none h-24 resize-none"
                                placeholder="Event details..."
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-3 bg-church-green text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-green-900/20 flex justify-center items-center gap-2"
                        >
                            {submitting ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
                            Create Event
                        </button>
                    </form>
                </div>
            </div>

            {/* Events List */}
            <div className="lg:col-span-2 space-y-6">
                <h2 className="text-2xl font-bold font-serif dark:text-white">Upcoming Events</h2>

                {loading ? (
                    <div className="flex justify-center p-12"><Loader2 className="animate-spin text-church-green" size={32} /></div>
                ) : events.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                        <Calendar size={48} className="mx-auto mb-4 opacity-20" />
                        <p>No upcoming events scheduled</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {events.map(event => (
                            <div key={event.id} className="group flex flex-col md:flex-row gap-6 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all">
                                <div className="flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 bg-church-green/10 text-church-green rounded-xl">
                                    <span className="text-xs font-bold uppercase">{new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
                                    <span className="text-xl font-bold font-serif">{new Date(event.date).getDate()}</span>
                                </div>

                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-lg dark:text-white group-hover:text-church-green transition-colors">{event.title}</h3>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${event.type === 'youth' ? 'bg-purple-100 text-purple-700' :
                                            event.type === 'outreach' ? 'bg-blue-100 text-blue-700' :
                                                'bg-orange-100 text-orange-700'
                                            }`}>
                                            {event.type}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-2 mb-3">
                                        <span className="flex items-center gap-1"><Clock size={14} /> {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        {event.location && <span className="flex items-center gap-1"><MapPin size={14} /> {event.location}</span>}
                                        {event.meetingLink && <span className="flex items-center gap-1 text-red-500 font-bold"><Video size={14} /> LIVE: {event.meetingLink}</span>}
                                    </div>

                                    <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">{event.description}</p>
                                </div>

                                <div className="flex items-center">
                                    <button
                                        onClick={() => handleDelete(event.id)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        title="Delete Event"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
