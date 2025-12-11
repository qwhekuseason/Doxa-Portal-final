import React, { useState, useMemo } from 'react';
import { collection, query, where, orderBy, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirestoreQuery } from '../hooks';
import { UserProfile, Testimony } from '../types';
import { MessageCircle, AlertTriangle } from 'lucide-react';
import { SkeletonCard } from '../components/UIComponents';

const TestimoniesView: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'public' | 'submit' | 'my'>('public');
  const [content, setContent] = useState('');

  const testimoniesQuery = useMemo(() => {
    if (activeTab === 'public') return query(collection(db, 'testimonies'), where('approved', '==', true), orderBy('createdAt', 'desc'));
    if (activeTab === 'my') return query(collection(db, 'testimonies'), where('uid', '==', user.uid), orderBy('createdAt', 'desc'));
    return null;
  }, [activeTab, user.uid]);

  const { data: testimonies, loading, error } = useFirestoreQuery<Testimony>(
    activeTab !== 'submit' ? testimoniesQuery : null
  );

  const handleSubmit = async () => {
    if (!content) return;
    await addDoc(collection(db, 'testimonies'), { uid: user.uid, authorName: user.displayName || 'Anonymous', content, approved: false, createdAt: new Date().toISOString() });
    setContent(''); setActiveTab('my'); alert("Testimony submitted for approval!");
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex gap-4 border-b border-gray-100 dark:border-gray-800 pb-4 overflow-x-auto">
        <button onClick={() => setActiveTab('public')} className={`px-6 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all ${activeTab === 'public' ? 'bg-church-muted text-church-green border border-church-green/20' : 'text-gray-500 hover:bg-gray-50'}`}>Community Stories</button>
        <button onClick={() => setActiveTab('submit')} className={`px-6 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all ${activeTab === 'submit' ? 'bg-church-muted text-church-green border border-church-green/20' : 'text-gray-500 hover:bg-gray-50'}`}>Share Your Story</button>
        <button onClick={() => setActiveTab('my')} className={`px-6 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all ${activeTab === 'my' ? 'bg-church-muted text-church-green border border-church-green/20' : 'text-gray-500 hover:bg-gray-50'}`}>My Testimonies</button>
      </div>

      {error && error.message.includes('requires an index') && (
        <div className="p-4 bg-yellow-100 text-yellow-800 rounded-xl flex items-center gap-2">
          <AlertTriangle size={20} />
          <span>System Note: The Testimonies section requires a database index. Please check your browser console for the creation link.</span>
        </div>
      )}

      {activeTab === 'submit' ? (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 max-w-2xl mx-auto">
          <h3 className="text-2xl font-serif font-bold dark:text-white mb-4">Share Your Testimony</h3>
          <textarea value={content} onChange={e => setContent(e.target.value)} className="w-full h-40 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border dark:border-gray-700 outline-none focus:ring-2 focus:ring-church-green" placeholder="Type your story here..." />
          <button onClick={handleSubmit} className="mt-4 w-full bg-church-green hover:bg-emerald-700 text-white py-3 rounded-xl font-bold shadow-lg">Submit for Approval</button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <SkeletonCard key={i} height="h-40" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonies.map(t => (
            <div key={t.id} className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
              <div className="flex justify-between items-start mb-4">
                <MessageCircle className="text-church-green" size={24} />
                {!t.approved && <span className="bg-church-gold/20 text-yellow-700 text-xs font-bold px-2 py-1 rounded-full">Pending</span>}
              </div>
              <p className="text-gray-600 dark:text-gray-300 italic mb-4">"{t.content}"</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">— {t.authorName}</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(t.createdAt).toLocaleDateString()}</p>
            </div>
          ))}
          {testimonies.length === 0 && <div className="col-span-full text-center text-gray-500">No stories found.</div>}
        </div>
      )}
    </div>
  );
};

export default TestimoniesView;