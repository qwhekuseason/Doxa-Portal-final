import React, { useMemo } from 'react';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirestoreQuery } from '../hooks';
import { PrayerRequest, UserProfile } from '../types';
import { Heart, Lock, Calendar, CheckCircle, Clock } from 'lucide-react';
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
    // Fetch all approved prayer requests OR requests that are private (since prayer role can see private)
    // Note: We'll fetch all and filter in client because Firestore logical OR with different fields is complex
    // For production with many records, this should be split into two queries or handled differently

    const { data: allRequests, loading, error } = useFirestoreQuery<PrayerRequest>(prayersQuery);

    const filteredRequests = useMemo(() => {
        if (!allRequests) return [];
        // Prayer team can see all requests that are either approved OR private
        // Basically they see everything except maybe rejected ones?
        // The requirement is "can also just view only prayer requests" implies seeing what needs prayer
        // Typically prayer team sees approved public AND approved private requests
        // Let's assume they see everything that is "approved" regardless of privacy
        // BUT usually prayer team also needs to see pending? For now let's show all APPROVED requests (both public and private)
        return allRequests.filter(req => req.approved);
    }, [allRequests]);

    if (loading) {
        return (
            <div className="space-y-6">
                <SectionHeader title="Prayer Requests" />
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
            <SectionHeader
                title="Prayer Room"
                subtitle="Interceding for our church family"
            />

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

                            <button className="text-[10px] font-black text-church-green uppercase tracking-widest hover:text-emerald-600 transition-colors">
                                Mark as Prayed
                            </button>
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
                        There are currently no active prayer requests to display.
                    </p>
                </div>
            )}
        </div>
    );
};

export default PrayerRequestsScreen;
