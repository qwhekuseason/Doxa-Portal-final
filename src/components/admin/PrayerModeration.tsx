import React, { useState, useMemo } from 'react';
import { collection, query, where, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useFirestoreQuery } from '../../hooks';
import { PrayerRequest } from '../../types';
import { Check, X, Loader2, Heart, Lock, Globe } from 'lucide-react';

export const PrayerModeration: React.FC = () => {
    const q = useMemo(() => query(collection(db, 'prayer_requests'), where('approved', '==', false)), []);
    const { data: requests, loading, error } = useFirestoreQuery<PrayerRequest>(q);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const handleApprove = async (id: string) => {
        setProcessingId(id);
        try {
            await updateDoc(doc(db, 'prayer_requests', id), {
                approved: true
            });
        } catch (err) {
            console.error('Error approving request:', err);
            alert('Failed to approve request');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this specific prayer request?')) return;
        setProcessingId(id);
        try {
            await deleteDoc(doc(db, 'prayer_requests', id));
        } catch (err) {
            console.error('Error deleting request:', err);
            alert('Failed to delete request');
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-church-green" /></div>;
    if (error) return <div className="p-4 text-red-500 bg-red-50 rounded-lg">Error loading requests</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold font-serif dark:text-gray-100">Prayer Approvals</h2>
                    <p className="text-gray-500">Review and approve prayer requests</p>
                </div>
                <div className="bg-church-green/10 text-church-green px-4 py-2 rounded-full font-bold">
                    {requests.length} Pending
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {requests.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                        <Heart size={48} className="mx-auto mb-4 opacity-20" />
                        <p>No pending prayer requests</p>
                    </div>
                ) : (
                    requests.map(request => (
                        <div key={request.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 animate-fade-in-up">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-10 h-10 rounded-full bg-church-gold/10 flex items-center justify-center text-church-gold font-bold">
                                        {request.authorName[0]}
                                    </div>
                                    <div>
                                        <h4 className="font-bold dark:text-gray-200">{request.authorName}</h4>
                                        <span className="text-xs text-gray-500">{new Date(request.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                {request.isPrivate ? (
                                    <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                                        <Lock size={12} /> Confidential
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                                        <Globe size={12} /> Public
                                    </span>
                                )}
                            </div>

                            <p className="text-gray-600 dark:text-gray-300 mb-6 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl text-sm leading-relaxed">
                                "{request.content}"
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleReject(request.id)}
                                    disabled={processingId === request.id}
                                    className="flex-1 flex items-center justify-center gap-2 p-2 rounded-xl border border-red-100 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                                >
                                    <X size={18} /> Reject
                                </button>
                                <button
                                    onClick={() => handleApprove(request.id)}
                                    disabled={processingId === request.id}
                                    className="flex-1 flex items-center justify-center gap-2 p-2 rounded-xl bg-church-green text-white hover:bg-emerald-700 transition-colors shadow-lg shadow-green-900/20 disabled:opacity-50"
                                >
                                    {processingId === request.id ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                                    Approve
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
