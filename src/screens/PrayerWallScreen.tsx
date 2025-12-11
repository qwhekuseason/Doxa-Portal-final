import React, { useState, useMemo } from 'react';
import { collection, query, where, orderBy, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirestoreQuery } from '../hooks';
import { UserProfile, PrayerRequest } from '../types';
import { Heart, Clock, Loader2, AlertTriangle } from 'lucide-react';
import { SkeletonCard } from '../components/UIComponents';

const PrayerWallView: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [newRequest, setNewRequest] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const requestQ = useMemo(() => query(
    collection(db, 'prayer_requests'),
    where('approved', '==', true),
    where('isPrivate', '==', false),
    orderBy('createdAt', 'desc')
  ), []);

  const { data: requests, loading, error } = useFirestoreQuery<PrayerRequest>(requestQ);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequest.trim()) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'prayer_requests'), {
        uid: user.uid,
        authorName: isPrivate ? 'Anonymous' : user.displayName || 'Anonymous',
        content: newRequest,
        isPrivate,
        approved: false,
        createdAt: new Date().toISOString()
      });
      setNewRequest('');
      alert("Prayer request submitted for approval.");
    } catch (e) { console.error(e); } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="bg-gradient-to-r from-green-800 to-emerald-600 rounded-3xl p-10 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/10 rounded-full blur-3xl -mr-16 -mt-16 animate-pulse-slow"></div>
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-3xl font-serif font-bold mb-4 text-yellow-400">Prayer Wall</h2>
          <p className="opacity-90 mb-8 font-light">"For where two or three gather in my name, there am I with them." - Matthew 18:20</p>
          <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 flex flex-col md:flex-row gap-2">
            <input
              value={newRequest}
              onChange={e => setNewRequest(e.target.value)}
              placeholder="Share your prayer request..."
              className="flex-1 bg-transparent border-none text-white placeholder-white/70 px-4 py-3 focus:ring-0 outline-none font-medium"
            />
            <div className="flex items-center gap-2 px-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} className="rounded text-yellow-400 focus:ring-offset-0 bg-transparent border-white/50" />
                <span>Private</span>
              </label>
              <button disabled={submitting} className="bg-white text-green-800 px-6 py-2.5 rounded-xl font-bold hover:bg-yellow-50 transition-colors shadow-lg active:scale-95">
                {submitting ? <Loader2 className="animate-spin" size={20} /> : 'Pray'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {error && error.message.includes('requires an index') && (
        <div className="p-4 bg-yellow-100 text-yellow-800 rounded-xl flex items-center gap-2">
          <AlertTriangle size={20} />
          <span>System Note: The Prayer Wall requires a database index. Please check your browser console for the creation link.</span>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <SkeletonCard key={i} height="h-32" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {requests.map(req => (
            <div key={req.id} className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Heart size={20} className="fill-current" />
                </div>
                <div>
                  <p className="font-serif text-lg text-gray-800 dark:text-gray-100 italic mb-3">"{req.content}"</p>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-yellow-400"></span>
                    {req.authorName}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
                    <Clock size={12} /> {new Date(req.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PrayerWallView;