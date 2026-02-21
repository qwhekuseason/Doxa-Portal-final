import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection, query, where, orderBy, addDoc, doc,
  updateDoc, arrayUnion, arrayRemove, getDocs, onSnapshot, limit
} from 'firebase/firestore';
import { db } from '../firebase';
import { useFirestoreQuery } from '../hooks';
import { UserProfile, PrayerRequest } from '../types';
import {
  Heart, Clock, Loader2, AlertTriangle, Send, Shield, Info,
  CheckCircle, Watch, Bell, BellOff, Flame, Moon, Sun, CloudLightning,
  BookOpen, Star, ChevronDown, ChevronUp, Sparkles, Users, Lock,
  Check, Filter, LayoutGrid, List, RefreshCw, Globe, Mic
} from 'lucide-react';
import { SkeletonCard, SectionHeader } from '../components/UIComponents';
import { notifyNewPrayerRequest } from '../utils/notificationService';
import { sendBrowserNotification } from '../utils/notificationService';

// ─── WATCH DATA ────────────────────────────────────────────────
interface WatchData {
  index: number;
  period: string;
  timeRange: string;
  startHour: number;
  endHour: number;
  theme: string;
  scriptures: string[];
  declarations: string[];
  prayerBullets: string[];
  icon: React.ReactNode;
  color: string;
  tint: string;      // CSS color for tinted glass
  tintDark: string;  // dark mode tint
}

