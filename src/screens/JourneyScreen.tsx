import React, { useMemo } from 'react';
import { UserProfile } from '../types';
import { Trophy, Star, TrendingUp, BookOpen, Mic, Clock, Shield, Bell, Zap, Heart, Award, ArrowUpRight } from 'lucide-react';
import { SectionHeader, StatCard as UIStatCard } from '../components/UIComponents';

// Helper if date-fns is missing
const timeAgo = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
};

const Badge: React.FC<{ title: string; desc: string; icon: string; locked?: boolean; index: number }> = ({ title, desc, icon, locked, index }) => (
    <div
        className={`group p-6 rounded-[2rem] border-2 transition-all duration-700 animate-fade-in-up flex flex-col items-center text-center ${locked
                ? 'bg-gray-50/50 dark:bg-white/5 border-gray-100 dark:border-white/5 opacity-40 grayscale scale-95'
                : 'glass-card border-white/40 dark:border-white/5 shadow-premium hover:shadow-premium-lg hover:-translate-y-2'
            }`}
        style={{ animationDelay: `${index * 0.1}s` }}
    >
        <div className={`w-20 h-20 rounded-[2rem] mb-6 flex items-center justify-center text-4xl shadow-2xl transition-transform duration-700 group-hover:scale-110 group-hover:rotate-12 ${locked
                ? 'bg-gray-200 dark:bg-white/10 text-gray-400'
                : 'bg-gradient-to-br from-church-gold to-amber-600 text-white shadow-church-gold/30'
            }`}>
            {icon}
        </div>
        <h4 className="font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-2">{title}</h4>
        <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 leading-relaxed uppercase tracking-widest">{desc}</p>

        {locked && (
            <div className="mt-4 px-3 py-1 bg-gray-200 dark:bg-white/10 rounded-full text-[8px] font-black uppercase tracking-widest text-gray-500">
                Locked Quest
            </div>
        )}
    </div>
);

