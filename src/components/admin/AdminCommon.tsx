import React, { useState, useEffect } from 'react';
import { query, collection, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { AppNotification } from '../../types';
import { Activity, Bell, Loader2 } from 'lucide-react';

// --- Reusable Admin Table ---
export const AdminTable: React.FC<{
    headers: string[];
    children: React.ReactNode;
}> = ({ headers, children }) => (
    <div className="overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-700 shadow-lg bg-white dark:bg-gray-800">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                <thead className="bg-gray-50/80 dark:bg-gray-900/50 backdrop-blur-sm text-xs uppercase font-bold text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                    <tr>
                        {headers.map((h, i) => (
                            <th key={i} className="px-6 py-5 tracking-wider">{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                    {children}
                </tbody>
            </table>
        </div>
    </div>
);

// --- Activity Feed ---
export const RecentActivityFeed: React.FC = () => {
    const [activities, setActivities] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchActivities = async () => {
            try {
                const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(5));
                const snapshot = await getDocs(q);
                setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as AppNotification)));
            } catch (e) {
                console.error("Failed to fetch activity feed", e);
            } finally {
                setLoading(false);
            }
        };
        fetchActivities();
    }, []);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm h-full">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2 font-serif">
                <Activity size={20} className="text-church-green" /> Recent Activity
            </h3>
            <div className="space-y-6">
                {loading ? (
                    <div className="flex justify-center py-4"><Loader2 className="animate-spin text-gray-400" /></div>
                ) : activities.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No recent activity recorded.</p>
                ) : (
                    activities.map((act) => (
                        <div key={act.id} className="flex gap-4 relative group">
                            <div className="absolute top-2 bottom-[-24px] left-[15px] w-px bg-gray-100 dark:bg-gray-700 -z-10 last:hidden group-last:hidden"></div>
                            <div className={`w-8 h-8 rounded-full ${act.type === 'success' ? 'bg-green-500' : act.type === 'warning' ? 'bg-orange-500' : 'bg-church-green'} text-white flex items-center justify-center shrink-0 shadow-md ring-4 ring-white dark:ring-gray-800 z-10`}>
                                <Bell size={14} />
                            </div>
                            <div className="pb-1">
                                <p className="text-sm text-gray-900 dark:text-white font-medium line-clamp-2">
                                    {act.title}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{new Date(act.createdAt).toLocaleDateString()} • {act.message}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
