import React, { useMemo } from 'react';
import { UserProfile } from '../types';
import { Trophy, Star, TrendingUp, BookOpen, Mic, Clock, Shield, Bell } from 'lucide-react';

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

const StatCard: React.FC<{ label: string; value: string; icon: React.ReactNode; color: string }> = ({ label, value, icon, color }) => (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 group">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color} bg-opacity-10 dark:bg-opacity-20`}>
            <div className={`${color.replace('bg-', 'text-')}`}>{icon}</div>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm font-bold uppercase tracking-wide">{label}</p>
        <h3 className="text-3xl font-bold font-serif text-gray-900 dark:text-white mt-1 group-hover:scale-105 transition-transform origin-left">{value}</h3>
    </div>
);

const Badge: React.FC<{ title: string; desc: string; icon: React.ReactNode; locked?: boolean }> = ({ title, desc, icon, locked }) => (
    <div className={`p-4 rounded-xl border flex items-center gap-4 transition-all ${locked
        ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 opacity-60 grayscale'
        : 'bg-white dark:bg-gray-800 border-church-green/30 shadow-sm hover:shadow-md cursor-pointer'
        }`}>
        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl ${locked ? 'bg-gray-200 dark:bg-gray-800 text-gray-400' : 'bg-gradient-to-br from-church-gold to-yellow-500 text-white shadow-lg'}`}>
            {icon}
        </div>
        <div>
            <h4 className="font-bold text-gray-900 dark:text-white">{title}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{desc}</p>
            {locked && <span className="text-[10px] font-bold uppercase bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-500 mt-2 inline-block">Locked</span>}
        </div>
    </div>
);

const JourneyScreen: React.FC<{ user: UserProfile }> = ({ user }) => {

    // --- Dynamic Logic ---
    const stats = user.stats || {};
    const sermonsHeard = stats.sermonsHeard || 0;
    const prayers = stats.prayers || 0;
    const quizXP = stats.quizXP || 0;
    const bookmarks = stats.bookmarks || 0;

    // Calculate Total XP (Example formula)
    const totalXP = (sermonsHeard * 50) + (prayers * 20) + quizXP + (bookmarks * 5);
    const nextLevelXP = Math.ceil((totalXP + 1) / 1000) * 1000;
    const progressPercent = Math.min(100, (totalXP % 1000) / 10); // simplified for demo

    const currentLevel = totalXP > 2000 ? "Kingdom Builder" : totalXP > 1000 ? "Faithful Steward" : "Seeker";

    // Badges Logic
    const badges = [
        { title: "Welcome Home", desc: "Joined the community", icon: "🏠", locked: false },
        { title: "Prayer Warrior", desc: "Submitted 5 prayer requests", icon: "🙏", locked: prayers < 5 },
        { title: "Scholar", desc: "Gained 500 Quiz XP", icon: "🎓", locked: quizXP < 500 },
        { title: "Devoted Listener", desc: "Listened to 10 sermons", icon: "🎧", locked: sermonsHeard < 10 },
        { title: "Bible Student", desc: "Bookmarked 5 chapters", icon: "📖", locked: bookmarks < 5 }
    ];

    return (
        <div className="space-y-8 animate-fade-in-up pb-20">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-gray-100 dark:border-gray-800 pb-6">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-white">Your Spiritual Journey</h1>
                    <p className="text-gray-500 mt-1">Consistency builds character. Keep growing.</p>
                </div>
                <div className="flex items-center gap-2 bg-church-green/10 px-4 py-2 rounded-lg text-church-green font-bold text-sm animate-pulse">
                    <div className="w-2 h-2 rounded-full bg-church-green"></div>
                    <span>Live Updates Active</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Sermons Heard" value={sermonsHeard.toString()} icon={<Mic size={24} />} color="bg-blue-500" />
                <StatCard label="Prayer Requests" value={prayers.toString()} icon={<Trophy size={24} />} color="bg-orange-500" />
                <StatCard label="Bible Quiz XP" value={quizXP.toString()} icon={<Star size={24} />} color="bg-church-gold" />
                <StatCard label="Chapters Bookmarked" value={bookmarks.toString()} icon={<BookOpen size={24} />} color="bg-pink-500" />
            </div>

            {/* Progress & Badges */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Badges List */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-xl font-bold font-serif dark:text-white flex items-center gap-2">
                        <Shield className="text-church-green" size={20} /> Achievements
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {badges.map(b => (
                            <Badge key={b.title} {...b} />
                        ))}
                    </div>
                </div>

                {/* Level Card */}
                <div className="bg-gradient-to-br from-church-green to-emerald-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>

                    <div className="relative z-10">
                        <h3 className="text-lg font-bold opacity-80 uppercase tracking-widest mb-1">Current Level</h3>
                        <div className="text-4xl font-serif font-bold mb-6">{currentLevel}</div>

                        <div className="space-y-2 mb-6">
                            <div className="flex justify-between text-sm font-bold opacity-90">
                                <span>XP Progress</span>
                                <span>{totalXP} / {nextLevelXP}</span>
                            </div>
                            <div className="w-full bg-black/20 rounded-full h-2">
                                <div
                                    className="bg-church-gold h-2 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.5)] transition-all duration-1000"
                                    style={{ width: `${(totalXP % 1000) / 10}%` }}
                                ></div>
                            </div>
                            <div className="text-xs opacity-60 mt-2">{nextLevelXP - totalXP} XP to next level</div>
                        </div>

                        <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                            <div className="flex items-center gap-2 text-sm font-bold mb-2">
                                <Bell size={14} className="text-church-gold" /> Recent Activity
                            </div>
                            <div className="text-xs opacity-80 space-y-2">
                                {bookmarks > 0 && <div>• Bookmarked a chapter</div>}
                                {quizXP > 0 && <div>• Completed a Bible Quiz</div>}
                                {prayers > 0 && <div>• Submitted a Prayer Request</div>}
                                {totalXP === 0 && <div>• Start your journey today!</div>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default JourneyScreen;
