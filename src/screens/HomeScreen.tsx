import React, { useMemo, useState, useEffect } from 'react';
import { collection, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirestoreQuery } from '../hooks';
import { Sermon, UserProfile, CalendarEvent } from '../types';
import {
  BookOpen,
  Calendar,
  Zap,
  PlayCircle,
  ArrowRight,
  Search,
  Mic2,
  Heart,
  Brain,
  Clock,
  MapPin
} from 'lucide-react';
import { SkeletonCard, FloatingSocialMenu } from '../components/UIComponents';
import { useTheme } from '../components/ThemeContext';

// Static Verses Collection
const VERSES = [
  { text: "For I know the plans I have for you, declares the Lord, plans for welfare and not for evil, to give you a future and a hope.", reference: "Jeremiah 29:11" },
  { text: "I can do all things through him who strengthens me.", reference: "Philippians 4:13" },
  { text: "Trust in the Lord with all your heart, and do not lean on your own understanding.", reference: "Proverbs 3:5" },
  { text: "The Lord is my shepherd; I shall not want.", reference: "Psalm 23:1" },
  { text: "But they who wait for the Lord shall renew their strength; they shall mount up with wings like eagles.", reference: "Isaiah 40:31" },
  { text: "And we know that for those who love God all things work together for good.", reference: "Romans 8:28" },
  { text: "Be strong and courageous. Do not be frightened, and do not be dismayed, for the Lord your God is with you wherever you go.", reference: "Joshua 1:9" },
];

const EventCountdown: React.FC<{ event: CalendarEvent }> = ({ event }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(event.date) - +new Date();
      if (difference > 0) {
        const d = Math.floor(difference / (1000 * 60 * 60 * 24));
        const h = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const m = Math.floor((difference / 1000 / 60) % 60);
        setTimeLeft(`${d}d ${h}h ${m}m`);
      } else {
        setTimeLeft('Happening Now');
      }
    };
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000);
    return () => clearInterval(timer);
  }, [event.date]);

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 flex items-center gap-3">
      <div className="bg-white/20 p-2 rounded-lg">
        <Clock size={20} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-white/70 font-bold uppercase tracking-wider">Starting In</p>
        <p className="text-lg font-bold text-white font-mono">{timeLeft}</p>
      </div>
    </div>
  );
};