const WATCHES: WatchData[] = [
  {
    index: 0,
    period: 'First Watch',
    timeRange: '6:00 PM – 9:00 PM',
    startHour: 18,
    endHour: 21,
    theme: 'Evening Prayer',
    scriptures: ['Matthew 16:18', 'Genesis 24:63'],
    declarations: [
      'I declare this evening belongs to God.',
      'No plan of the enemy shall prosper this night.',
      'I enter God\'s gates with thanksgiving.',
    ],
    prayerBullets: [
      'Father, I take charge of my evening in Jesus\' name.',
      'I silence every negative voice speaking against my future.',
      'Let this evening bring blessings and peace to my household.',
    ],
    icon: <Moon size={22} />,
    color: 'from-emerald-950 via-teal-900 to-black',
    tint: 'rgba(6, 78, 59, 0.45)',
    tintDark: 'rgba(4, 120, 87, 0.25)',
  },
  {
    index: 1,
    period: 'Second Watch',
    timeRange: '9:00 PM – 12:00 AM',
    startHour: 21,
    endHour: 24,
    theme: 'Protection & Safety',
    scriptures: ['Psalm 91:1-16', 'Exodus 11:4'],
    declarations: [
      'The blood of Jesus covers my household.',
      'No evil shall approach my dwelling.',
      'God\'s angels are encamped around me.',
    ],
    prayerBullets: [
      'I cover myself and my family with the blood of Jesus.',
      'No evil shall come near my home tonight.',
      'Let God\'s protection surround where I live.',
    ],
    icon: <Shield size={22} />,
    color: 'from-indigo-950 via-slate-900 to-black',
    tint: 'rgba(30, 27, 75, 0.45)',
    tintDark: 'rgba(49, 46, 129, 0.25)',
  },
  {
    index: 2,
    period: 'Third Watch',
    timeRange: '12:00 AM – 3:00 AM',
    startHour: 0,
    endHour: 3,
    theme: 'Breaking Chains',
    scriptures: ['Acts 16:25', 'Psalm 119:62'],
    declarations: [
      'Every chain of darkness is broken by fire.',
      'I arise and shine for my light has come.',
      'Midnight is my hour of breakthrough.',
    ],
    prayerBullets: [
      'I break every hold of darkness over my life.',
      'Let every limitation be shaken off tonight.',
      'I speak light into every dark situation.',
    ],
    icon: <CloudLightning size={22} />,
    color: 'from-gray-950 via-zinc-900 to-black',
    tint: 'rgba(24, 24, 27, 0.55)',
    tintDark: 'rgba(39, 39, 42, 0.30)',
  },
  {
    index: 3,
    period: 'Fourth Watch',
    timeRange: '3:00 AM – 6:00 AM',
    startHour: 3,
    endHour: 6,
    theme: 'Morning Breakthrough',
    scriptures: ['Psalm 5:3', 'Job 38:12'],
    declarations: [
      'The new day is loaded with my blessings.',
      'Weeping endures for a night but joy comes now.',
      'I command this morning to release divine favour.',
    ],
    prayerBullets: [
      'I speak blessings into this new day.',
      'Let the sunrise bring healing and strength.',
      'I shake off all negativity from my life.',
    ],
    icon: <Star size={22} />,
    color: 'from-emerald-900 via-teal-900 to-slate-900',
    tint: 'rgba(5, 150, 105, 0.30)',
    tintDark: 'rgba(6, 78, 59, 0.20)',
  },
  {
    index: 4,
    period: 'Fifth Watch',
    timeRange: '6:00 AM – 9:00 AM',
    startHour: 6,
    endHour: 9,
    theme: 'Strength for the Day',
    scriptures: ['Psalm 19:2', 'Acts 2:15'],
    declarations: [
      'I am empowered by the Spirit for this day\'s work.',
      'My steps are ordered by the Lord.',
      'Favour surrounds me as a shield.',
    ],
    prayerBullets: [
      'Lord, give me strength for today\'s work.',
      'Guide my steps and keep me from error.',
      'Let your Spirit fill me for service.',
    ],
    icon: <Sun size={22} className="text-yellow-200" />,
    color: 'from-amber-900 via-emerald-900 to-teal-900',
    tint: 'rgba(120, 53, 15, 0.35)',
    tintDark: 'rgba(146, 64, 14, 0.20)',
  },
  {
    index: 5,
    period: 'Sixth Watch',
    timeRange: '9:00 AM – 12:00 PM',
    startHour: 9,
    endHour: 12,
    theme: 'Productivity & Success',
    scriptures: ['Acts 2:41', 'Matthew 20:3'],
    declarations: [
      'My hands are blessed and fruitful.',
      'I operate in uncommon wisdom today.',
      'No weapon of failure shall prosper.',
    ],
    prayerBullets: [
      'I call forth success in my work today.',
      'Bless the work of my hands.',
      'I break every cycle of laziness and failure.',
    ],
    icon: <Flame size={22} />,
    color: 'from-emerald-800 via-green-900 to-teal-900',
    tint: 'rgba(22, 163, 74, 0.30)',
    tintDark: 'rgba(16, 185, 129, 0.15)',
  },
  {
    index: 6,
    period: 'Seventh Watch',
    timeRange: '12:00 PM – 3:00 PM',
    startHour: 12,
    endHour: 15,
    theme: 'Midday Prayer',
    scriptures: ['Acts 10:9', 'Psalm 55:17'],
    declarations: [
      'Heavens are open over my afternoon.',
      'Greater grace connects with me now.',
      'Divine strategies flow to me in this watch.',
    ],
    prayerBullets: [
      'Open the heavens over me this afternoon.',
      'Connect me to greater grace and power.',
      'Give me divine strategies for success.',
    ],
    icon: <Sun size={22} className="text-yellow-300" />,
    color: 'from-amber-800 via-yellow-900 to-emerald-900',
    tint: 'rgba(161, 98, 7, 0.35)',
    tintDark: 'rgba(180, 83, 9, 0.20)',
  },
  {
    index: 7,
    period: 'Eighth Watch',
    timeRange: '3:00 PM – 6:00 PM',
    startHour: 15,
    endHour: 18,
    theme: 'Transformation',
    scriptures: ['Acts 3:1', 'Genesis 3:8'],
    declarations: [
      'God\'s power is transforming my situation.',
      'I walk with God in the cool of the day.',
      'Exchange my weakness for supernatural strength.',
    ],
    prayerBullets: [
      'Let your power change my life.',
      'I walk with you in the cool of the day.',
      'Exchange my weakness for your strength.',
    ],
    icon: <Watch size={22} />,
    color: 'from-teal-800 via-emerald-900 to-green-950',
    tint: 'rgba(15, 118, 110, 0.35)',
    tintDark: 'rgba(5, 150, 105, 0.20)',
  },
];

// ─── HELPERS ───────────────────────────────────────────────────
const getCurrentWatchIndex = (hour: number): number => {
  if (hour >= 18 && hour < 21) return 0;
  if (hour >= 21) return 1;
  if (hour >= 0 && hour < 3) return 2;
  if (hour >= 3 && hour < 6) return 3;
  if (hour >= 6 && hour < 9) return 4;
  if (hour >= 9 && hour < 12) return 5;
  if (hour >= 12 && hour < 15) return 6;
  return 7;
};

