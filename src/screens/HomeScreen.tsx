import React, { useMemo, useState, useEffect } from 'react';
import { collection, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirestoreQuery } from '../hooks';
import { Sermon, UserProfile, CalendarEvent } from '../types';
import {
  BookOpen,
  Calendar,
  PlayCircle,
  Clock,
  MapPin,
  Heart,
  Brain,
  ArrowRight
} from 'lucide-react';
import { SkeletonCard, FloatingSocialMenu } from '../components/UIComponents';
import { useTheme } from '../components/ThemeContext';
import { parseDateSafe } from '../utils/dateUtils';

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
      const eventDate = parseDateSafe(event?.date);
      if (!eventDate) return;

      const difference = +eventDate - +new Date();
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
  }, [event?.date]);

  return (
    <div className="bg-church-green/10 dark:bg-church-green/20 rounded-lg p-3 flex items-center gap-3 border border-church-green/20">
      <div className="bg-church-green text-white p-2 rounded-md">
        <Clock size={16} />
      </div>
      <div>
        <p className="text-[10px] text-church-green font-bold uppercase tracking-wider">Starting In</p>
        <p className="text-lg font-bold text-gray-900 dark:text-white font-mono">{timeLeft}</p>
      </div>
    </div>
  );
};

interface HomeScreenProps {
  user?: UserProfile;
  onNavigate: (tab: string) => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ user, onNavigate }) => {
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

  const dailyVerse = useMemo(() => {
    const day = new Date().getDate();
    return VERSES[day % VERSES.length];
  }, []);

  return (
    <div className="space-y-8 animate-fade-in-up">

      {/* 1. Header & Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-white tracking-tight">
            {greeting}, <span className="text-church-green">{user?.displayName?.split(' ')[0] || 'Friend'}</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium mt-1 text-sm">
            Welcome back to your spiritual dashboard.
          </p>
        </div>

        {nextEvent && (
          <div
            onClick={() => onNavigate('events')}
            className="hidden md:flex items-center gap-3 px-5 py-2.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md cursor-pointer transition-all hover:scale-105"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Next Service: {new Date(nextEvent.date).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: Main Feed */}
        <div className="lg:col-span-2 space-y-6">

          {/* Featured Card */}
          {nextEvent ? (
            <div
              onClick={() => onNavigate('events')}
              className="bg-white dark:bg-gray-900 rounded-xl p-8 border-l-4 border-church-green shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-y border-r border-gray-200 dark:border-gray-800 cursor-pointer group"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-3 py-1 rounded-md bg-church-green/10 text-church-green text-xs font-bold uppercase tracking-wide group-hover:bg-church-green group-hover:text-white transition-colors">Upcoming Event</span>
                    <span className="text-gray-500 text-sm flex items-center gap-1 font-medium"><Calendar size={14} /> {parseDateSafe(nextEvent.date)?.toLocaleDateString()}</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold font-serif text-gray-900 dark:text-white mb-2">{nextEvent.title}</h2>
                  {nextEvent.location && <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2 text-sm"><MapPin size={16} /> {nextEvent.location}</p>}
                </div>
                <EventCountdown event={nextEvent} />
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-xl p-8 border-l-4 border-church-gold shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-y border-r border-gray-200 dark:border-gray-800 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                <BookOpen size={120} className="text-church-gold" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-8 h-[1px] bg-church-gold"></span>
                  <span className="text-xs font-bold uppercase tracking-widest text-church-gold">Verse of the Day</span>
                </div>
                <blockquote className="text-2xl md:text-3xl font-serif leading-relaxed mb-6 text-gray-900 dark:text-white">
                  "{dailyVerse.text}"
                </blockquote>
                <p className="font-bold text-gray-500 dark:text-gray-400 text-sm">— {dailyVerse.reference}</p>
              </div>
            </div>
          )}

          {/* Secondary Verse Card */}
          {nextEvent && (
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-800 hover:border-church-gold flex flex-col justify-center">
              <p className="text-xs font-bold text-church-gold uppercase mb-2 tracking-wide">Verse of the Day</p>
              <p className="text-lg font-serif italic text-gray-800 dark:text-gray-200 leading-relaxed">"{dailyVerse.text}"</p>
              <p className="text-xs text-gray-500 mt-3 font-bold uppercase">— {dailyVerse.reference}</p>
            </div>
          )}

          {/* Recent Sermons Section */}
          <div className="pt-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold font-serif text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-church-green rounded-full"></span> Latest Sermons
              </h2>
              <button
                onClick={() => onNavigate('sermons')}
                className="text-sm font-bold text-gray-500 hover:text-church-green dark:text-gray-400 dark:hover:text-white transition-colors flex items-center gap-1 group"
              >
                View Library <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {sermonsLoading ? (
              <div className="space-y-4">
                {[1, 2].map(i => <SkeletonCard key={i} height="h-28" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {recentSermons.map(sermon => (
                  <div key={sermon.id} className="group bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 hover:border-church-green dark:hover:border-church-green hover:shadow-lg hover:-translate-y-0.5 transition-all flex gap-5 cursor-pointer items-start">
                    <div className="w-32 h-20 rounded-lg bg-gray-100 dark:bg-gray-800 bg-cover bg-center flex-shrink-0 border border-gray-100 dark:border-gray-700 shadow-inner" style={{ backgroundImage: `url(${sermon.coverUrl})` }}>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-church-green transition-colors text-lg truncate pr-4">
                          {sermon.title}
                        </h3>
                        {sermon.downloadUrl && (
                          <span className="text-[10px] font-bold px-2 py-1 rounded bg-church-muted text-church-green border border-church-green/20 uppercase">PDF</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-2 truncate">
                        {sermon.preacher} • {sermon.series || 'Sunday Service'}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-400 font-medium">
                        <span className="flex items-center gap-1"><Calendar size={12} /> {parseDateSafe(sermon.date)?.toLocaleDateString() || 'Unknown'}</span>
                        <span className="flex items-center gap-1"><Clock size={12} /> {sermon.duration || '45m'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Quick Actions & Stats */}
        <div className="space-y-6">

          {/* Quick Actions Grid - WIRED & POLISHED */}
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onNavigate('prayer')}
              className="p-4 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-church-gold hover:shadow-lg hover:-translate-y-1 transition-all text-left group flex flex-col justify-between h-28"
            >
              <Heart className="text-church-gold group-hover:scale-110 transition-transform" />
              <div className="font-bold text-sm">Prayer Request</div>
            </button>
            <button
              onClick={() => onNavigate('quiz')}
              className="p-4 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-church-green hover:shadow-lg hover:-translate-y-1 transition-all text-left group flex flex-col justify-between h-28"
            >
              <Brain className="text-church-green group-hover:scale-110 transition-transform" />
              <div className="font-bold text-sm">Bible Quiz</div>
            </button>
            <button
              onClick={() => onNavigate('bible')}
              className="p-4 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-blue-500 hover:shadow-lg hover:-translate-y-1 transition-all text-left group flex flex-col justify-between h-28"
            >
              <BookOpen className="text-blue-500 group-hover:scale-110 transition-transform" />
              <div className="font-bold text-sm">Read Bible</div>
            </button>
            <button
              onClick={() => onNavigate('events')}
              className="p-4 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-purple-500 hover:shadow-lg hover:-translate-y-1 transition-all text-left group flex flex-col justify-between h-28"
            >
              <Calendar className="text-purple-500 group-hover:scale-110 transition-transform" />
              <div className="font-bold text-sm">Events</div>
            </button>
          </div>

          {/* User Stats - Clickable for Journey */}
          <div
            onClick={() => onNavigate('journey')}
            className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 mt-6 cursor-pointer hover:shadow-lg transition-all group"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white font-serif">Your Journey</h3>
              <ArrowRight size={16} className="text-gray-400 group-hover:text-church-green group-hover:translate-x-1 transition-all" />
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-500 font-medium">Sermons Completed</span>
                  <span className="font-bold text-gray-900 dark:text-white">12</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-church-green h-1.5 rounded-full w-[40%] group-hover:w-[45%] transition-all duration-700"></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-500 font-medium">Quiz Points</span>
                  <span className="font-bold text-gray-900 dark:text-white">850</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-church-gold h-1.5 rounded-full w-[85%] group-hover:w-[88%] transition-all duration-700"></div>
                </div>
              </div>
            </div>

            <button className="w-full mt-6 py-2.5 text-xs font-bold uppercase tracking-wide border border-gray-200 dark:border-gray-700 rounded-lg group-hover:bg-church-green group-hover:text-white group-hover:border-church-green transition-all">
              View Full Profile
            </button>
          </div>
        </div>
      </div>

      <FloatingSocialMenu />
    </div>
  );
};

export default HomeScreen;