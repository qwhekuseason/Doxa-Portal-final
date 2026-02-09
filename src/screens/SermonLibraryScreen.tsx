import React, { useState, useMemo } from 'react';
import { collection, query, orderBy, updateDoc, doc, increment } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useFirestoreQuery } from '../hooks';
import { Sermon } from '../types';
import { Search, PlayCircle, Clock, Calendar, Users, Download, ArrowRight, Filter, LayoutGrid } from 'lucide-react';
import { SkeletonCard, SectionHeader } from '../components/UIComponents';

// Define query outside for stability
const sermonQ = query(collection(db, 'sermons'), orderBy('date', 'desc'));

const SermonLibraryView: React.FC<{ onPlay?: (sermon: Sermon) => void }> = ({ onPlay }) => {
  const { data: sermons, loading } = useFirestoreQuery<Sermon>(sermonQ);
  const [searchTerm, setSearchTerm] = useState('');
  const [groupMode, setGroupMode] = useState<'none' | 'service' | 'speaker' | 'month' | 'year'>('none');

  const filtered = useMemo(() => {
    let result = sermons;
    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(s =>
        s.title.toLowerCase().includes(lowerSearch) ||
        s.speaker.toLowerCase().includes(lowerSearch) ||
        (s.series && s.series.toLowerCase().includes(lowerSearch))
      );
    }
    return result;
  }, [sermons, searchTerm]);

  const grouped = useMemo(() => {
    if (groupMode === 'none') return { "All Sermons": filtered };

    const groups: Record<string, Sermon[]> = {};

    filtered.forEach(sermon => {
      let key = 'Other';
      const date = new Date(sermon.date);

      if (groupMode === 'service') {
        const series = sermon.series?.toLowerCase() || '';
        if (series.includes('sunday')) key = 'Sunday Services';
        else if (series.includes('thursday')) key = 'Thursday Services';
        else key = sermon.series || 'Special Services';
      } else if (groupMode === 'speaker') {
        key = sermon.speaker || 'Unknown Preacher';
      } else if (groupMode === 'month') {
        key = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      } else if (groupMode === 'year') {
        key = date.getFullYear().toString();
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(sermon);
    });

    // Sort group keys if needed (e.g. chronologically for months/years)
    if (groupMode === 'year' || groupMode === 'month') {
      // Sort keys handled by reverse chronological ordering from query usually, 
      // but if we want specific key sorting:
      return Object.fromEntries(
        Object.entries(groups).sort((a, b) => {
          if (groupMode === 'year') return parseInt(b[0]) - parseInt(a[0]);
          return new Date(b[1][0].date).getTime() - new Date(a[1][0].date).getTime();
        })
      );
    }

    return groups;
  }, [filtered, groupMode]);

  const handlePlay = async (sermon: Sermon) => {
    if (onPlay) {
      onPlay(sermon);
    } else if (sermon.audioUrl) {
      window.open(sermon.audioUrl, '_blank');
    }

    if (auth.currentUser) {
      try {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          'stats.sermonsHeard': increment(1)
        });
      } catch (e) { console.error(e); }
    }
  };

  return (
    <div className="space-y-10 animate-fade-in pb-20">

      {/* Header & Search */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
        <SectionHeader
          title="Sermon Library"
          subtitle="Explore our curated sanctuary of messages. Listen, learn, and grow through our recorded sermons."
        />

        <div className="relative group w-full xl:w-[32rem]">
          <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
            <Search className="text-gray-400 group-focus-within:text-church-green group-focus-within:scale-125 transition-all" size={20} />
          </div>
          <input
            type="text"
            placeholder="Search our collection of sermons..."
            className="w-full bg-white dark:bg-white/[0.03] border-2 border-transparent focus:border-church-green/20 pl-16 pr-8 py-5 rounded-[2rem] text-sm font-black uppercase tracking-wider focus:outline-none focus:ring-8 focus:ring-church-green/5 dark:text-white transition-all shadow-premium placeholder:text-gray-400 dark:placeholder:text-gray-600"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Grouping Controls */}
      <div className="flex items-center gap-3 animate-fade-in-up overflow-x-auto pb-2 -mx-2 px-2 md:-mx-0 md:px-0 md:flex-wrap hide-scrollbar" style={{ animationDelay: '0.1s' }}>
        <div className="flex-none flex items-center gap-2 px-4 py-3 bg-gray-100 dark:bg-white/5 rounded-2xl text-[10px] font-black text-gray-400 uppercase tracking-widest border border-gray-200 dark:border-white/5">
          <Filter size={14} /> <span className="hidden sm:inline">Group By</span>
        </div>
        {[
          { id: 'none', label: 'All', icon: <LayoutGrid size={14} /> },
          { id: 'service', label: 'Schedules', icon: <Calendar size={14} /> },
          { id: 'speaker', label: 'Pastors', icon: <Users size={14} /> },
          { id: 'month', label: 'Months', icon: <Clock size={14} /> },
          { id: 'year', label: 'Years', icon: <Calendar size={14} /> },
        ].map(btn => (
          <button
            key={btn.id}
            onClick={() => setGroupMode(btn.id as any)}
            className={`flex-none px-6 py-3 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap ${groupMode === btn.id
              ? 'bg-church-green text-white shadow-lg shadow-church-green/30'
              : 'glass-card border-none text-gray-500 hover:text-church-green'
              }`}
          >
            {btn.icon} {btn.label}
          </button>
        ))}
      </div>

      {/* Results Section */}
      <div className="space-y-16">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
            {[1, 2, 3].map(i => <SkeletonCard key={i} height="h-[450px]" />)}
          </div>
        ) : Object.keys(grouped).length > 0 ? (
          Object.entries(grouped).map(([groupName, items], gIdx) => (
            <div key={groupName} className="space-y-8 animate-fade-in-up" style={{ animationDelay: `${gIdx * 0.1}s` }}>
              {groupMode !== 'none' && (
                <div className="flex items-center gap-6">
                  <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-gray-200 dark:via-white/10 to-transparent"></div>
                  <h3 className="text-sm font-black text-church-green uppercase tracking-[0.3em] whitespace-nowrap bg-white dark:bg-[#050505] px-4">
                    {groupName}
                  </h3>
                  <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-gray-200 dark:via-white/10 to-transparent"></div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 gap-6 md:gap-10">
                {items.map((sermon, idx) => (
                  <div
                    key={sermon.id}
                    className="group glass-card border-white/40 dark:border-white/5 rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-premium hover:shadow-premium-green hover:-translate-y-3 transition-all duration-700 flex flex-col h-full animate-fade-in-up"
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    {/* (Card content remains the same, but I'll optimize for slightly cleaner code below) */}
                    <div className="relative h-48 overflow-hidden m-1.5 rounded-2xl">
                      <img
                        src={sermon.coverUrl}
                        alt={sermon.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1500ms]"
                        loading="lazy"
                        onError={(e) => (e.currentTarget.src = 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&q=80&w=1000')}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80 group-hover:opacity-40 transition-opacity"></div>

                      <div
                        onClick={() => handlePlay(sermon)}
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 scale-90 group-hover:scale-100 cursor-pointer"
                      >
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

                    <div className="p-5 p-t-6 flex-1 flex flex-col">
                      <div className="flex items-center gap-2 mb-2 opacity-60">
                        <Calendar size={10} className="text-church-green" />
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{new Date(sermon.date).toLocaleDateString()}</span>
                      </div>

                      <h3 className="font-sans font-black text-gray-900 dark:text-white text-xl leading-tight mb-2 group-hover:text-church-green transition-colors tracking-tighter line-clamp-2">
                        {sermon.title}
                      </h3>

                      <p className="text-gray-500 dark:text-gray-400 text-xs font-medium mb-5 line-clamp-2 leading-relaxed">
                        {sermon.description || "Join us as we explore the deeper meanings of faith and purpose in this sermon."}
                      </p>

                      <div className="mt-auto pt-5 border-t border-gray-100 dark:border-white/5 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                            <Users size={14} className="text-church-gold" />
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Preacher</p>
                            <p className="text-[11px] font-black text-gray-800 dark:text-gray-200">{sermon.speaker}</p>
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
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
              <Search size={40} className="text-gray-300" />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-2">No Sermons Found</h3>
            <p className="text-gray-400 font-medium">Try adjusting your search terms or grouping to find what you're looking for.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SermonLibraryView;