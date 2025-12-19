import React, { useState, useMemo } from 'react';
import { collection, query, where, orderBy, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirestoreQuery } from '../hooks';
import { UserProfile, Testimony } from '../types';
import { MessageCircle, AlertTriangle, Quote, User, Clock, CheckCircle2, Send, Plus, Loader2 } from 'lucide-react';
import { SkeletonCard, SectionHeader } from '../components/UIComponents';

const TestimoniesView: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'public' | 'submit' | 'my'>('public');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const testimoniesQuery = useMemo(() => {
    if (activeTab === 'public') return query(collection(db, 'testimonies'), where('approved', '==', true), orderBy('createdAt', 'desc'));
    if (activeTab === 'my') return query(collection(db, 'testimonies'), where('uid', '==', user.uid), orderBy('createdAt', 'desc'));
    return null;
  }, [activeTab, user.uid]);

  const { data: testimonies, loading, error } = useFirestoreQuery<Testimony>(
    activeTab !== 'submit' ? testimoniesQuery : null
  );

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'testimonies'), {
        uid: user.uid,
        authorName: user.displayName || 'Anonymous',
        content,
        approved: false,
        createdAt: new Date().toISOString()
      });
      setContent('');
      setActiveTab('my');
    } catch (e) { console.error(e); } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-12 animate-fade-in pb-10">
      <SectionHeader
        title="Glorious Stories"
        subtitle="Witness the mighty works of God in our community through shared testimonies."
      />

      {/* Modern Navigation */}
      <div className="flex flex-wrap gap-3 p-1.5 glass-card rounded-2xl w-fit border-gray-100/50">
        <button
          onClick={() => setActiveTab('public')}
          className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${activeTab === 'public'
            ? 'bg-church-green text-white shadow-premium scale-105'
            : 'text-gray-500 hover:text-church-green'
            }`}
        >
          <Quote size={14} />
          Community Stories
        </button>
        <button
          onClick={() => setActiveTab('submit')}
          className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${activeTab === 'submit'
            ? 'bg-church-green text-white shadow-premium scale-105'
            : 'text-gray-500 hover:text-church-green'
            }`}
        >
          <Plus size={14} />
          Share Your Story
        </button>
        <button
          onClick={() => setActiveTab('my')}
          className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${activeTab === 'my'
            ? 'bg-church-green text-white shadow-premium scale-105'
            : 'text-gray-500 hover:text-church-green'
            }`}
        >
          <User size={14} />
          My Journey
        </button>
      </div>

      {error && error.message.includes('requires an index') && (
        <div className="p-6 glass-card border-yellow-500/20 bg-yellow-500/5 rounded-3xl flex items-center gap-4">
          <AlertTriangle className="text-yellow-500" size={24} />
          <p className="text-sm font-bold text-yellow-700 dark:text-yellow-400">
            Index Required: Please visit the console to enable efficient loading of testimonies.
          </p>
        </div>
      )}

      {activeTab === 'submit' ? (
        <div className="max-w-3xl mx-auto w-full group">
          <div className="glass-card p-8 md:p-10 rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-church-green/5 rounded-full blur-3xl -mr-32 -mt-32"></div>

            <div className="relative z-10">
              <div className="mb-8">
                <h3 className="text-2xl font-black dark:text-white mb-1 tracking-tighter">Tell Your Miracle</h3>
                <p className="text-gray-500 text-sm font-medium">Your story can inspire and strengthen the faith of others.</p>
              </div>

              <div className="space-y-6">
                <div className="relative">
                  <textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    className="w-full h-48 p-6 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 outline-none focus:border-church-green transition-all font-serif text-base leading-relaxed italic placeholder-gray-400 resize-none shadow-inner"
                    placeholder="In the beginning of the year, I was facing a challenge..."
                  />
                  <div className="absolute bottom-6 right-8 text-gray-300 pointer-events-none">
                    <Quote size={32} className="opacity-10" />
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={submitting || !content.trim()}
                  className="w-full bg-church-green hover:bg-emerald-700 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-premium hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="animate-spin" size={16} /> : (
                    <>
                      <Send size={16} />
                      Submit for Approval
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : loading ? (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
          {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} height={i % 2 === 0 ? 'h-64' : 'h-48'} />)}
        </div>
      ) : (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
          {testimonies.map((t, index) => (
            <div
              key={t.id}
              className="break-inside-avoid glass-card p-6 rounded-3xl hover:-translate-y-2 transition-all duration-500 animate-fade-in-up flex flex-col group relative"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-10 h-10 rounded-xl bg-church-green/10 text-church-green flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                  <Quote size={16} className="fill-current" />
                </div>
                {!t.approved && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-church-gold/10 text-church-gold rounded-full border border-church-gold/20">
                    <span className="w-1 h-1 rounded-full bg-current animate-pulse"></span>
                    <span className="text-[9px] font-black uppercase tracking-widest">Awaiting Verification</span>
                  </div>
                )}
                {t.approved && (
                  <CheckCircle2 size={18} className="text-church-green opacity-40" />
                )}
              </div>

              <div className="relative mb-6">
                <p className="text-gray-800 dark:text-gray-100 font-serif text-base leading-relaxed italic">
                  "{t.content}"
                </p>
              </div>

              <div className="pt-6 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-[10px] font-black text-church-gold">
                    {t.authorName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h5 className="text-xs font-black dark:text-white tracking-widest uppercase">{t.authorName}</h5>
                    <div className="flex items-center gap-1 text-[9px] font-bold text-gray-400 uppercase tracking-tighter mt-0.5">
                      <Clock size={10} />
                      {new Date(t.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {testimonies.length === 0 && (
            <div className="col-span-full py-20 text-center flex flex-col items-center gap-4 glass-card rounded-[3rem]">
              <MessageCircle size={48} className="text-gray-200 dark:text-gray-800" />
              <p className="text-gray-400 font-black uppercase tracking-widest">No stories have been shared yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TestimoniesView;
