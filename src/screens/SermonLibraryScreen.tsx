import React, { useState, useMemo } from 'react';
import { collection, query, orderBy, updateDoc, doc, increment } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useFirestoreQuery } from '../hooks';
import { Sermon } from '../types';
import { Search, PlayCircle, Clock, Calendar, Users, Download, ArrowRight, LayoutGrid, Headphones } from 'lucide-react';
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

    if (groupMode === 'year' || groupMode === 'month') {
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
    <div className="space-y-10 pb-20">
      {/* Header & Search */}
      <div className="flex flex-col gap-6 animate-page-enter animate-stagger-1 text-left">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <SectionHeader
            title="Sermon Library"
            subtitle="Explore our sanctuary of messages."
          />
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-2 md:pb-0">
            {[
              { id: 'none', label: 'All', icon: <LayoutGrid size={14} /> },
              { id: 'service', label: 'Service', icon: <Users size={14} /> },
              { id: 'speaker', label: 'Preacher', icon: <Users size={14} /> },
              { id: 'month', label: 'Month', icon: <Calendar size={14} /> },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setGroupMode(f.id as any)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all spring-interaction shrink-0 ${groupMode === f.id
                  ? 'bg-church-green text-white shadow-lg shadow-church-green/20'
                  : 'bg-white/40 dark:bg-white/5 text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                {f.icon} {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative group">
          <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-gray-400 group-focus-within:text-church-green transition-colors">
            <Search size={20} />
          </div>
          <input
            type="text"
            placeholder="Search by title, speaker, or series..."
            className="w-full pl-16 pr-6 py-5 rounded-[2rem] glass-card !bg-white/50 dark:!bg-white/5 outline-none focus:ring-2 focus:ring-church-green/30 transition-all font-medium text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Results Section */}
      <div className="space-y-12 animate-page-enter animate-stagger-2">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => <SkeletonCard key={i} height="h-64" />)}
          </div>
        ) : Object.keys(grouped).length > 0 ? (
          Object.entries(grouped).map(([groupName, groupSermons]) => (
            <div key={groupName} className="space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 flex items-center gap-3">
                <div className="w-2 h-2 bg-church-green rounded-full"></div>
                {groupName}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {groupSermons.map((sermon) => (
                  <div
                    key={sermon.id}
                    className="glass-card card-pop overflow-hidden !rounded-[2.5rem] group flex flex-col h-full"
                  >
                    <div className="relative aspect-video overflow-hidden" onClick={() => handlePlay(sermon)}>
                      <img
                        src={sermon.coverUrl}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[3000ms] cursor-pointer"
                        alt={sermon.title}
                        onError={(e) => (e.currentTarget.src = 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&q=80&w=1000')}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity pointer-events-none"></div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 pointer-events-none">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center text-white border border-white/40">
                          <PlayCircle size={32} fill="currentColor" />
                        </div>
                      </div>
                      {sermon.series && (
                        <div className="absolute top-4 left-4">
                          <span className="px-3 py-1 bg-white/20 backdrop-blur-md border border-white/20 text-white text-[8px] font-black uppercase tracking-widest rounded-full">{sermon.series}</span>
                        </div>
                      )}
                    </div>

                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div className="mb-4">
                        <h3 onClick={() => handlePlay(sermon)} className="text-lg font-black text-gray-900 dark:text-white leading-tight tracking-tighter group-hover:text-church-green transition-colors cursor-pointer">{sermon.title}</h3>
                        <p className="text-[10px] font-black text-church-green uppercase tracking-widest mt-2 italic">{sermon.speaker}</p>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-white/5">
                        <div className="flex items-center gap-4 text-gray-400">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} />
                            <span className="text-[9px] font-black uppercase tracking-tighter">{new Date(sermon.date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock size={12} />
                            <span className="text-[9px] font-black uppercase tracking-tighter">{sermon.duration || '45m'}</span>
                          </div>
                        </div>
                        {sermon.downloadUrl && (
                          <a
                            href={sermon.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-white/5 text-gray-400 hover:text-church-green hover:bg-church-green/10 transition-all spring-interaction"
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
            <p className="text-gray-400 font-medium">Try adjusting your search terms or filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SermonLibraryView;