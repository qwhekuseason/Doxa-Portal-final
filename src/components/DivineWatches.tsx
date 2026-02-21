import React, { useState, useEffect } from 'react';
import { WATCHES, getCurrentWatchIndex } from '../utils/watchUtils';
import { Watch, CloudLightning, Shield, Flame, BookOpen, Sun, Moon, Star, Bell } from 'lucide-react';
import { notifyWatchStart } from '../utils/notificationService';

const IconMap = {
    Watch,
    CloudLightning,
    Shield,
    Flame,
    BookOpen,
    Sun,
    Moon
};

export const DivineWatches: React.FC = () => {
    const [watchIdx, setWatchIdx] = useState(getCurrentWatchIndex());
    const [currentTime, setCurrentTime] = useState(new Date());
    const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
        return localStorage.getItem('watchNotifications') !== 'false';
    });

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(now);
            const newIdx = getCurrentWatchIndex(now);
            if (newIdx !== watchIdx) {
                setWatchIdx(newIdx);
            }
        }, 60000);
        return () => clearInterval(timer);
    }, [watchIdx]);

    const currentWatch = WATCHES[watchIdx];
    const Icon = (IconMap as any)[currentWatch.iconName];

    // Check for watch changes and notify
    useEffect(() => {
        if (currentWatch && notificationsEnabled) {
            const hasNotifiedKey = `notified_${currentWatch.period}_${new Date().toDateString()}`;
            const hasNotified = localStorage.getItem(hasNotifiedKey);

            if (!hasNotified) {
                notifyWatchStart(currentWatch.period, currentWatch.theme);
                localStorage.setItem(hasNotifiedKey, 'true');
            }
        }
    }, [currentWatch, notificationsEnabled]);

    const toggleNotifications = () => {
        const newState = !notificationsEnabled;

        if (newState && 'Notification' in window && Notification.permission === 'denied') {
            alert("Please enable notifications in your browser settings to receive Watch Alerts.");
            return;
        }

        setNotificationsEnabled(newState);
        localStorage.setItem('watchNotifications', String(newState));

        if (newState && 'Notification' in window && Notification.permission !== 'granted') {
            Notification.requestPermission();
        }
    };

    if (!currentWatch) return null;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Current Watch Card - Massive Hero Style */}
            <div className={`relative w-full rounded-[2.5rem] overflow-hidden shadow-premium bg-gradient-to-br ${currentWatch.color} text-white p-8 md:p-12 min-h-[400px] flex flex-col justify-between`}>
                {/* Atmospheric Background */}
                <div className="absolute inset-0 opacity-30 mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}></div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-[80px] -mr-20 -mt-20"></div>

                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3 bg-black/20 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
                            <Icon size={24} />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{currentWatch.period}</span>
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 animate-pulse">{currentWatch.timeRange}</div>
                    </div>

                    <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-4 leading-none glitch-text">
                        {currentWatch.theme}
                    </h2>

                    <div className="flex flex-wrap gap-2 mb-8">
                        {currentWatch.scriptures.map((ref, i) => (
                            <span key={i} className="px-3 py-1 bg-white/20 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/10">
                                {ref}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="relative z-10 glass-card bg-black/20 border-white/10 p-6 rounded-3xl">
                    <div className="flex items-center gap-2 mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-church-gold">
                        <Flame size={14} className="fill-current animate-bounce" />
                        Strategic Prayer Points
                    </div>
                    <ul className="space-y-4">
                        {currentWatch.prayerBullets.map((bullet, i) => (
                            <li key={i} className="flex gap-4 items-start group cursor-pointer hover:bg-white/5 p-2 rounded-xl transition-all">
                                <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black shrink-0 border border-white/20 group-hover:bg-church-green group-hover:border-church-green transition-colors">{i + 1}</span>
                                <p className="text-base md:text-lg font-medium leading-relaxed opacity-90 group-hover:opacity-100">{bullet}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Notification Toggle */}
            <div className="flex items-center justify-between p-6 bg-church-green/5 dark:bg-white/5 rounded-3xl border border-church-green/10">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-church-green/20 text-church-green rounded-2xl">
                        <Bell size={24} />
                    </div>
                    <div>
                        <h4 className="text-sm font-black uppercase tracking-wider dark:text-white">Watch Reminders</h4>
                        <p className="text-xs text-gray-500 font-medium">Get notified when a new watch begins.</p>
                    </div>
                </div>
                <button
                    role="switch"
                    aria-checked={notificationsEnabled}
                    onClick={toggleNotifications}
                    className={`w-14 h-8 rounded-full relative transition-all duration-300 shadow-inner flex-shrink-0 ${notificationsEnabled
                        ? 'bg-church-green shadow-church-green/30'
                        : 'bg-gray-300 dark:bg-white/10'
                        }`}
                >
                    <span
                        className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md
                            transition-transform duration-300 pointer-events-none
                            ${notificationsEnabled ? 'translate-x-6' : 'translate-x-0'}`}
                    />
                </button>
            </div>
        </div>
    );
};
