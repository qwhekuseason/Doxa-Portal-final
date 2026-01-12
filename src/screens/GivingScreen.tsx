import React, { useState } from 'react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirestoreDoc } from '../hooks';
import { SiteSettings, GivingStats } from '../types';
import {
    Heart,
    Lock,
    CreditCard,
    Smartphone,
    Globe,
    CheckCircle2,
    ArrowRight,
    Sparkles,
    Hand,
    Coins,
    TrendingUp,
    HelpingHand,
    Users
} from 'lucide-react';
import { SectionHeader } from '../components/UIComponents';

// Define doc refs outside to ensure stability
const settingsRef = doc(db, 'site_settings', 'global');
const statsRef = doc(db, 'giving_stats', 'weekly');

const GivingScreen: React.FC = () => {
    const [amount, setAmount] = useState<string>('');
    const [frequency, setFrequency] = useState<'once' | 'monthly'>('once');
    const [category, setCategory] = useState<string>('General');
    const [step, setStep] = useState<1 | 2>(1);

    const handleGive = async () => {
        if (!amount) return;
        const val = parseFloat(amount.replace(/,/g, ''));
        if (isNaN(val) || val <= 0) {
            alert("Please enter a valid amount.");
            return;
        }

        try {
            await updateDoc(statsRef, { currentProgress: increment(val) });
            alert(`Bless you! You gave GH₵${val}. The weekly goal has been updated.`);
            setAmount('');
        } catch (e) {
            console.error(e);
            alert("Transaction failed. Please try again.");
        }
    };

    const { data: settings } = useFirestoreDoc<SiteSettings>(settingsRef);
    const { data: stats } = useFirestoreDoc<GivingStats>(statsRef);

    const categories = settings?.givingCategories || ['General', 'Tithes', 'Missions', 'Building Fund', 'Youth Ministry'];
    const presetAmounts = settings?.givingAmounts || ['50', '100', '200', '500', '1000'];

    const getImpactIcon = (label: string) => {
        const l = label.toLowerCase();
        if (l.includes('mission') || l.includes('outreach')) return <Globe size={16} />;
        if (l.includes('build') || l.includes('fund')) return <HelpingHand size={16} />;
        if (l.includes('community') || l.includes('youth') || l.includes('people')) return <Users size={16} />;
        return <Sparkles size={16} />;
    };

    const impactItems = stats?.impactBreakdown || [
        { label: 'Ministry Operations', percent: 45 },
        { label: 'Missions & Outreach', percent: 30 },
        { label: 'Building Fund', percent: 15 },
        { label: 'Community Support', percent: 10 }
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-12 pb-20 animate-fade-in-up">
            <SectionHeader
                title="Generosity & Giving"
                subtitle="Your contributions fuel our mission to spread the gospel and serve our community."
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Side: Giving Form */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-card p-6 md:p-8 rounded-3xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                            <Coins size={120} className="text-church-green rotate-12" />
                        </div>

                        {/* Frequency */}
                        <div className="flex bg-gray-100 dark:bg-white/5 p-1.5 rounded-2xl mb-8 relative w-fit">
                            <button
                                onClick={() => setFrequency('once')}
                                className={`relative z-10 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors rounded-xl ${frequency === 'once' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400'}`}
                            >
                                Give Once
                            </button>
                            <button
                                onClick={() => setFrequency('monthly')}
                                className={`relative z-10 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors rounded-xl ${frequency === 'monthly' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400'}`}
                            >
                                Monthly
                            </button>
                        </div>

                        {/* Amount Input */}
                        <div className="mb-8">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2 mb-2 block">Amount (GHS)</label>
                            <div className="relative">
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-300">₵</span>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-3xl py-6 pl-12 pr-6 text-4xl font-black text-gray-900 dark:text-white outline-none focus:border-church-green/50 focus:ring-4 focus:ring-church-green/10 transition-all placeholder:text-gray-200"
                                />
                            </div>
                        </div>

                        {/* Presets */}
                        <div className="grid grid-cols-4 md:grid-cols-5 gap-3 mb-8">
                            {presetAmounts.map((amt) => (
                                <button
                                    key={amt}
                                    onClick={() => setAmount(amt)}
                                    className={`py-3 rounded-xl border-2 text-xs font-bold transition-all ${amount === amt
                                        ? 'border-church-green bg-church-green text-white shadow-lg shadow-church-green/30'
                                        : 'border-transparent bg-gray-50 dark:bg-white/5 text-gray-500 hover:border-gray-200 hover:bg-white dark:hover:bg-white/10'}`}
                                >
                                    {amt}
                                </button>
                            ))}
                        </div>

                        {/* Categories */}
                        <div className="mb-8">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2 mb-2 block">Fund Destination</label>
                            <div className="flex flex-wrap gap-3">
                                {categories.map((cat) => (
                                    <button
                                        key={cat}
                                        onClick={() => setCategory(cat)}
                                        className={`px-4 py-2.5 rounded-xl border-2 text-[10px] font-black uppercase tracking-wide transition-all ${category === cat
                                            ? 'border-church-gold bg-church-gold/10 text-church-gold'
                                            : 'border-transparent bg-gray-50 dark:bg-white/5 text-gray-500 hover:border-gray-200 dark:hover:border-white/10'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Submit */}
                        {/* Action Button */}
                        <button onClick={handleGive} className="w-full bg-church-green hover:bg-emerald-700 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-premium hover:shadow-church-green/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                            <Heart fill="currentColor" size={18} />
                            {frequency === 'monthly' ? 'Start Monthly Giving' : 'Give Now'}
                        </button>

                        <div className="mt-6 flex items-center justify-center gap-2 text-gray-400 opacity-60">
                            <Lock size={12} />
                            <span className="text-[9px] font-bold uppercase tracking-widest">256-bit Secure SSL Encryption</span>
                        </div>
                    </div>
                </div>

                {/* Right Side: Impact and Info */}
                <div className="space-y-8">
                    {/* Stewardship Breakdown */}
                    <div className="glass-card p-6 rounded-3xl border-church-gold/20">
                        <h4 className="text-[9px] font-black uppercase tracking-widest text-church-gold mb-5 flex items-center gap-2">
                            <TrendingUp size={12} /> Your Impact
                        </h4>
                        <div className="space-y-6">
                            {impactItems.map((item) => (
                                <div key={item.label}>
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-church-gold/5 text-church-gold flex items-center justify-center">
                                                {getImpactIcon(item.label)}
                                            </div>
                                            <span className="text-xs font-black dark:text-white">{item.label}</span>
                                        </div>
                                        <span className="text-[10px] font-black text-gray-400">{item.percent}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-church-gold rounded-full" style={{ width: `${item.percent}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="bg-church-green p-6 rounded-3xl text-white shadow-premium relative overflow-hidden">
                        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                        <Heart className="mb-4 opacity-40" size={24} />
                        <h4 className="text-xl font-black italic tracking-tighter mb-2">Blessed to be <br /> a blessing.</h4>
                        <p className="text-white/60 text-[10px] font-medium leading-relaxed mb-6">"Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion."</p>
                        <div className="pt-6 border-t border-white/10">
                            <div className="flex justify-between items-end mb-2">
                                <p className="text-[10px] font-black uppercase tracking-widest italic">Weekly Goal</p>
                                <div className="text-right">
                                    <span className="text-xl font-black">GH₵{(stats?.currentProgress || 0).toLocaleString()}</span>
                                    <span className="text-[9px] font-bold text-white/40 uppercase block">of GH₵{(stats?.weeklyGoal || 10000).toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Visual Progress Bar */}
                            <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-white transition-all duration-1000 ease-out"
                                    style={{ width: `${Math.min(100, ((stats?.currentProgress || 0) / (stats?.weeklyGoal || 10000)) * 100)}%` }}
                                ></div>
                            </div>
                            <p className="text-[8px] font-bold uppercase tracking-widest text-white/40 mt-2 text-right">
                                {Math.round(((stats?.currentProgress || 0) / (stats?.weeklyGoal || 10000)) * 100)}% Reached
                            </p>
                        </div>
                    </div>

                    {/* Trust Logos */}
                    <div className="p-8 text-center bg-gray-50/50 dark:bg-white/[0.02] rounded-[3rem] border border-gray-100 dark:border-white/5">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-6">Trusted Transaction Partners</p>
                        <div className="flex flex-wrap justify-center gap-6 opacity-30 grayscale">
                            {/* Mock logos */}
                            <div className="w-12 h-6 bg-gray-400 rounded"></div>
                            <div className="w-8 h-8 bg-gray-400 rounded-full"></div>
                            <div className="w-14 h-4 bg-gray-400 rounded"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Past Giving History Teaser */}
            <div className="glass-card p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 border-dashed border-2">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-church-green/5 text-church-green flex items-center justify-center">
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <h4 className="text-lg font-black dark:text-white tracking-tight">Your Giving History</h4>
                        <p className="text-xs text-gray-500 font-medium">Access and download your tax-deductible statements anytime.</p>
                    </div>
                </div>
                <button className="px-8 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-white/10 text-[9px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm">
                    View Statements
                </button>
            </div>
        </div>
    );
};

export default GivingScreen;
