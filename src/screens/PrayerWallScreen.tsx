import React, { useState, useMemo } from 'react';
import { collection, query, where, orderBy, addDoc, doc, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirestoreQuery } from '../hooks';
import { UserProfile, PrayerRequest } from '../types';
import { Heart, Clock, Loader2, AlertTriangle, Send, Shield, Info, CheckCircle } from 'lucide-react';
import { SkeletonCard, SectionHeader } from '../components/UIComponents';

// Define query outside to ensure stability
// Query will be defined inside component via useMemo to filter by user.uid

const PrayerWallView: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [newRequest, setNewRequest] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: requests, loading, error } = useFirestoreQuery<PrayerRequest>(
    useMemo(() => query(
      collection(db, 'prayer_requests'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    ), [user.uid])
  );

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
      setIsPrivate(false);
    } catch (e) { console.error(e); } finally { setSubmitting(false); }
  };

  const handlePray = async (request: PrayerRequest) => {
    if (!user) return;
    const hasPrayed = request.prayedBy?.includes(user.uid);
    const requestRef = doc(db, 'prayer_requests', request.id);

    try {
      await updateDoc(requestRef, {
        prayedBy: hasPrayed ? arrayRemove(user.uid) : arrayUnion(user.uid),
        prayedCount: hasPrayed ? increment(-1) : increment(1)
      });
    } catch (e) {
      console.error("Error updating prayer count:", e);
    }
  };

  return (
    <div className="space-y-12 animate-fade-in pb-10">
      <SectionHeader
        title="Prayer Portal"
        subtitle="Submit your prayer requests directly to our intercessory team. Your requests are kept strictly confidential."
      />

      {/* Hero Submission Section */}
      <section className="relative rounded-3xl overflow-hidden shadow-premium group">
        <div className="absolute inset-0 bg-gradient-to-br from-church-green to-emerald-900 group-hover:scale-105 transition-transform duration-[2000ms]"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-church-gold/10 rounded-full blur-3xl -mr-16 -mt-16 animate-pulse-slow"></div>

        <div className="relative z-10 p-6 md:p-10">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 text-church-gold">
                <Heart size={20} className="fill-current" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Community Interaction</span>
            </div>

            <h2 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tighter leading-tight">
              A Community <br className="hidden md:block" /> Built on <span className="text-gradient-gold">Faith.</span>
            </h2>

            <p className="text-base text-white/80 mb-8 font-medium leading-relaxed italic">
              "For where two or three are gathered in my name, there am I among them." <br className="md:inline hidden" /> — Matthew 18:20
            </p>

            <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-2xl">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <input
                    value={newRequest}
                    onChange={e => setNewRequest(e.target.value)}
                    placeholder="Share your prayer request..."
                    className="w-full bg-transparent border-none text-white placeholder-white/50 px-5 py-3 focus:ring-0 outline-none font-bold text-base"
                  />
                </div>

                <div className="flex items-center gap-3 px-3 bg-black/20 rounded-xl border border-white/5">
                  <label className="flex items-center gap-2 cursor-pointer group/toggle">
                    <div
                      onClick={(e) => { e.preventDefault(); setIsPrivate(!isPrivate); }}
                      className={`w-10 h-5 rounded-full relative transition-all duration-300 ${isPrivate ? 'bg-church-gold' : 'bg-white/20'}`}
                    >
                      <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-300 ${isPrivate ? 'translate-x-5' : ''}`}></div>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/80">Private</span>
                  </label>

                  <button
                    disabled={submitting || !newRequest.trim()}
                    className="bg-white text-church-green px-6 py-3 rounded-lg font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50 flex items-center gap-2"
                  >
                    {submitting ? <Loader2 className="animate-spin" size={14} /> : (
                      <>
                        <Send size={14} />
                        Submit Request
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/50 ml-4">
              <Shield size={12} />
              <span>Requests are moderated for safety and respect.</span>
            </div>
          </div>
        </div>
      </section>

      {error && error.message.includes('requires an index') && (
        <div className="p-6 glass-card border-yellow-500/20 bg-yellow-500/5 rounded-3xl flex items-center gap-4 animate-bounce">
          <div className="p-3 bg-yellow-500/10 text-yellow-500 rounded-2xl">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-yellow-600 dark:text-yellow-400">System Optimization Required</p>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">Please check your console to create the necessary Firestore index for the Prayer Wall.</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">My Requests</h3>
        <div className="px-4 py-2 bg-church-green/10 text-church-green rounded-full text-[10px] font-black uppercase tracking-widest">
          {requests.length} Total Requests
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => <SkeletonCard key={i} height="h-48" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
          {requests.map((req, index) => (
            <div
              key={req.id}
              className={`group glass-card p-8 rounded-[2.5rem] shadow-premium transition-all duration-700 flex flex-col animate-fade-in-up ${!req.approved ? 'border-dashed border-gray-300 dark:border-white/10 opacity-80' : 'border-white/40 dark:border-white/5'}`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-500 shadow-sm border ${req.approved ? 'bg-church-green/10 text-church-green border-church-green/5' : 'bg-church-gold/10 text-church-gold border-church-gold/5'}`}>
                  <Heart size={24} className={req.approved ? 'fill-current' : ''} />
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-1">
                    {req.approved ? 'Received & Active' : 'Sent - Under Review'}
                  </h4>
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${req.approved ? 'bg-church-green' : 'bg-church-gold animate-pulse'}`}></div>
                    <span className="text-[11px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-300">
                      {req.isPrivate ? 'Confidential' : 'Standard'} Request
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 relative">
                <p className="font-serif text-lg text-gray-800 dark:text-gray-100 italic leading-relaxed relative z-10">
                  {req.content}
                </p>
              </div>

              <div className="mt-8 pt-5 border-t border-gray-100 dark:border-white/5 flex items-center justify-between opacity-60">
                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-tighter">
                  <Clock size={10} />
                  {new Date(req.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>

                {req.completed && (
                  <div className="flex items-center gap-1.5 text-[9px] font-black text-church-green uppercase tracking-widest">
                    <CheckCircle size={10} /> Review Complete
                  </div>
                )}
              </div>
            </div>
          ))}
          {requests.length === 0 && (
            <div className="col-span-full py-20 text-center glass-card rounded-[3rem] border-dashed border-2">
              <Info size={40} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No submission history found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PrayerWallView;