const JourneyScreen: React.FC<{ user: UserProfile }> = ({ user }) => {

    // --- Dynamic Logic ---
    const stats = user.stats || {};
    const sermonsHeard = stats.sermonsHeard || 0;
    const prayers = stats.prayers || 0;
    const quizXP = stats.quizXP || 0;
    const bookmarks = stats.bookmarks || 0;

    const totalXP = (sermonsHeard * 50) + (prayers * 20) + quizXP + (bookmarks * 5);
    const nextLevelXP = Math.ceil((totalXP + 1) / 1000) * 1000;
    const progressPercent = Math.min(100, (totalXP % 1000) / 10);

    const currentLevel = totalXP > 2000 ? "Kingdom Builder" : totalXP > 1000 ? "Faithful Steward" : "Seeker";

    const badges = [
        { title: "First Steps", desc: "Joined the Doxa community", icon: "🏠", locked: false },
        { title: "Prayer Warrior", desc: "5 prayer requests submitted", icon: "🙏", locked: prayers < 5 },
        { title: "Bible Scholar", desc: "Gained 500 Quiz Experience", icon: "🎓", locked: quizXP < 500 },
        { title: "Word Devotee", desc: "10 sermons absorbed", icon: "🎧", locked: sermonsHeard < 10 },
        { title: "Truth Seeker", desc: "5 chapters bookmarked", icon: "📖", locked: bookmarks < 5 }
    ];

    return (
        <div className="space-y-12 animate-fade-in pb-20">

            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
                <SectionHeader
                    title="Spiritual Journey"
                    subtitle="Visualize your path of faith. Every sermon heard and prayer shared is a step closer to the Divine."
                />

                <div className="flex items-center gap-3 px-6 py-3 glass-card border-none bg-church-green/5 rounded-2xl animate-pulse">
                    <div className="w-2 h-2 rounded-full bg-church-green shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
                    <span className="text-[10px] font-black text-church-green uppercase tracking-widest">Divine Sync Active</span>
                </div>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <UIStatCard title="Sermons" value={sermonsHeard} icon={<Mic />} color="bg-blue-500" trend="Faithful Listener" />
                <UIStatCard title="Prayers" value={prayers} icon={<Heart />} color="bg-rose-500" trend="Warrior Spirit" />
                <UIStatCard title="Quiz XP" value={quizXP} icon={<Zap />} color="bg-church-gold" trend="Wisdom Seeker" />
                <UIStatCard title="Bookmarks" value={bookmarks} icon={<BookOpen />} color="bg-emerald-500" trend="Verse Keeper" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Level Detail Card */}
                <div className="lg:col-span-1">
                    <div className="glass-card rounded-[3rem] p-10 shadow-premium border-white/40 relative overflow-hidden h-full flex flex-col justify-between">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-church-green/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>

                        <div className="relative z-10">
                            <div className="w-16 h-16 bg-gradient-to-br from-church-green to-emerald-800 rounded-2xl flex items-center justify-center text-white shadow-xl mb-8">
                                <TrendingUp size={32} />
                            </div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Current Standing</p>
                            <h3 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter uppercase mb-2 leading-none">{currentLevel}</h3>
                            <div className="flex items-center gap-2 mb-10">
                                <span className="w-8 h-1 bg-church-gold rounded-full"></span>
                                <span className="text-[10px] font-black text-church-gold uppercase tracking-widest">Level Mastery</span>
                            </div>
                        </div>

                        <div className="relative z-10 space-y-6">
                            <div className="space-y-3">
                                <div className="flex justify-between items-end">
                                    <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Global XP</span>
                                    <span className="text-xl font-black text-church-green tracking-tighter">{totalXP} / {nextLevelXP}</span>
                                </div>
                                <div className="w-full h-3 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden p-0.5 border border-gray-100 dark:border-white/5 shadow-inner">
                                    <div
                                        className="h-full bg-gradient-to-r from-church-green to-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all duration-[2000ms]"
                                        style={{ width: `${progressPercent}%` }}
                                    ></div>
                                </div>
                                <p className="text-[9px] font-black text-gray-400 text-right uppercase tracking-[0.2em]">{nextLevelXP - totalXP} XP remaining for promotion</p>
                            </div>

                            <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-[2rem] border border-gray-100 dark:border-white/5">
                                <div className="flex items-center gap-3 mb-4">
                                    <Bell size={14} className="text-church-gold" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">Divine Echoes</span>
                                </div>
                                <div className="space-y-3">
                                    {[
                                        { text: "Absorbed 'Faith over Fear' sermon", time: "2h ago" },
                                        { text: "Earned Wisdom Badge in NT Trivia", time: "Yesterday" },
                                        { text: "Interceded for Brother John's health", time: "2d ago" }
                                    ].map((act, i) => (
                                        <div key={i} className="flex justify-between items-center group/item cursor-pointer">
                                            <p className="text-[10px] font-bold text-gray-800 dark:text-gray-200 group-hover/item:text-church-green transition-colors leading-tight">{act.text}</p>
                                            <span className="text-[8px] font-black text-gray-400 uppercase min-w-[40px] text-right">{act.time}</span>
                                        </div>
                                    ))}
                                </div>
                                <button className="w-full mt-6 text-[9px] font-black uppercase tracking-widest text-church-green flex items-center justify-center gap-2 group">
                                    View Hall of Fame <ArrowUpRight size={14} className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Achievements List */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter uppercase flex items-center gap-4">
                            <Award className="text-church-gold" size={28} /> Divine Accolades
                        </h2>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            {badges.filter(b => !b.locked).length} / {badges.length} Collected
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {badges.map((b, i) => (
                            <Badge key={b.title} {...b} index={i} />
                        ))}
                    </div>

                    {/* Locked Reward Banner */}
                    <div className="mt-8 p-10 bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[3rem] text-white relative overflow-hidden group">
                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '20px 20px' }}></div>
                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                            <div className="w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-church-gold shadow-2xl group-hover:scale-110 transition-transform duration-700">
                                <Trophy size={40} className="animate-float" />
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h4 className="text-2xl font-black uppercase tracking-tighter mb-2">Grandmaster Revelation</h4>
                                <p className="text-xs text-white/60 font-medium leading-relaxed max-w-md">Reach 5,000 Total XP to unlock the secret Grandmaster portal and exclusive community features.</p>
                            </div>
                            <div className="px-8 py-4 bg-church-gold text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-church-gold/20">
                                Level Up
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JourneyScreen;
