import React, { useMemo, useState, useEffect } from 'react';
import { collection, query, orderBy, limit, where, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirestoreQuery } from '../hooks';
import { Sermon, UserProfile, CalendarEvent, ReadingPlan, UserPlanProgress } from '../types';
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
  Users,
  MessageSquare,
  Hand,
  Coins,
  QrCode,
  Sparkles,
  ArrowRight,
  Target
} from 'lucide-react';
import { SkeletonCard, SectionHeader, StatCard } from '../components/UIComponents';
import { parseDateSafe } from '../utils/dateUtils';
import { StoryDevotional } from '../components/StoryDevotional';
import { AttendanceScanner } from '../components/AttendanceScanner';

// Static VersES Collection
const VERSES = [
  { text: "For I know the plans I have for you, declares the Lord, plans for welfare and not for evil, to give you a future and a hope.", reference: "Jeremiah 29:11" },
  { text: "I can do all things through him who strengthens me.", reference: "Philippians 4:13" },
  { text: "The Lord is my shepherd; I shall not want.", reference: "Psalm 23:1" },
  { text: "Trust in the Lord with all your heart, and do not lean on your own understanding.", reference: "Proverbs 3:5" },
  { text: "But seek first the kingdom of God and his righteousness, and all these things will be added to you.", reference: "Matthew 6:33" },
  { text: "And we know that for those who love God all things work together for good, for those who are called according to his purpose.", reference: "Romans 8:28" },
  { text: "Let everything that has breath praise the Lord! Praise the Lord!", reference: "Psalm 150:6" },
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
    <div className="glass-card !bg-white/20 backdrop-blur-xl rounded-[2rem] p-5 flex items-center gap-5 border border-white/20 shadow-2xl overflow-hidden group spring-interaction">
      <div className="absolute inset-0 shimmer-bg opacity-10"></div>
      <div className="bg-church-green text-white w-14 h-14 rounded-2xl shadow-xl shadow-church-green/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-700">
        <Clock size={24} />
      </div>
      <div className="relative z-10">
        <p className="text-[10px] text-white/60 font-black uppercase tracking-[0.3em] mb-1">Upcoming Event</p>
        <p className="text-2xl font-black text-white font-mono tracking-tighter">{timeLeft}</p>
      </div>
    </div>
  );
};

interface HomeScreenProps {
  user: UserProfile | null;
  onNavigate: (tab: string) => void;
  onMessageUser?: (target: { uid: string; displayName: string; photoURL?: string }) => void;
  onStoryStateChange?: (isActive: boolean) => void;
}