const getCountdown = (watch: WatchData, now: Date): string => {
  const end = new Date(now);
  const endHour = watch.endHour === 24 ? 0 : watch.endHour;
  end.setHours(endHour, 0, 0, 0);
  if (end <= now) end.setDate(end.getDate() + 1);
  const diff = end.getTime() - now.getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// ─── TINTED LIQUID GLASS STYLE ─────────────────────────────────
const getLiquidGlassStyle = (tint: string): React.CSSProperties => ({
  background: `linear-gradient(135deg, ${tint.replace('0.45', '0.55')} 0%, ${tint.replace('0.45', '0.30')} 60%, rgba(0,0,0,0.10) 100%)`,
  backdropFilter: 'blur(48px) saturate(220%) brightness(1.12)',
  WebkitBackdropFilter: 'blur(48px) saturate(220%) brightness(1.12)',
  border: `1px solid ${tint.replace('0.45', '0.25')}`,
  boxShadow: `0 8px 32px 0 ${tint.replace('0.45', '0.35')}, inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.12)`,
});

const getCardGlassStyle = (tint: string): React.CSSProperties => ({
  background: `linear-gradient(160deg, ${tint.replace('0.45', '0.22')} 0%, ${tint.replace('0.45', '0.10')} 100%)`,
  backdropFilter: 'blur(32px) saturate(200%)',
  WebkitBackdropFilter: 'blur(32px) saturate(200%)',
  border: `1px solid ${tint.replace('0.45', '0.18')}`,
  boxShadow: `0 4px 24px 0 ${tint.replace('0.45', '0.20')}, inset 0 1px 0 rgba(255,255,255,0.15)`,
});


// ─── DIVINE WATCHES COMPONENT (Enhanced) ───────────────────────
const EnhancedDivineWatches: React.FC = () => {
  const [now, setNow] = useState(new Date());
  const [selectedWatchIndex, setSelectedWatchIndex] = useState<number | null>(null);
  const [expandedWatch, setExpandedWatch] = useState<number | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() =>
    localStorage.getItem('watchNotifications') !== 'false'
  );
  const [praying, setPraying] = useState(false);
  const [prayingIndex, setPrayingIndex] = useState(0);
  const [activeDeclaration, setActiveDeclaration] = useState<string | null>(null);
  const [declarationCopied, setDeclarationCopied] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentIndex = getCurrentWatchIndex(now.getHours());
  const currentWatch = WATCHES[currentIndex];
  const displayWatch = selectedWatchIndex !== null ? WATCHES[selectedWatchIndex] : currentWatch;

  // Notification + watch change detection
  useEffect(() => {
    if (!notificationsEnabled) return;
    const key = `notified_${currentWatch.period}_${now.toDateString()}`;
    if (!localStorage.getItem(key)) {
      sendBrowserNotification(
        `⏰ ${currentWatch.period} Has Begun`,
        `It's time for "${currentWatch.theme}". Time to pray!`,
        'watch-reminder'
      );
      localStorage.setItem(key, 'true');
    }
  }, [currentWatch.period, notificationsEnabled, now.toDateString()]);

  const toggleNotifications = () => {
    const next = !notificationsEnabled;
    if (next && 'Notification' in window && Notification.permission === 'denied') {
      alert('Please enable notifications in browser settings to receive Watch Alerts.');
      return;
    }
    setNotificationsEnabled(next);
    localStorage.setItem('watchNotifications', String(next));
    if (next && 'Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  };

  const startPraying = () => {
    setPraying(true);
    setPrayingIndex(0);
  };

  const nextBullet = () => {
    if (prayingIndex < displayWatch.prayerBullets.length - 1) {
      setPrayingIndex(i => i + 1);
    } else {
      setPraying(false);
    }
  };

  const declareNow = (text: string) => {
    setActiveDeclaration(text);
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
    }
    navigator.clipboard?.writeText(text).catch(() => { });
    setDeclarationCopied(true);
    setTimeout(() => { setActiveDeclaration(null); setDeclarationCopied(false); }, 3000);
  };

  const countdown = getCountdown(displayWatch, now);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── HERO: Current Watch ─────────────────────────────── */}
      <div
        className={`relative w-full rounded-[2.5rem] overflow-hidden bg-gradient-to-br ${displayWatch.color} text-white p-6 md:p-10 min-h-[420px] flex flex-col justify-between`}
        style={{ boxShadow: `0 24px 64px -12px ${displayWatch.tint}` }}
      >
        {/* Atmospheric shimmer */}
        <div className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.5'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}
        />
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-[120px] pointer-events-none"
          style={{ background: displayWatch.tint.replace('0.45', '0.5') }}
        />
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full blur-[100px] pointer-events-none"
          style={{ background: displayWatch.tint.replace('0.45', '0.3') }}
        />

        {/* Header row */}
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3 px-4 py-2 rounded-2xl border border-white/15"
            style={getCardGlassStyle(displayWatch.tint)}>
            {displayWatch.icon}
            <span className="text-[10px] font-black uppercase tracking-[0.22em]">{displayWatch.period}</span>
            {displayWatch.index === currentIndex && (
              <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            )}
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{displayWatch.timeRange}</span>
            <span className="text-lg font-black font-mono tabular-nums opacity-90">{countdown}</span>
          </div>
        </div>

        {/* Title */}
        <div className="relative z-10 flex-1 flex flex-col justify-center py-8">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/50 mb-3">Theme</p>
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-none mb-5">
            {displayWatch.theme}
          </h2>
          {/* Scriptures */}
          <div className="flex flex-wrap gap-2">
            {displayWatch.scriptures.map((ref, i) => (
              <span key={i} className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/15"
                style={getCardGlassStyle(displayWatch.tint)}>
                {ref}
              </span>
            ))}
          </div>
        </div>

        {/* Prayer points card */}
        <div className="relative z-10 rounded-3xl p-5 md:p-6" style={getLiquidGlassStyle(displayWatch.tint)}>
          <div className="flex items-center gap-2 mb-4 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">
            <Flame size={13} className="fill-current animate-bounce" />
            Strategic Prayer Points
          </div>
          <ul className="space-y-3">
            {displayWatch.prayerBullets.map((bullet, i) => (
              <li key={i} className={`flex gap-3 items-start group cursor-pointer p-2.5 rounded-2xl transition-all duration-300 ${praying && prayingIndex === i ? 'bg-white/20 scale-[1.02]' : 'hover:bg-white/10'}`}>
                <span className="w-6 h-6 rounded-full bg-white/20 border border-white/25 flex items-center justify-center text-[10px] font-black shrink-0">
                  {i + 1}
                </span>
                <p className="text-sm md:text-base font-medium leading-relaxed opacity-90">{bullet}</p>
              </li>
            ))}
          </ul>

          {/* Pray button */}
          {!praying ? (
            <button
              onClick={startPraying}
              className="mt-5 w-full py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-[0.25em] transition-all duration-300 hover:scale-[1.02] active:scale-95 bg-white/20 border border-white/25 hover:bg-white/30 text-white flex items-center justify-center gap-2"
            >
              <Flame size={14} className="fill-current" />
              Begin Prayer Session
            </button>
          ) : (
            <div className="mt-5 p-4 rounded-2xl bg-white/25 border border-white/20 flex flex-col gap-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-300 mb-1">
                Praying: {prayingIndex + 1} / {displayWatch.prayerBullets.length}
              </p>
              <p className="text-base font-bold italic leading-relaxed text-white">
                "{displayWatch.prayerBullets[prayingIndex]}"
              </p>
              <button
                onClick={nextBullet}
                className="self-end px-6 py-2.5 rounded-xl bg-white text-emerald-900 font-black text-[11px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
              >
                {prayingIndex < displayWatch.prayerBullets.length - 1 ? 'Next →' : '✓ Amen'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── DECLARATIONS SECTION ───────────────────────────── */}
      <div className="rounded-3xl overflow-hidden" style={getLiquidGlassStyle(WATCHES[currentIndex].tint)}>
        <div className="p-5 md:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl" style={{ background: WATCHES[currentIndex].tint }}>
              <Mic size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.22em] text-white">Faith Declarations</h3>
              <p className="text-[10px] text-white/50 font-medium">Tap any declaration to speak it aloud</p>
            </div>
          </div>
          <div className="space-y-2.5">
            {displayWatch.declarations.map((d, i) => (
              <button
                key={i}
                onClick={() => declareNow(d)}
                className={`w-full text-left px-4 py-3.5 rounded-2xl border transition-all duration-300 flex items-center gap-3 group ${activeDeclaration === d ? 'bg-white/30 border-white/40 scale-[1.02]' : 'bg-white/10 border-white/15 hover:bg-white/20 hover:scale-[1.01]'}`}
              >
                <span className="w-6 h-6 shrink-0 rounded-full bg-white/20 border border-white/25 flex items-center justify-center text-[10px] font-black text-white">
                  {declarationCopied && activeDeclaration === d ? <Check size={10} /> : i + 1}
                </span>
                <p className="text-sm text-white font-medium leading-snug flex-1 italic">"{d}"</p>
                <Mic size={13} className="text-white/40 group-hover:text-white/80 shrink-0 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── ALL 8 WATCHES GRID ──────────────────────────────── */}
      <div>
        <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400 mb-4 ml-1">
          All Prayer Watches
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {WATCHES.map((w) => {
            const isActive = w.index === currentIndex;
            const isSelected = selectedWatchIndex === w.index;
            return (
              <button
                key={w.index}
                onClick={() => setSelectedWatchIndex(isSelected ? null : w.index)}
                className={`relative rounded-2xl p-4 text-left transition-all duration-500 group overflow-hidden ${isSelected ? 'ring-2 ring-white/40 scale-[1.02]' : 'hover:scale-[1.01]'}`}
                style={{
                  ...getLiquidGlassStyle(w.tint),
                  background: `linear-gradient(135deg, ${(w.tint as string).replace('0.45', isActive ? '0.7' : '0.40')} 0%, ${(w.tint as string).replace('0.45', '0.20')} 100%)`,
                }}
              >
                {isActive && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]" />
                )}
                <div className="text-white/80 mb-2 group-hover:scale-110 transition-transform duration-300">{w.icon}</div>
                <p className="text-[9px] font-black uppercase tracking-widest text-white/50 mb-0.5">{w.period}</p>
                <p className="text-xs font-black text-white leading-tight">{w.theme}</p>
                <p className="text-[9px] text-white/40 font-mono mt-1.5">{w.timeRange}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── EXPANDED WATCH DETAIL ────────────────────────────── */}
      {expandedWatch !== null && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div
            className={`w-full max-w-lg rounded-[2.5rem] overflow-hidden bg-gradient-to-br ${WATCHES[expandedWatch].color} text-white animate-fade-in-up`}
            style={getLiquidGlassStyle(WATCHES[expandedWatch].tint)}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">{WATCHES[expandedWatch].icon}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{WATCHES[expandedWatch].timeRange}</p>
                    <h3 className="text-xl font-black">{WATCHES[expandedWatch].period}</h3>
                  </div>
                </div>
                <button onClick={() => setExpandedWatch(null)} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
                  <ChevronDown size={20} />
                </button>
              </div>
              <h4 className="text-3xl font-black tracking-tighter mb-4">{WATCHES[expandedWatch].theme}</h4>
              <ul className="space-y-3 mb-6">
                {WATCHES[expandedWatch].prayerBullets.map((b, i) => (
                  <li key={i} className="flex gap-3 items-start text-sm">
                    <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[9px] font-black shrink-0">{i + 1}</span>
                    <p className="leading-relaxed">{b}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ── NOTIFICATION TOGGLE ─────────────────────────────── */}
      <div className="flex items-center justify-between p-5 md:p-6 rounded-3xl border"
        style={getCardGlassStyle(currentWatch.tint)}>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl" style={{ background: currentWatch.tint }}>
            {notificationsEnabled ? <Bell size={22} className="text-white" /> : <BellOff size={22} className="text-white/60" />}
          </div>
          <div>
            <h4 className="text-sm font-black uppercase tracking-wider dark:text-white">Watch Reminders</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
              Get notified when a new watch begins
            </p>
          </div>
        </div>
        <button
          onClick={toggleNotifications}
          className={`relative w-14 h-8 rounded-full transition-all duration-300 flex-shrink-0 ${notificationsEnabled ? 'bg-church-green shadow-church-green/30' : 'bg-gray-300 dark:bg-white/10'}`}
        >
          <span className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 pointer-events-none ${notificationsEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
        </button>
      </div>
    </div>
  );
};


// ─── PRAYER WALL VIEW ──────────────────────────────────────────
const CATEGORIES = ['All', 'Health', 'Family', 'Finance', 'Guidance', 'Deliverance', 'Thanksgiving', 'Other'];

const PrayerWallView: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'requests' | 'watches' | 'community'>('watches');
  const [newRequest, setNewRequest] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState('Other');
  const [filterCategory, setFilterCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [communityPrayers, setCommunityPrayers] = useState<PrayerRequest[]>([]);
  const [communityLoading, setCommunityLoading] = useState(true);
  const [prayingFor, setPrayingFor] = useState<string | null>(null);

  // Current watch for tint colour
  const now = new Date();
  const currentWatchTint = WATCHES[getCurrentWatchIndex(now.getHours())].tint;

  const { data: requests, loading, error } = useFirestoreQuery<PrayerRequest>(
    useMemo(() => query(
      collection(db, 'prayer_requests'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    ), [user.uid])
  );

  // Community prayers (approved)
  useEffect(() => {
    setCommunityLoading(true);
    const q = query(
      collection(db, 'prayer_requests'),
      where('approved', '==', true),
      where('isPrivate', '==', false),
      orderBy('createdAt', 'desc'),
      limit(30)
    );
    const unsub = onSnapshot(q, (snap) => {
      setCommunityPrayers(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as PrayerRequest)));
      setCommunityLoading(false);
    }, () => setCommunityLoading(false));
    return unsub;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequest.trim()) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'prayer_requests'), {
        uid: user.uid,
        authorName: isPrivate ? 'Anonymous' : user.displayName || 'Anonymous',
        content: newRequest,
        isPrivate,
        category,
        approved: false,
        prayedBy: [],
        prayedCount: 0,
        createdAt: new Date().toISOString(),
      });
      await notifyNewPrayerRequest(isPrivate ? 'Someone' : user.displayName || 'Anonymous');
      setNewRequest('');
      setIsPrivate(false);
      setCategory('Other');
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrayFor = async (req: PrayerRequest) => {
    if (prayingFor === req.id) return;
    setPrayingFor(req.id);
    try {
      const ref = doc(db, 'prayer_requests', req.id);
      const alreadyPrayed = req.prayedBy?.includes(user.uid);
      await updateDoc(ref, {
        prayedBy: alreadyPrayed ? arrayRemove(user.uid) : arrayUnion(user.uid),
        prayedCount: (req.prayedCount || 0) + (alreadyPrayed ? -1 : 1),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setPrayingFor(null);
    }
  };

  const filteredCommunity = filterCategory === 'All'
    ? communityPrayers
    : communityPrayers.filter(p => (p as any).category === filterCategory);

  const tabs = [
    { id: 'watches', label: 'Watches', icon: <Watch size={13} /> },
    { id: 'requests', label: 'My Prayers', icon: <Heart size={13} /> },
    { id: 'community', label: 'Community', icon: <Users size={13} /> },
  ] as const;

  return (
    <div className="space-y-8 animate-fade-in pb-24">
      <SectionHeader
        title="Prayer Portal"
        subtitle="Connect with God through watches, declarations, and community prayer."
        icon={<Flame size={22} />}
      />

      {/* ── TAB NAVIGATION ─── */}
      <div className="flex p-1.5 rounded-3xl border border-white/10 dark:border-white/5 max-w-lg mx-auto"
        style={getCardGlassStyle(currentWatchTint)}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === t.id
              ? 'bg-white/90 dark:bg-white/15 text-emerald-800 dark:text-white shadow-sm scale-[1.02]'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ══════════ WATCHES TAB ══════════ */}
      {activeTab === 'watches' && <EnhancedDivineWatches />}

      {/* ══════════ MY PRAYERS TAB ══════════ */}
      {activeTab === 'requests' && (
        <div className="space-y-10 animate-fade-in">
          {/* Submit form */}
          <section className="relative rounded-[2.5rem] overflow-hidden shadow-2xl"
            style={{ boxShadow: `0 20px 60px -20px ${currentWatchTint}` }}>
            <div className={`absolute inset-0 bg-gradient-to-br ${WATCHES[getCurrentWatchIndex(new Date().getHours())].color}`} />
            <div className="absolute top-0 right-0 w-72 h-72 rounded-full blur-[120px] pointer-events-none opacity-50"
              style={{ background: currentWatchTint }} />

            <div className="relative z-10 p-6 md:p-10">
              <div className="max-w-3xl">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2.5 rounded-xl bg-white/15 border border-white/20 text-amber-300">
                    <Heart size={20} className="fill-current" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/70">
                    Submit Prayer Request
                  </span>
                </div>

                <h2 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tighter leading-tight">
                  A Community{' '}
                  <span className="text-gradient-gold">Built on Prayer.</span>
                </h2>

                <p className="text-sm text-white/70 mb-8 font-medium leading-relaxed italic">
                  "For where two or three are gathered in my name, there am I among them." — Matthew 18:20
                </p>

                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* Category */}
                  <div className="flex flex-wrap gap-2 mb-1">
                    {CATEGORIES.slice(1).map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${category === cat
                          ? 'bg-white text-emerald-900 border-white'
                          : 'bg-white/10 text-white/70 border-white/15 hover:bg-white/20'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-white/20 overflow-hidden"
                    style={{ background: 'rgba(0,0,0,0.15)', backdropFilter: 'blur(20px)' }}>
                    <textarea
                      value={newRequest}
                      onChange={e => setNewRequest(e.target.value)}
                      placeholder="Share your prayer request with the community..."
                      rows={3}
                      className="w-full bg-transparent border-none text-white placeholder-white/40 px-5 py-4 focus:ring-0 outline-none font-medium text-sm resize-none"
                    />
                    <div className="flex items-center gap-4 p-3 border-t border-white/10">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <div
                          onClick={() => setIsPrivate(!isPrivate)}
                          className={`w-10 h-5 rounded-full relative transition-all duration-300 ${isPrivate ? 'bg-amber-400' : 'bg-white/20'}`}
                        >
                          <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${isPrivate ? 'translate-x-5' : ''}`} />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/70 flex items-center gap-1">
                          <Lock size={9} /> Private
                        </span>
                      </label>

                      <button
                        type="submit"
                        disabled={submitting || !newRequest.trim()}
                        className="ml-auto flex items-center gap-2 bg-white text-emerald-900 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50"
                      >
                        {submitting ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                        Submit
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-white/40 ml-1">
                    <Shield size={11} />
                    <span>Requests are moderated for safety and respect.</span>
                  </div>
                </form>
              </div>
            </div>
          </section>

          {/* Firestore index error */}
          {error && error.message.includes('requires an index') && (
            <div className="p-5 rounded-3xl border border-amber-500/20 bg-amber-500/5 flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl"><AlertTriangle size={22} /></div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Index Required</p>
                <p className="text-sm text-gray-500 mt-0.5">Check your console to create the Firestore index.</p>
              </div>
            </div>
          )}

          {/* My requests header */}
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">My Requests</h3>
            <div className="px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest"
              style={{ ...getCardGlassStyle(currentWatchTint), color: 'white' }}>
              {requests.length} Total
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3].map(i => <SkeletonCard key={i} height="h-48" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {requests.map((req, idx) => (
                <div
                  key={req.id}
                  className="group rounded-[2rem] p-6 flex flex-col animate-fade-in-up transition-all duration-500 hover:scale-[1.02]"
                  style={{
                    ...getCardGlassStyle(currentWatchTint),
                    animationDelay: `${idx * 50}ms`,
                    border: req.approved ? '1px solid rgba(255,255,255,0.15)' : '1px dashed rgba(255,255,255,0.12)',
                  }}
                >
                  <div className="flex items-center gap-3 mb-5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${req.approved ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/15 text-amber-400 border-amber-500/20'}`}>
                      <Heart size={22} className={req.approved ? 'fill-current' : ''} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                        {req.approved ? 'Active & Approved' : 'Under Review'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${req.approved ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-300">
                          {req.isPrivate ? 'Private' : 'Standard'}
                          {(req as any).category ? ` · ${(req as any).category}` : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="flex-1 font-serif text-base text-gray-800 dark:text-gray-100 italic leading-relaxed">
                    {req.content}
                  </p>

                  <div className="mt-5 pt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-[9px] font-black uppercase tracking-tight text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <Clock size={10} />
                      {new Date(req.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    {req.prayedCount != null && req.prayedCount > 0 && (
                      <div className="flex items-center gap-1 text-emerald-500">
                        <Heart size={10} className="fill-current" />
                        {req.prayedCount} praying
                      </div>
                    )}
                    {req.completed && (
                      <div className="flex items-center gap-1 text-emerald-500">
                        <CheckCircle size={10} /> Answered!
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {requests.length === 0 && (
                <div className="col-span-full py-20 text-center rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-white/10">
                  <Info size={40} className="text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No prayer requests yet</p>
                  <p className="text-gray-300 dark:text-gray-600 text-xs mt-2">Submit your first prayer request above</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════ COMMUNITY TAB ══════════ */}
      {activeTab === 'community' && (
        <div className="space-y-8 animate-fade-in">
          {/* Community header */}
          <div className="relative rounded-[2.5rem] overflow-hidden p-6 md:p-8 text-white"
            style={{
              background: `linear-gradient(135deg, ${currentWatchTint.replace('0.45', '0.70')} 0%, rgba(0,0,0,0.85) 100%)`,
              boxShadow: `0 16px 48px -12px ${currentWatchTint}`,
            }}>
            <div className="absolute inset-0 opacity-20 pointer-events-none"
              style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.15) 0%, transparent 60%)' }} />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Globe size={14} className="text-white/60" />
                  <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/60">Community Prayer Wall</span>
                </div>
                <h2 className="text-2xl md:text-4xl font-black tracking-tighter leading-tight">
                  Pray for Your <br className="hidden md:block" />Brothers & Sisters
                </h2>
                <p className="text-white/60 text-sm font-medium mt-2">
                  Intercede for the community — one prayer can change a life.
                </p>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-2xl border border-white/15"
                style={{ background: 'rgba(255,255,255,0.08)' }}>
                <Users size={20} className="text-white/70" />
                <div>
                  <p className="text-xl font-black">{communityPrayers.length}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/50">Active Requests</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filter + view toggle */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter size={13} className="text-gray-400" />
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${filterCategory === cat
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:border-emerald-500/30'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="sm:ml-auto flex items-center gap-2">
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="p-2.5 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors border border-gray-200 dark:border-white/10"
              >
                {viewMode === 'grid' ? <List size={14} /> : <LayoutGrid size={14} />}
              </button>
            </div>
          </div>

          {communityLoading ? (
            <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-6`}>
              {[1, 2, 3].map(i => <SkeletonCard key={i} height="h-40" />)}
            </div>
          ) : filteredCommunity.length === 0 ? (
            <div className="py-24 text-center rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-white/10">
              <Sparkles size={40} className="text-gray-300 dark:text-gray-700 mx-auto mb-4" />
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No community prayers yet</p>
              <p className="text-gray-300 dark:text-gray-600 text-xs mt-2">Be the first to submit a prayer request</p>
            </div>
          ) : (
            <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-5`}>
              {filteredCommunity.map((req, idx) => {
                const hasPrayed = req.prayedBy?.includes(user.uid) ?? false;
                const isProcessing = prayingFor === req.id;
                return (
                  <div
                    key={req.id}
                    className="group rounded-[2rem] p-5 flex flex-col transition-all duration-500 hover:scale-[1.01]"
                    style={{
                      ...getCardGlassStyle(currentWatchTint),
                      animationDelay: `${idx * 40}ms`,
                    }}
                  >
                    {/* Author */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-black text-sm border border-emerald-500/20">
                        {req.authorName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-black text-gray-800 dark:text-white">{req.authorName}</p>
                        <p className="text-[9px] text-gray-400 font-mono">
                          {new Date(req.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          {(req as any).category ? ` · ${(req as any).category}` : ''}
                        </p>
                      </div>
                    </div>

                    {/* Content */}
                    <p className="flex-1 font-serif text-sm text-gray-700 dark:text-gray-200 italic leading-relaxed mb-5">
                      "{req.content}"
                    </p>

                    {/* Pray button */}
                    <button
                      onClick={() => handlePrayFor(req)}
                      disabled={isProcessing}
                      className={`w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 border ${hasPrayed
                        ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/25 hover:bg-emerald-500/25'
                        : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/20'} hover:scale-[1.02] active:scale-95 disabled:opacity-60`}
                    >
                      {isProcessing ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Heart size={13} className={hasPrayed ? 'fill-current' : ''} />
                      )}
                      {hasPrayed ? 'Praying for this' : 'I will pray for this'}
                      {(req.prayedCount ?? 0) > 0 && (
                        <span className={`ml-auto px-2 py-0.5 rounded-full text-[9px] font-black ${hasPrayed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400'}`}>
                          {req.prayedCount}
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PrayerWallView;
