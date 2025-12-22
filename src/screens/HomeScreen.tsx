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
  Heart,
  Brain,
  TrendingUp,
  Flame,
  Star,
  Users
} from 'lucide-react';
import { SkeletonCard, FloatingSocialMenu, SectionHeader, StatCard } from '../components/UIComponents';
import { useTheme } from '../components/ThemeContext';
import { parseDateSafe } from '../utils/dateUtils';

// Static VersES Collection
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
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 flex items-center gap-4 border border-white/20 shadow-xl overflow-hidden group">
      <div className="absolute inset-0 shimmer-bg opacity-10"></div>
      <div className="bg-church-green text-white p-3 rounded-xl shadow-lg shadow-church-green/30 group-hover:scale-110 transition-transform">
        <Clock size={20} />
      </div>
      <div className="relative z-10">
        <p className="text-[10px] text-white/60 font-black uppercase tracking-[0.2em]">Service Launch</p>
        <p className="text-xl font-black text-white font-mono tracking-tight">{timeLeft}</p>
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
    if (hour < 5) return 'Good Night';
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const dailyVerse = useMemo(() => {
    const day = new Date().getDate();
    return VERSES[day % VERSES.length];
  }, []);

  return (
    <div className="space-y-12 animate-fade-in pb-10">

      {/* Hero Welcome Section */}
      <section className="relative rounded-3xl overflow-hidden shadow-premium group">
        {/* Dynamic Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-church-green to-emerald-900 group-hover:scale-105 transition-transform duration-[2000ms]"></div>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-church-gold/20 rounded-full blur-[80px] animate-pulse-slow"></div>
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-white/10 rounded-full blur-[80px]"></div>

        <div className="relative z-10 p-6 md:p-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3 animate-fade-in-up">
                <span className="px-2.5 py-1 bg-white/20 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-full backdrop-blur-md border border-white/20">Divine Dashboard</span>
                <span className="w-1.5 h-1.5 rounded-full bg-church-gold animate-pulse"></span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-sans font-black text-white tracking-tighter leading-tight">
                {greeting},<br />
                <span className="text-church-gold">{user?.displayName?.split(' ')[0] || 'Beloved'}</span>
              </h1>
              <p className="text-white/70 font-medium text-sm md:text-base max-w-xl leading-relaxed">
                Your spiritual journey continues here. Explore the Word, join the community, and grow in grace.
              </p>
            </div>

            <div className="flex flex-col gap-4 md:w-72">
              {nextEvent ? (
                <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                  <EventCountdown event={nextEvent} />
                  <p className="mt-2 text-center text-white/50 text-[9px] font-black uppercase tracking-widest truncate">{nextEvent.title}</p>
                </div>
              ) : (
                <div className="p-5 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl animate-fade-in-up">
                  <p className="text-[9px] font-black text-white/60 mb-1 uppercase tracking-[0.2em]">Wisdom for now</p>
                  <p className="text-white font-serif italic text-sm md:text-base leading-relaxed line-clamp-3">"{dailyVerse.text}"</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Stats Grid */}
      <section className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <StatCard
          title="Lessons"
          value={user?.stats?.sermonsHeard || 0}
          icon={<BookOpen />}
          color="bg-church-green"
        />
        <StatCard
          title="Points"
          value={user?.stats?.quizPoints || 0}
          icon={<Star />}
          color="bg-church-gold"
        />
        <StatCard
          title="Quizzes"
          value={user?.stats?.quizzesTaken || 0}
          icon={<TrendingUp />}
          color="bg-blue-500"
        />
        <StatCard
          title="Highlights"
          value={user?.stats?.versesHighlighted || 0}
          icon={<Flame />}
          color="bg-orange-500"
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Column: Feed */}
        <div className="lg:col-span-2 space-y-12">

          {/* Latest Sermons */}
          <div className="space-y-6">
            <SectionHeader
              title="Recent Sermons"
              subtitle="Deep dive into the latest spiritual messages from our pastors."
              action={
                <button onClick={() => onNavigate('sermons')} className="px-5 py-2.5 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-church-green hover:text-white transition-all shadow-sm">
                  Explore All
                </button>
              }
            />

            {sermonsLoading ? (
              <div className="grid grid-cols-1 gap-6">
                {[1, 2].map(i => <SkeletonCard key={i} height="h-44" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {recentSermons.slice(0, 2).map((sermon, idx) => (
                  <div
                    key={sermon.id}
                    onClick={() => onNavigate('sermons')}
                    className="group flex flex-col md:flex-row gap-4 p-1 glass-card border-white/40 rounded-3xl hover:shadow-premium hover:-translate-y-1 transition-all duration-500 cursor-pointer overflow-hidden animate-fade-in-up"
                    style={{ animationDelay: `${idx * 0.1}s` }}
                  >
                    <div className="md:w-48 h-40 md:h-auto font-black relative overflow-hidden rounded-2xl">
                      <img
                        src={sermon.coverUrl}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                        alt=""
                        onError={(e) => (e.currentTarget.src = 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&q=80&w=1000')}
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors"></div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white scale-90 group-hover:scale-100 transition-transform">
                          <PlayCircle size={20} fill="currentColor" />
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 p-5 flex flex-col justify-center">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="bg-church-green/10 text-church-green text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border border-church-green/10">{sermon.series || 'SUNDAY SERIES'}</span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5"><Calendar size={12} /> {parseDateSafe(sermon.date)?.toLocaleDateString()}</span>
                      </div>
                      <h3 className="text-xl font-black text-gray-900 dark:text-white group-hover:text-church-green transition-colors leading-tight mb-1 tracking-tighter">
                        {sermon.title}
                      </h3>
                      <p className="text-xs text-gray-400 font-medium mb-3 line-clamp-1">By {sermon.preacher}</p>

                      <div className="flex items-center gap-6 pt-2 border-t border-gray-100 dark:border-white/5 opacity-60">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-tight text-gray-500">
                          <Clock size={12} className="text-church-green" />
                          <span>{sermon.duration || '45 MIN'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-tight text-gray-500">
                          <Users size={12} className="text-church-gold" />
                          <span>3.4k Views</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Actions & Verse */}
        <div className="space-y-12">

          {/* Bible Verse Spotlight (Moved Higher) */}
          <div className="relative p-6 glass-card border-church-gold/30 rounded-3xl overflow-hidden group shadow-premium">
            <div className="absolute top-0 right-0 w-32 h-32 bg-church-gold/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000"></div>

            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="p-3 bg-church-gold/10 rounded-xl mb-4 text-church-gold">
                <Star size={24} fill="currentColor" />
              </div>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-church-gold/60 mb-4">Light for your path</p>
              <blockquote className="text-base font-serif text-gray-900 dark:text-white italic leading-relaxed mb-5">
                "{dailyVerse.text}"
              </blockquote>
              <div className="w-12 h-0.5 bg-church-gold/20 rounded-full mb-3"></div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">— {dailyVerse.reference}</p>

              <button onClick={() => onNavigate('bible')} className="mt-8 px-8 py-3 bg-church-gold text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-church-gold/30 hover:scale-105 transition-all active:scale-95">
                Open Scriptures
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <SectionHeader title="Actions" />
            <div className="grid grid-cols-2 gap-4">
              {[
                { id: 'prayer', label: 'PRAYER', icon: <Heart />, color: 'text-red-500', bg: 'bg-red-500/5 hover:bg-red-500/10' },
                { id: 'quiz', label: 'QUIZ', icon: <Brain />, color: 'text-church-green', bg: 'bg-church-green/5 hover:bg-church-green/10' },
                { id: 'bible', label: 'BIBLE', icon: <BookOpen />, color: 'text-blue-500', bg: 'bg-blue-500/5 hover:bg-blue-500/10' },
                { id: 'events', label: 'EVENTS', icon: <Calendar />, color: 'text-purple-500', bg: 'bg-purple-500/5 hover:bg-purple-500/10' },
              ].map(action => (
                <button
                  key={action.id}
                  onClick={() => onNavigate(action.id)}
                  className={`p-5 ${action.bg} glass-card border-none rounded-2xl flex flex-col items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95 group`}
                >
                  <div className={`${action.color} group-hover:scale-110 transition-transform duration-500`}>
                    {React.cloneElement(action.icon as React.ReactElement, { size: 24 })}
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <FloatingSocialMenu />
    </div>
  );
};

export default HomeScreen;