const HomeView: React.FC<HomeScreenProps> = ({ user, onNavigate, onMessageUser, onStoryStateChange }) => {
  const [showScanner, setShowScanner] = useState(false);

  // Queries
  const sermonQ = useMemo(() => query(collection(db, 'sermons'), orderBy('date', 'desc'), limit(5)), []);
  const eventQ = useMemo(() => query(collection(db, 'events'), where('date', '>=', new Date().toISOString()), orderBy('date', 'asc'), limit(3)), []);

  const { data: recentSermons, loading: sermonsLoading } = useFirestoreQuery<Sermon>(sermonQ);
  const { data: upcomingEvents } = useFirestoreQuery<CalendarEvent>(eventQ);

  const nextEvent = upcomingEvents[0];
  const dailyVerse = useMemo(() => {
    const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
    return VERSES[dayOfYear % VERSES.length];
  }, []);

  if (showScanner) return <AttendanceScanner user={user} onClose={() => setShowScanner(false)} />;

  return (
    <div className="space-y-12 pb-24">
      {/* Top Welcome Bar */}
      <div className="flex items-center justify-between animate-page-enter animate-stagger-1">
        <div className="flex items-center gap-5">
          <div className="relative group">
            <div className="absolute inset-0 bg-church-green blur-lg opacity-20 group-hover:opacity-40 transition-opacity"></div>
            <img
              src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName || 'User'}&background=16a34a&color=fff`}
              className="w-14 h-14 rounded-2xl object-cover border-2 border-white dark:border-white/10 relative z-10 shadow-xl"
              alt="Avatar"
            />
          </div>
          <div>
            <p className="text-[10px] font-black text-church-green uppercase tracking-[0.3em] mb-1 text-left">Welcome Back</p>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter text-left leading-none">
              {user?.displayName ? `Shalom, ${user.displayName.split(' ')[0]}` : 'Shalom, Friend'}
            </h2>
          </div>
        </div>
        <button
          onClick={() => setShowScanner(true)}
          className="w-14 h-14 glass-card !bg-white/50 dark:!bg-white/10 rounded-2xl flex items-center justify-center text-church-green shadow-sm active:scale-95 spring-interaction"
        >
          <QrCode size={24} />
        </button>
      </div>

      {/* Hero Spotlight Section */}
      <section className="relative rounded-[3rem] overflow-hidden shadow-2xl group min-h-[280px] flex items-center animate-page-enter animate-stagger-2 glass-sheen">
        {/* Dynamic Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-church-green via-emerald-800 to-black group-hover:scale-110 transition-transform duration-[5000ms]"></div>
        <div className="absolute inset-0 opacity-30 mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-church-gold/20 rounded-full blur-[120px] -mr-32 -mt-32 animate-pulse-slow"></div>
        <div className="absolute -bottom-24 -left-24 w-[300px] h-[300px] bg-church-green/30 rounded-full blur-[100px] animate-blob"></div>

        <div className="relative z-10 p-10 flex flex-col md:flex-row md:items-center justify-between gap-10 w-full text-left">
          <div className="space-y-6 flex-1">
            <div className="flex items-center gap-3">
              <span className="px-4 py-1.5 bg-white/20 backdrop-blur-xl border border-white/20 text-white text-[9px] font-black uppercase tracking-[0.3em] rounded-full">Daily Focus</span>
              {user?.streak && user.streak.count > 0 && (
                <div className="flex items-center gap-2 px-4 py-1.5 bg-orange-500 text-white text-[9px] font-black uppercase tracking-[0.3em] rounded-full shadow-lg shadow-orange-500/30">
                  <Flame size={12} fill="currentColor" /> {user.streak.count} DAYS STREAK
                </div>
              )}
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-none italic">
              Living with <br />
              <span className="text-church-gold drop-shadow-2xl">Purpose</span>
            </h1>
            <p className="text-white/80 text-sm md:text-base font-medium max-w-md leading-relaxed">
              "Commit your work to the Lord, and your plans will be established." — Proverbs 16:3
            </p>
          </div>

          <div className="md:w-80 shrink-0">
            {nextEvent && <EventCountdown event={nextEvent} />}
          </div>
        </div>
      </section>

      {/* Active Reading Plans Section */}
      <ActivePlansSection user={user} onNavigate={onNavigate} />

      {/* Quick Stats Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-6 animate-page-enter animate-stagger-3">
        <StatCard
          title="Sermons Heard"
          value={user?.stats?.sermonsHeard || 0}
          icon={<BookOpen />}
          color="bg-church-green"
          onClick={() => onNavigate('sermons')}
        />
        <StatCard
          title="Bible Wisdom"
          value={user?.stats?.quizPoints || 0}
          icon={<Star />}
          color="bg-church-gold"
          onClick={() => onNavigate('quiz')}
        />
        <StatCard
          title="Community"
          value={user?.streak?.count || 0}
          icon={<Flame />}
          color="bg-orange-500"
          onClick={() => onNavigate('profile')}
        />
        <StatCard
          title="Bible Knowledge"
          value={user?.stats?.quizzesTaken || 0}
          icon={<Brain />}
          color="bg-blue-500"
          onClick={() => onNavigate('quiz')}
        />
      </section>

      <div className="space-y-16 animate-page-enter animate-stagger-4">
        {/* Story Devotional */}
        <section className="space-y-6">
          <SectionHeader
            title="Daily Word"
            subtitle="A verse to carry with you today."
            icon={<Sparkles className="text-church-gold" />}
          />

          <div className="glass-card p-10 rounded-[3rem] relative overflow-hidden group border border-white/20 dark:border-white/5 shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-church-gold/10 rounded-full blur-[80px] -mr-32 -mt-32"></div>
            <div className="relative z-10 space-y-4">
              <p className="text-2xl md:text-3xl font-serif italic text-gray-900 dark:text-white leading-relaxed tracking-tight group-hover:scale-[1.01] transition-transform duration-700">
                "{dailyVerse.text}"
              </p>
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-gradient-to-r from-church-gold to-transparent"></div>
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-church-gold">{dailyVerse.reference}</span>
              </div>
            </div>
          </div>

          <StoryDevotional onMessageUser={onMessageUser} onStateChange={onStoryStateChange} />
        </section>

        {/* Latest Sermons */}
        <section className="space-y-8">
          <SectionHeader
            title="Recent Sermons"
            subtitle="Catch up on the latest and greatest messages."
            action={
              <button onClick={() => onNavigate('sermons')} className="flex items-center gap-2 text-church-green text-[10px] font-black uppercase tracking-[0.2em] spring-interaction">
                View All <ArrowRight size={14} />
              </button>
            }
          />

          <div className="flex overflow-x-auto gap-8 pb-10 -mx-4 px-4 hide-scrollbar snap-x snap-mandatory">
            {sermonsLoading ? (
              [1, 2, 3].map(i => <div key={i} className="min-w-[300px] snap-center"><SkeletonCard height="h-[450px]" /></div>)
            ) : (
              recentSermons.map((sermon) => (
                <div
                  key={sermon.id}
                  onClick={() => onNavigate('sermons')}
                  className="min-w-[300px] md:min-w-[380px] snap-center group relative aspect-[3/4] rounded-[3rem] overflow-hidden shadow-2xl card-pop active:scale-95 transition-all cursor-pointer"
                >
                  <img
                    src={sermon.coverUrl}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-[5000ms]"
                    alt=""
                    onError={(e) => (e.currentTarget.src = 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&q=80&w=1000')}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent"></div>

                  <div className="absolute top-6 left-6">
                    <span className="px-4 py-2 bg-white/20 backdrop-blur-xl border border-white/20 text-white text-[9px] font-black uppercase tracking-widest rounded-full">{sermon.series || 'Mastery'}</span>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-8 space-y-3 text-left">
                    <h3 className="text-2xl font-black text-white leading-tight tracking-tighter drop-shadow-xl group-hover:text-church-green transition-colors">{sermon.title}</h3>
                    <div className="flex items-center justify-between">
                      <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em] italic">{sermon.speaker}</p>
                      <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white scale-0 group-hover:scale-100 transition-all">
                        <PlayCircle size={20} />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Community Highlight */}
        <section className="glass-card p-10 rounded-[3rem] border border-white/20 dark:border-white/5 relative overflow-hidden group glass-sheen">
          <div className="absolute top-0 right-0 w-64 h-64 bg-church-green/10 rounded-full blur-[80px] -mr-32 -mt-32"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
            <div className="w-24 h-24 bg-church-green/20 rounded-[2rem] flex items-center justify-center text-church-green shrink-0">
              <Users size={48} />
            </div>
            <div className="text-center md:text-left space-y-4">
              <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">Community Hub</h3>
              <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed max-w-lg">
                Join the global Doxa family in our community streams. Share testimonies, prayer requests, and grow with brothers and sisters worldwide.
              </p>
              <button onClick={() => onNavigate('chat')} className="flex items-center gap-3 px-8 py-4 bg-church-green text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-church-green/20 spring-interaction">
                Join the Chat <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

const ActivePlansSection: React.FC<{ user: UserProfile | null, onNavigate: (tab: string) => void }> = ({ user, onNavigate }) => {
  const progressQ = useMemo(() => query(
    collection(db, 'user_plan_progress'),
    where('uid', '==', user?.uid || ''),
    where('status', '==', 'active'),
    limit(3)
  ), [user?.uid]);

  const { data: progressData, loading } = useFirestoreQuery<UserPlanProgress>(progressQ);
  const [plans, setPlans] = useState<ReadingPlan[]>([]);

  // Fetch plan details for active progress
  useEffect(() => {
    if (progressData.length > 0) {
      const fetchPlans = async () => {
        try {
          const planPromises = progressData.map(p => getDoc(doc(db, 'reading_plans', p.planId)));
          const planSnaps = await Promise.all(planPromises);

          const fetchedPlans = planSnaps
            .filter(snap => snap.exists())
            .map(snap => ({ id: snap.id, ...snap.data() } as ReadingPlan));

          setPlans(fetchedPlans);
        } catch (err) {
          console.error("Error fetching home screen plans:", err);
        }
      };
      fetchPlans();
    }
  }, [progressData]);

  if (loading || progressData.length === 0) return null;

  return (
    <section className="space-y-6 animate-page-enter animate-stagger-2.5">
      <SectionHeader
        title="Your Journey"
        subtitle="Keep growing in the Word."
        icon={<Target className="text-church-green" />}
        action={
          <button onClick={() => onNavigate('reading-plans')} className="flex items-center gap-2 text-church-green text-[10px] font-black uppercase tracking-[0.2em] spring-interaction">
            View All Plans <ArrowRight size={14} />
          </button>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan, idx) => {
          const progress = progressData.find(p => p.planId === plan.id);
          const percent = progress ? Math.round((progress.completedDays.length / plan.duration) * 100) : 0;
          return (
            <div
              key={plan.id}
              onClick={() => onNavigate('reading-plans')}
              className="glass-card p-6 rounded-[2.5rem] border border-white/20 active:scale-95 transition-all cursor-pointer group relative overflow-hidden glass-sheen"
            >
              <div className="flex items-center gap-4 mb-4 relative z-10">
                <img src={plan.coverUrl} className="w-12 h-12 rounded-2xl object-cover shadow-lg" alt="" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-sm uppercase tracking-tight truncate dark:text-white group-hover:text-church-green transition-colors">{plan.title}</h4>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{plan.duration - (progress?.completedDays.length || 0)} Days left</p>
                </div>
              </div>

              <div className="space-y-2 relative z-10">
                <div className="flex justify-between items-center text-[9px] font-black text-church-green uppercase tracking-widest">
                  <span>Progress</span>
                  <span>{percent}%</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-church-green transition-all duration-1000"
                    style={{ width: `${percent}%` }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default HomeView;