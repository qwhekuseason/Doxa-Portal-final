import React, { useState } from 'react';
import { doc } from 'firebase/firestore';
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

const GivingScreen: React.FC = () => {
    const [amount, setAmount] = useState<string>('');
    const [frequency, setFrequency] = useState<'once' | 'monthly'>('once');
    const [category, setCategory] = useState<string>('General');
    const [step, setStep] = useState<1 | 2>(1);

    const { data: settings } = useFirestoreDoc<SiteSettings>(doc(db, 'site_settings', 'global'));
    const { data: stats } = useFirestoreDoc<GivingStats>(doc(db, 'giving_stats', 'weekly'));

    const categories = ['General', 'Tithes', 'Missions', 'Building Fund', 'Youth Ministry'];
    const presetAmounts = ['50', '100', '200', '500', '1000'];

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
                        {/* Background Decor */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-church-green/5 blur-[80px] -mr-32 -mt-32"></div>

                        {/* Step Indicator */}
                        <div className="flex items-center gap-4 mb-10">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs transition-all ${step === 1 ? 'bg-church-green text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>01</div>
                            <div className="h-px w-8 bg-gray-200 dark:bg-gray-700"></div>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs transition-all ${step === 2 ? 'bg-church-green text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>02</div>
                        </div>

                        {step === 1 ? (
                            <div className="space-y-8 animate-fade-in">
                                <div>
                                    <h3 className="text-xl font-black dark:text-white mb-1 tracking-tight">Support our mission</h3>
                                    <p className="text-gray-500 text-sm font-medium">Select an amount or enter a custom value.</p>
                                </div>

                                {/* Frequency Toggle */}
                                <div className="flex p-1 bg-gray-50 dark:bg-black/20 rounded-2xl w-fit border border-gray-100 dark:border-white/5">
                                    <button
                                        onClick={() => setFrequency('once')}
                                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${frequency === 'once' ? 'bg-white dark:bg-gray-800 text-church-green shadow-sm' : 'text-gray-400'}`}
                                    >Give Once</button>
                                    <button
                                        onClick={() => setFrequency('monthly')}
                                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${frequency === 'monthly' ? 'bg-white dark:bg-gray-800 text-church-green shadow-sm' : 'text-gray-400'}`}
                                    >Monthly</button>
                                </div>

                                {/* Preset Amounts */}
                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                                    {presetAmounts.map((a) => (
                                        <button
                                            key={a}
                                            onClick={() => setAmount(a)}
                                            className={`py-4 rounded-2xl font-black text-lg transition-all border ${amount === a ? 'bg-church-green text-white border-church-green shadow-lg' : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-white/5 text-gray-400'}`}
                                        >
                                            GH₵{a}
                                        </button>
                                    ))}
                                </div>

                                {/* Custom Amount */}
                                <div className="relative group">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-300 group-focus-within:text-church-green transition-colors">GH₵</span>
                                    <input
                                        type="number"
                                        placeholder="Enter custom amount"
                                        className="w-full pl-12 pr-6 py-6 rounded-3xl bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 outline-none focus:ring-4 focus:ring-church-green/10 focus:border-church-green transition-all text-2xl font-black dark:text-white placeholder:text-gray-300"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                    />
                                </div>

                                {/* Category Selection */}
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Allocation</p>
                                    <div className="flex flex-wrap gap-2">
                                        {categories.map((c) => (
                                            <button
                                                key={c}
                                                onClick={() => setCategory(c)}
                                                className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${category === c ? 'bg-church-gold text-white border-church-gold' : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-white/5 text-gray-400'}`}
                                            >
                                                {c}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={() => amount && setStep(2)}
                                    disabled={!amount}
                                    className="w-full py-6 rounded-[2rem] bg-church-green hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-[0.3em] shadow-premium transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    Proceed to payment <ArrowRight size={18} />
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-10 animate-fade-in">
                                <div>
                                    <h3 className="text-xl font-black dark:text-white mb-1 tracking-tight">Payment Method</h3>
                                    <p className="text-gray-500 text-sm font-medium">Select your preferred way to support.</p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="p-6 rounded-3xl bg-church-green/5 border-2 border-church-green/20 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-2 opacity-10">
                                            <Smartphone size={40} />
                                        </div>
                                        <h4 className="font-black text-xs uppercase tracking-widest text-church-green mb-4">Mobile Money</h4>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center bg-white dark:bg-white/5 p-3 rounded-xl border border-church-green/10">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">MTN MoMo</span>
                                                    <span className="text-[8px] font-medium text-gray-400">{settings?.momoName || 'Doxa Portal'}</span>
                                                </div>
                                                <span className="text-xs font-black dark:text-white uppercase">{settings?.momoNumber || '024 000 0000'}</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-white dark:bg-white/5 p-3 rounded-xl border border-church-green/10">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Telecel Cash</span>
                                                    <span className="text-[8px] font-medium text-gray-400">{settings?.telecelName || 'Doxa Portal'}</span>
                                                </div>
                                                <span className="text-xs font-black dark:text-white uppercase">{settings?.telecelNumber || '020 000 0000'}</span>
                                            </div>
                                            <p className="text-[8px] font-bold text-gray-400 text-center mt-2">Authenticated Divine Giving</p>
                                        </div>
                                    </div>

                                    <div className="p-6 rounded-3xl bg-church-gold/5 border-2 border-church-gold/20 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-2 opacity-10">
                                            <CreditCard size={40} />
                                        </div>
                                        <h4 className="font-black text-xs uppercase tracking-widest text-church-gold mb-4">Bank Transfer</h4>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black dark:text-white uppercase">{settings?.bankInfo?.bankName || 'Ecobank Ghana'}</p>
                                            <p className="text-xs font-black text-gray-400">Acc: {settings?.bankInfo?.accountNumber || '144100XXXXXXX'}</p>
                                            <p className="text-[9px] font-bold text-gray-500 mt-2 uppercase">Name: {settings?.bankInfo?.accountName || 'Doxa Ministries'}</p>
                                            <p className="text-[9px] font-bold text-gray-500 uppercase">Branch: {settings?.bankInfo?.branch || 'Ring Road'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-gray-100 dark:border-white/5 flex flex-col md:flex-row items-center gap-6">
                                    <button
                                        onClick={() => setStep(1)}
                                        className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-church-green transition-colors"
                                    >
                                        Go back
                                    </button>
                                    <button
                                        className="flex-1 w-full py-6 rounded-[2rem] bg-church-green text-white font-black text-xs uppercase tracking-[0.3em] shadow-premium flex items-center justify-center gap-3"
                                    >
                                        Proceed with GH₵{amount}
                                    </button>
                                </div>

                                <div className="flex items-center justify-center gap-2 text-gray-400">
                                    <Lock size={14} />
                                    <span className="text-[10px] font-bold uppercase tracking-widest uppercase">SSL Encrypted Secure Payment</span>
                                </div>
                            </div>
                        )}
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
                            {[
                                { label: 'Ministy Operations', percent: 45, icon: <Sparkles size={16} /> },
                                { label: 'Missions & Outreach', percent: 30, icon: <Globe size={16} /> },
                                { label: 'Building Fund', percent: 15, icon: <HelpingHand size={16} /> },
                                { label: 'Community Support', percent: 10, icon: <Users size={16} /> }
                            ].map((item) => (
                                <div key={item.label}>
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-church-gold/5 text-church-gold flex items-center justify-center">
                                                {item.icon}
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
                            <p className="text-[10px] font-black uppercase tracking-widest mb-1 italic">Weekly Goal</p>
                            <div className="flex items-center gap-3">
                                <span className="text-2xl font-black">GH₵{stats?.currentProgress.toLocaleString() || '0'}</span>
                                <span className="text-[10px] font-bold text-white/40 uppercase">of GH₵{stats?.weeklyGoal.toLocaleString() || '10,000'}</span>
                            </div>
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
