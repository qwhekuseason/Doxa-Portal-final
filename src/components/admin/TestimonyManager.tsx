import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Testimony } from '../../types';
import { notifyTestimonyApproved } from '../../utils/notificationService';
import { CheckCircle, Trash2, Loader2 } from 'lucide-react';

export const AdminTestimonyManager: React.FC = () => {
    const [testimonies, setTestimonies] = useState<Testimony[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTestimonies = async () => {
        setLoading(true);
        try {
            // Fetch ONLY pending stories for moderation
            const q = query(collection(db, 'testimonies'), where('approved', '==', false), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            setTestimonies(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Testimony)));
        } catch (e) {
            console.error("Error fetching testimonies:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTestimonies(); }, []);

    const handleApprove = async (id: string) => {
        try {
            const testimony = testimonies.find(t => t.id === id);
            await updateDoc(doc(db, 'testimonies', id), { approved: true });
            // Send notification
            if (testimony) {
                await notifyTestimonyApproved(testimony.authorName);
            }
            fetchTestimonies();
        } catch (e) { console.error(e); alert("Failed to approve."); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this testimony?")) return;
        try {
            await deleteDoc(doc(db, 'testimonies', id));
            fetchTestimonies();
        } catch (e) { console.error(e); }
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <h3 className="text-xl font-bold dark:text-white font-serif">Pending Testimonies</h3>
            {loading ? <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div> :
                testimonies.length === 0 ? (
                    <div className="p-10 text-center bg-gray-50 dark:bg-gray-800 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 text-gray-500">
                        No pending testimonies to review.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {testimonies.map(t => (
                            <div key={t.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col md:flex-row justify-between gap-6">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="font-bold dark:text-white">{t.authorName}</span>
                                        <span className="text-xs text-gray-500">• {new Date(t.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-300 italic">"{t.content}"</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => handleApprove(t.id)} className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-xl font-bold text-sm hover:bg-green-200 transition-colors">
                                        <CheckCircle size={16} /> Approve
                                    </button>
                                    <button onClick={() => handleDelete(t.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
        </div>
    );
};