// Interface for HomeScreen props - accepting user now
interface HomeScreenProps {
  user?: UserProfile;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ user }) => {
  const { theme } = useTheme();

  // Queries
  const sermonQ = useMemo(() => query(collection(db, 'sermons'), orderBy('date', 'desc'), limit(3)), []);
  const eventQ = useMemo(() => query(collection(db, 'events'), where('date', '>=', new Date().toISOString()), orderBy('date', 'asc'), limit(1)), []);

  const { data: recentSermons, loading: sermonsLoading } = useFirestoreQuery<Sermon>(sermonQ);
  const { data: upcomingEvents, loading: eventsLoading } = useFirestoreQuery<CalendarEvent>(eventQ);

  const nextEvent = upcomingEvents[0];

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  // Pick a verse based on the day of the month to keep it consistent for the day
  const dailyVerse = useMemo(() => {
    const day = new Date().getDate();
    return VERSES[day % VERSES.length];
  }, []);

  return (
    <div className="space-y-8 animate-fade-in-up">

      {/* 1. Header & Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold dark:text-white">
            {greeting}, <span className="text-church-green dark:text-church-gold">{user?.displayName?.split(' ')[0] || 'Friend'}</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">
            Ready to grow in faith today?
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-full border border-gray-100 dark:border-gray-700 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <span className="text-xs font-bold text-gray-600 dark:text-gray-300">Live Services Online: 10AM Sun</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: Main Feed */}
        <div className="lg:col-span-2 space-y-8">

          {/* Dynamic Hero Card: Verse OR Upcoming Event */}
          {nextEvent ? (
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 to-indigo-900 text-white p-8 shadow-xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 rounded-md bg-white/20 text-xs font-bold uppercase">Next Event</span>
                    <span className="text-blue-200 text-sm flex items-center gap-1"><Calendar size={14} /> {new Date(nextEvent.date).toLocaleDateString()}</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold font-serif mb-2">{nextEvent.title}</h2>
                  {nextEvent.location && <p className="text-blue-200 flex items-center gap-2"><MapPin size={16} /> {nextEvent.location}</p>}
                </div>
                <EventCountdown event={nextEvent} />
              </div>
            </div>
          ) : (
            /* Verse Fallback if no event */
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-church-green to-emerald-800 text-white p-8 shadow-xl group hover:shadow-2xl transition-all duration-500">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-white/20 transition-colors duration-500"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4 opacity-80">
                  <BookOpen size={18} />
                  <span className="text-xs font-bold uppercase tracking-widest">Verse of the Day</span>
                </div>
                <blockquote className="text-2xl md:text-3xl font-serif leading-relaxed mb-6 italic">
                  "{dailyVerse.text}"
                </blockquote>
                <p className="font-bold text-church-gold">{dailyVerse.reference}</p>
              </div>
            </div>
          )}

          {/* If event was shown above, show Verse here as smaller card, or vice-versa logic could applied. 
               For now, let's just keep the verse visible always below if event exists, or maybe side by side? 
               Let's simplify: If event exists, it takes top spot. Verse moves to side or below. 
               Actually, let's keep the Verse as a secondary card in the grid if Event is hero.
           */}
          {nextEvent && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-sm font-bold text-church-green uppercase mb-2">Verse of the Day</p>
              <p className="text-lg font-serif italic text-gray-800 dark:text-gray-200">"{dailyVerse.text}"</p>
              <p className="text-sm text-gray-500 mt-2 font-bold">— {dailyVerse.reference}</p>
            </div>
          )}


          {/* Recent Sermons Section */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold font-serif dark:text-white flex items-center gap-2">
                <PlayCircle className="text-church-green dark:text-church-gold" size={20} /> Latest Sermons
              </h2>
              <button className="text-sm font-bold text-gray-500 hover:text-church-green dark:text-gray-400 dark:hover:text-church-gold hover:underline">
                View Library
              </button>
            </div>

            {sermonsLoading ? (
              <div className="space-y-4">
                {[1, 2].map(i => <SkeletonCard key={i} height="h-24" />)}
              </div>
            ) : (
              <div className="space-y-4">
                {recentSermons.map(sermon => (
                  <div key={sermon.id} className="group bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all flex gap-4 cursor-pointer">
                    <div className="w-24 h-24 rounded-xl bg-gray-200 dark:bg-gray-700 bg-cover bg-center flex-shrink-0" style={{ backgroundImage: `url(${sermon.coverUrl})` }}>
                      {/* Removed Play Overlay */}
                    </div>
                    <div className="flex-1 py-1">
                      <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-church-green dark:group-hover:text-church-gold transition-colors line-clamp-1">
                        {sermon.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-2 line-clamp-1">
                        {sermon.preacher} • {sermon.series}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(sermon.date).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1"><Clock size={12} /> {sermon.duration}</span>
                        </div>
                        {sermon.downloadUrl && (
                          <a href={sermon.downloadUrl} target="_blank" rel="noopener noreferrer" className="text-church-green hover:underline text-xs font-bold">
                            Download
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Quick Actions & Stats */}
        <div className="space-y-8">

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-2 gap-4">
            <button className="p-4 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded-2xl border border-orange-100 dark:border-orange-800 hover:bg-orange-100 transition-colors text-left group">
              <Heart className="mb-3 group-hover:scale-110 transition-transform" />
              <div className="font-bold text-sm">Prayer Request</div>
            </button>
            <button className="p-4 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-2xl border border-purple-100 dark:border-purple-800 hover:bg-purple-100 transition-colors text-left group">
              <Brain className="mb-3 group-hover:scale-110 transition-transform" />
              <div className="font-bold text-sm">Bible Quiz</div>
            </button>
            <button className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-2xl border border-blue-100 dark:border-blue-800 hover:bg-blue-100 transition-colors text-left group">
              <BookOpen className="mb-3 group-hover:scale-110 transition-transform" />
              <div className="font-bold text-sm">Read Bible</div>
            </button>
            <button className="p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-2xl border border-green-100 dark:border-green-800 hover:bg-green-100 transition-colors text-left group">
              <Calendar className="mb-3 group-hover:scale-110 transition-transform" />
              <div className="font-bold text-sm">Events</div>
            </button>
          </div>

          {/* User Stats Placeholder */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-lg dark:text-white mb-4">Your Journey</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Sermons Listened</span>
                <span className="font-bold dark:text-white">12</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-church-gold h-2 rounded-full w-[40%]"></div>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Quiz Points</span>
                  <span className="font-bold dark:text-white">850</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Social Menu */}
      <FloatingSocialMenu />
    </div>
  );
};

export default HomeScreen;