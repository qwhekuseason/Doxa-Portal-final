import React, { useState, useMemo } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirestoreQuery } from '../hooks';
import { Sermon } from '../types';
import { Search, PlayCircle, Clock, Calendar, Users, Download, ArrowRight } from 'lucide-react';
import { SkeletonCard, SectionHeader } from '../components/UIComponents';

const SermonLibraryView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const sermonQ = useMemo(() => query(collection(db, 'sermons'), orderBy('date', 'desc')), []);
  const { data: sermons, loading } = useFirestoreQuery<Sermon>(sermonQ);

  const filtered = sermons.filter(s =>
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.preacher.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10 animate-fade-in pb-20">

      {/* Header & Search */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
        <SectionHeader
          title="Sermon Library"
          subtitle="Explore the sanctuary of wisdom. Listen, learn, and be transformed by the word of God."
        />

        <div className="relative group w-full xl:w-96">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
            <Search className="text-gray-400 group-focus-within:text-church-green group-focus-within:scale-110 transition-all" size={20} />
          </div>
          <input
            type="text"
            placeholder="Search by title, series, or preacher..."
            className="w-full bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 pl-14 pr-6 py-3.5 rounded-2xl text-[13px] font-bold focus:outline-none focus:ring-4 focus:ring-church-green/10 focus:border-church-green/50 dark:text-white transition-all shadow-premium"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
        {loading ? [1, 2, 3, 4, 5, 6, 7, 8].map(i => <SkeletonCard key={i} height="h-[420px]" />)
          : filtered.length > 0 ? filtered.map((sermon, idx) => (
            <div
              key={sermon.id}
              className="group glass-card border-white/40 dark:border-white/5 rounded-3xl overflow-hidden hover:shadow-premium hover:-translate-y-2 transition-all duration-700 flex flex-col h-full animate-fade-in-up"
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              {/* Cover Image Section */}
              <div className="relative h-48 overflow-hidden m-1.5 rounded-2xl">
                <img
                  src={sermon.coverUrl}
                  alt={sermon.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1500ms]"
                  onError={(e) => (e.currentTarget.src = 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&q=80&w=1000')}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80 group-hover:opacity-40 transition-opacity"></div>

                {/* Play Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 scale-90 group-hover:scale-100">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center shadow-2xl border border-white/40 group/play hover:scale-110 transition-transform">
                    <PlayCircle size={32} className="text-white" fill="currentColor" />
                  </div>
                </div>

                <div className="absolute top-3 left-3 flex gap-2">
                  <span className="px-2.5 py-1 bg-church-green/90 text-white text-[8px] font-black uppercase tracking-widest rounded-lg backdrop-blur-md shadow-lg">
                    {sermon.series || 'SERIES'}
                  </span>
                </div>

                <div className="absolute bottom-3 right-3 bg-black/40 backdrop-blur-md text-white text-[9px] font-black px-2.5 py-1 rounded-full border border-white/10 uppercase tracking-widest">
                  {sermon.duration || '45m'}
                </div>
              </div>

              {/* Content Section */}
              <div className="p-5 p-t-6 flex-1 flex flex-col">
                <div className="flex items-center gap-2 mb-2 opacity-60">
                  <Calendar size={10} className="text-church-green" />
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{new Date(sermon.date).toLocaleDateString()}</span>
                </div>

                <h3 className="font-sans font-black text-gray-900 dark:text-white text-lg leading-tight mb-2 group-hover:text-church-green transition-colors tracking-tight line-clamp-2">
                  {sermon.title}
                </h3>

                <p className="text-gray-500 dark:text-gray-400 text-xs font-medium mb-5 line-clamp-2 leading-relaxed">
                  {sermon.description || "Join us as we explore the deeper meanings of faith and purpose in this powerful message."}
                </p>

                <div className="mt-auto pt-5 border-t border-gray-100 dark:border-white/5 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                      <Users size={14} className="text-church-gold" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Preacher</p>
                      <p className="text-[11px] font-black text-gray-800 dark:text-gray-200">{sermon.preacher}</p>
                    </div>
                  </div>

                  {sermon.downloadUrl && (
                    <a
                      href={sermon.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 glass-card bg-church-green/10 flex items-center justify-center rounded-xl text-church-green hover:bg-church-green hover:text-white transition-all shadow-sm"
                    >
                      <Download size={18} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )) : (
            <div className="col-span-full py-20 text-center flex flex-col items-center">
              <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
                <Search size={40} className="text-gray-300" />
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-2">No Sermons Found</h3>
              <p className="text-gray-400 font-medium">Try adjusting your search terms to find what you're looking for.</p>
            </div>
          )}
      </div>
    </div>
  );
};

export default SermonLibraryView;