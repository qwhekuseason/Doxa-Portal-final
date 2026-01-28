import React, { useMemo, useState } from 'react';
import { collection, query, orderBy, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirestoreQuery } from '../hooks';
import { PrayerRequest, UserProfile } from '../types';
import { Heart, Lock, Calendar, CheckCircle, Clock, Inbox, MailCheck } from 'lucide-react';
import { SkeletonCard, SectionHeader } from '../components/UIComponents';

interface PrayerRequestsScreenProps {
    user: UserProfile;
}

// Define query outside to avoid re-creation
const prayersQuery = query(
    collection(db, 'prayer_requests'),
    where('approved', '==', true),
    orderBy('createdAt', 'desc')
);

const PrayerRequestsScreen: React.FC<PrayerRequestsScreenProps> = ({ user }) => {
    const { data: allRequests, loading, error } = useFirestoreQuery<PrayerRequest>(prayersQuery);
    const [tab, setTab] = useState<'pending' | 'completed'>('pending');
    const [processingId, setProcessingId] = useState<string | null>(null);

    const filteredRequests = useMemo(() => {
        if (!allRequests) return [];
        // Filter by approved AND toggle based on completed status
        return allRequests.filter(req =>
            req.approved && (tab === 'completed' ? req.completed === true : !req.completed)
        );
    }, [allRequests, tab]);

    const handleMarkRead = async (id: string) => {
        setProcessingId(id);
        try {
            await updateDoc(doc(db, 'prayer_requests', id), {
                completed: true
            });
        } catch (err) {
            console.error('Error marking as read:', err);
            alert('Failed to mark as read');
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <SectionHeader title="Support Requests" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
                    <Heart className="text-red-600 dark:text-red-400" size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Error Loading Requests</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{(error as any)?.message || 'An unknown error occurred'}</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <SectionHeader
                    title="Support Center"
                    subtitle="Reviewing community support requests"
                />

                {/* Tab Switcher */}
                <div className="flex bg-gray-100 dark:bg-white/5 p-1.5 rounded-2xl border border-gray-200 dark:border-white/5">
                    <button
                        onClick={() => setTab('pending')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${tab === 'pending'
                            ? 'bg-white dark:bg-white/10 text-church-green shadow-sm'
                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                            }`}
                    >
                        <Inbox size={14} /> Unread
                    </button>
                    <button
                        onClick={() => setTab('completed')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${tab === 'completed'
                            ? 'bg-white dark:bg-white/10 text-church-gold shadow-sm'
                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                            }`}
                    >
                        <MailCheck size={14} /> Read
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredRequests.map((request) => (
                    <div
                        key={request.id}
                        className={`glass-card p-6 rounded-3xl border transition-all hover:scale-[1.02] ${request.isPrivate
                            ? 'border-church-gold/30 bg-church-gold/5'
                            : 'border-gray-200 dark:border-white/10'
                            }`}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl ${request.isPrivate
                                    ? 'bg-church-gold/10 text-church-gold'
                                    : 'bg-church-green/10 text-church-green'
                                    }`}>
                                    {request.isPrivate ? <Lock size={18} /> : <Heart size={18} />}
                                </div>
                                <div>
                                    <h3 className="font-black text-sm dark:text-white uppercase tracking-tight">
                                        {request.isPrivate ? 'Private Request' : request.authorName}
                                    </h3>
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">
                                        <Calendar size={10} />
                                        {new Date(request.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>

                            <div className="px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                <CheckCircle size={10} />
                                Approved
                            </div>
                        </div>

                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                            {request.content}
                        </p>

                        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-white/5 flex justify-between items-center">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400">
                                <Clock size={12} />
                                <span>{new Date(request.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>

                            {tab === 'pending' && (
                                <button
                                    onClick={() => handleMarkRead(request.id)}
                                    disabled={processingId === request.id}
                                    className="text-[10px] font-black text-church-green uppercase tracking-widest hover:text-emerald-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    {processingId === request.id ? 'Processing...' : (
                                        <>Mark as Read <MailCheck size={14} /></>
                                    )}
                                </button>
                            )}
                            {tab === 'completed' && (
                                <div className="flex items-center gap-1.5 text-[10px] font-black text-church-gold uppercase tracking-widest italic opacity-60">
                                    <CheckCircle size={14} /> Completed
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {filteredRequests.length === 0 && (
                <div className="text-center py-16">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-50 dark:bg-white/5 mb-6">
                        <Heart className="text-gray-300 dark:text-gray-600" size={40} />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">
                        No Requests Found
                    </h3>
                    <p className="text-sm text-gray-500 max-w-md mx-auto">
                        There are currently no active support requests to display.
                    </p>
                </div>
            )}
        </div>
    );
};

export default PrayerRequestsScreen;
