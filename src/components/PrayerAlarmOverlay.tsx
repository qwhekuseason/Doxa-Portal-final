
import React, { useEffect, useState } from 'react';
import { WATCHES, getCurrentWatchIndex } from '../utils/watchUtils';
import { Watch, CloudLightning, Shield, Flame, BookOpen, Sun, Moon, X, Bell, Hand, ArrowRight } from 'lucide-react';

interface PrayerAlarmOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    onJoin: () => void;
}

const IconMap = {
    Watch,
    CloudLightning,
    Shield,
    Flame,
    BookOpen,
    Sun,
    Moon
};

export const PrayerAlarmOverlay: React.FC<PrayerAlarmOverlayProps> = ({ isOpen, onClose, onJoin }) => {
    const [watchIdx, setWatchIdx] = useState(getCurrentWatchIndex());

    useEffect(() => {
        if (isOpen) {
            setWatchIdx(getCurrentWatchIndex());
            // Play a subtle vibration if supported
            if ('vibrate' in navigator) {
                navigator.vibrate([200, 100, 200]);
            }
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const watch = WATCHES[watchIdx];
    const Icon = IconMap[watch.iconName];

    return (
        <div className="fixed inset-0 z-[3000] bg-black animate-in fade-in duration-500 overflow-hidden flex flex-col">
            {/* Atmospheric Background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${watch.color} opacity-40 mix-blend-color-dodge`}></div>
            <div className="liquid-bg opacity-30"></div>

            {/* Floating Blobs */}
            <div className="absolute top-1/4 -left-20 w-80 h-80 bg-church-green/30 rounded-full blur-[100px] animate-blob"></div>
            <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-church-gold/30 rounded-full blur-[100px] animate-blob" style={{ animationDelay: '-3s' }}></div>

            {/* Content Area */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center">

                {/* Alarm Icon & Label */}
                <div className="mb-12 animate-in slide-in-from-top-10 duration-700">
                    <div className="w-24 h-24 rounded-[2.5rem] bg-white/10 backdrop-blur-3xl border border-white/20 flex items-center justify-center mb-6 mx-auto relative group">
                        <div className="absolute inset-0 bg-white/10 rounded-[2.5rem] animate-ping opacity-20"></div>
                        <Icon size={48} className="text-white group-hover:scale-110 transition-transform" />
                    </div>
                    <p className="text-sm font-black text-church-gold uppercase tracking-[0.5em] animate-pulse">It's Time to Pray</p>
                </div>

                {/* Watch Title */}
                <div className="mb-12 space-y-4 animate-in fade-in zoom-in duration-1000 delay-300">
                    <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase leading-none">
                        {watch.period}
                    </h1>
                    <p className="text-xl font-medium text-white/60 italic font-serif">
                        "{watch.theme}"
                    </p>
                </div>

                {/* Scriptures */}
                <div className="flex flex-wrap justify-center gap-2 mb-16 animate-in slide-in-from-bottom-10 duration-700 delay-500">
                    {watch.scriptures.map((ref, i) => (
                        <span key={i} className="px-5 py-2 bg-white/5 backdrop-blur-xl rounded-2xl text-[10px] font-black text-white uppercase tracking-widest border border-white/10">
                            {ref}
                        </span>
                    ))}
                </div>

                {/* Action Buttons */}
                <div className="w-full max-w-sm space-y-4 animate-in fade-in duration-700 delay-700">
                    <button
                        onClick={onJoin}
                        className="w-full py-6 bg-church-green text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-church-green/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                        <Hand size={20} className="animate-bounce" /> Join the Watch
                    </button>

                    <button
                        onClick={onClose}
                        className="w-full py-6 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-2"
                    >
                        Dismiss for now
                    </button>
                </div>
            </div>

            {/* Close Button Top Right */}
            <button
                onClick={onClose}
                className="absolute top-10 right-8 p-4 text-white/40 hover:text-white transition-colors active:scale-90"
            >
                <X size={28} />
            </button>
        </div>
    );
};
