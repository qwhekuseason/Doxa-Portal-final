import React, { useState, useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirestoreQuery } from '../hooks';
import { Sermon } from '../types';
import { Search, PlayCircle } from 'lucide-react';
import { SkeletonCard } from '../components/UIComponents';

const SermonLibraryView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const sermonQ = useMemo(() => query(collection(db, 'sermons')), []);
  const { data: sermons, loading } = useFirestoreQuery<Sermon>(sermonQ);

  const filtered = sermons.filter(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold font-serif dark:text-white">Sermon Library</h2>
          <p className="text-gray-500 mt-1">Listen to the word of God anytime, anywhere.</p>
        </div>
        <div className="relative group">
          <Search className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-church-green transition-colors" size={20} />
          <input
            type="text"
            placeholder="Search sermons..."
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 pl-12 pr-6 py-3 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent w-full md:w-80 dark:text-white transition-all shadow-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {loading ? [1, 2, 3, 4].map(i => <SkeletonCard key={i} height="h-80" />)
          : filtered.map(sermon => (
            <div key={sermon.id} className="group bg-white dark:bg-gray-800 rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col h-full">
              <div className="relative h-56 overflow-hidden">
                <img src={sermon.coverUrl} alt={sermon.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>

                {/* Download Overlay */}
                {sermon.downloadUrl && (
                  <a
                    href={sermon.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0"
                  >
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg border border-white/50 hover:bg-white/30 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                    </div>
                  </a>
                )}

                <span className="absolute bottom-3 right-3 bg-black/50 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
                  {sermon.duration}
                </span>
                <span className="absolute top-3 left-3 bg-church-green/90 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                  {sermon.series}
                </span>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="font-bold text-gray-900 dark:text-white text-xl leading-tight mb-2 font-serif group-hover:text-church-green transition-colors">{sermon.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">{sermon.description}</p>
                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{sermon.preacher}</p>
                    <p className="text-xs text-gray-400">{new Date(sermon.date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    {sermon.downloadUrl && (
                      <a
                        href={sermon.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-church-green text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-emerald-700 transition-colors shadow-md"
                      >
                        Download
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

const SermonCard = ({ sermon, onPlay }: any) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden hover:shadow-lg transition-all">
      {sermon.coverData && (
        <img
          src={sermon.coverData}
          alt={sermon.title}
          className="w-full h-40 object-cover"
        />
      )}
      <div className="p-4">
        <h3 className="font-bold dark:text-white truncate">{sermon.title}</h3>
        <p className="text-sm text-gray-500">{sermon.preacher}</p>
        <button
          onClick={() => onPlay({ ...sermon, src: sermon.audioData })}
          className="mt-3 w-full bg-church-green text-white py-2 rounded-lg font-bold text-sm"
        >
          Play
        </button>
      </div>
    </div>
  );
};

export default SermonLibraryView;