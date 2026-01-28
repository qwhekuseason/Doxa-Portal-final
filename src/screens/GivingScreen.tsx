import React, { useState } from 'react';
import { doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirestoreDoc } from '../hooks';
import { SiteSettings, GivingStats, UserProfile } from '../types';
import {
    Heart,
    CreditCard,
    Smartphone,
    Globe,
    CheckCircle2,
    Sparkles,
    HelpingHand,
    Users,
    TrendingUp,
    Copy,
    Building2,
    Wallet,
    Loader2
} from 'lucide-react';
import { SectionHeader } from '../components/UIComponents';

// Define doc refs outside to ensure stability
const settingsRef = doc(db, 'site_settings', 'global');
const statsRef = doc(db, 'giving_stats', 'weekly');

const GivingScreen: React.FC<{ user?: UserProfile }> = ({ user }) => {
    const { data: settings } = useFirestoreDoc<SiteSettings>(settingsRef);
    const { data: stats } = useFirestoreDoc<GivingStats>(statsRef);
    const [copied, setCopied] = useState<string | null>(null);

    // Interactive Giving State
    const [step, setStep] = useState<'amount' | 'details'>('amount');
    const [amount, setAmount] = useState<string>('');
    const [customAmount, setCustomAmount] = useState<string>('');
    const [phoneNumber, setPhoneNumber] = useState<string>(user?.phoneNumber || '');
    const [network, setNetwork] = useState<string>('MTN');
    const [loading, setLoading] = useState(false);

    const presetAmounts = ['50', '100', '200', '500'];

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopied(label);
        setTimeout(() => setCopied(null), 2000);
    };

    const getImpactIcon = (label: string) => {
        const l = label.toLowerCase();
        if (l.includes('mission') || l.includes('outreach')) return <Globe size={16} />;
        if (l.includes('build') || l.includes('fund')) return <HelpingHand size={16} />;
        if (l.includes('community') || l.includes('youth') || l.includes('people')) return <Users size={16} />;
        return <Sparkles size={16} />;
    };

    const impactItems = stats?.impactBreakdown || [
        { label: 'Core Operations', percent: 45 },
        { label: 'Community Outreach', percent: 30 },
        { label: 'Development Fund', percent: 15 },
        { label: 'Direct Support', percent: 10 }
    ];

    const handleProceedToDetails = () => {
        const finalAmount = customAmount || amount;
        if (!finalAmount || isNaN(Number(finalAmount))) return;
        setStep('details');
    };

    const handlePayment = async () => {
        setLoading(true);
        const uniqueRef = `GIVE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // PAYLOAD CONSTRUCTION
        const payload = {
            amount: parseFloat(customAmount || amount) * 100, // Amount in kobo
            email: user?.email || 'guest@doxaghana.com',
            currency: 'GHS',
            mobile_money: {
                phone: phoneNumber,
                provider: network.toLowerCase()
            },
            reference: uniqueRef,
            metadata: {
                custom_fields: [
                    {
                        display_name: "Mobile Number",
                        variable_name: "mobile_number",
                        value: phoneNumber
                    }
                ]
            }
        };

        console.log('Processing Payment Payload:', payload);

        // TODO: Integrate actual payment provider here (e.g. Paystack / Hubtel)

        setTimeout(() => {
            setLoading(false);
            alert(`Simulated Payment Request for GHS ${customAmount || amount} to ${phoneNumber}`);
        }, 1500);
    };

    const PaymentCard = ({ title, icon, color, accounts }: { title: string, icon: React.ReactNode, color: string, accounts: { name: string, number: string, subtitle?: string }[] }) => (
        <div className="glass-card p-8 rounded-[2.5rem] relative overflow-hidden group hover:shadow-premium transition-all">
            <div className={`absolute top-0 right-0 p-8 opacity-5 transition-transform group-hover:scale-110 duration-700 ${color}`}>
                {React.cloneElement(icon as React.ReactElement, { size: 140 })}
            </div>

            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                    <div className={`w-12 h-12 rounded-2xl ${color.replace('text-', 'bg-')}/10 flex items-center justify-center ${color}`}>
                        {icon}
                    </div>
                    <div>
                        <h3 className="text-xl font-black dark:text-white uppercase tracking-tight">{title}</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Manual Transfer</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {accounts.map((acc, idx) => (
                        <div key={idx} className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 p-5 rounded-2xl flex items-center justify-between group/acc hover:border-gray-200 dark:hover:border-white/20 transition-all">
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">{acc.name}</p>
                                <p className="text-lg md:text-xl font-mono font-black text-gray-900 dark:text-white tracking-tight">{acc.number}</p>
                                {acc.subtitle && <p className="text-[9px] font-bold text-church-green mt-1">{acc.subtitle}</p>}
                            </div>
                            <button
                                onClick={() => handleCopy(acc.number, acc.number)}
                                className="p-3 rounded-xl bg-white dark:bg-black/20 text-gray-400 hover:text-church-green hover:bg-church-green/10 transition-all"
                            >
                                {copied === acc.number ? <CheckCircle2 size={18} className="text-church-green" /> : <Copy size={18} />}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-12 pb-20 animate-fade-in-up">
            <SectionHeader
                title="Giving & Support"
                subtitle="Support the work of God and help us grow our ministry."
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Side: Payment Channels & Interactive Giving */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Interactive Giving Flow */}
                    <div className="glass-card p-1 rounded-[2.5rem] relative overflow-hidden ring-1 ring-church-green/20 ring-offset-2 ring-offset-white dark:ring-offset-black transition-all">
                        <div className="bg-gradient-to-br from-church-green/5 to-transparent p-8 rounded-[2.3rem]">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3 bg-church-green text-white rounded-2xl shadow-lg shadow-church-green/30">
                                    <Smartphone size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black dark:text-white uppercase tracking-tight">Instant Giving</h3>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Fast & Secure Digital Payments</p>
                                </div>
                            </div>

                            {step === 'amount' ? (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="grid grid-cols-4 gap-3">
                                        {presetAmounts.map((amt) => (
                                            <button
                                                key={amt}
                                                onClick={() => { setAmount(amt); setCustomAmount(''); }}
                                                className={`py-3 px-2 rounded-xl text-sm font-bold border transition-all ${amount === amt && !customAmount
                                                    ? 'bg-church-green text-white border-church-green shadow-lg shadow-church-green/20'
                                                    : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-church-green/50'
                                                    }`}
                                            >
                                                ₵{amt}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">GHS</span>
                                        <input
                                            type="number"
                                            placeholder="Enter other amount"
                                            value={customAmount}
                                            onChange={(e) => { setCustomAmount(e.target.value); setAmount(''); }}
                                            className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl py-4 pl-14 pr-4 text-lg font-black text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-church-green/50 transition-all placeholder:font-normal"
                                        />
                                    </div>

                                    <button
                                        onClick={handleProceedToDetails}
                                        disabled={!amount && !customAmount}
                                        className="w-full py-4 bg-church-green text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-emerald-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-church-green/20"
                                    >
                                        Next Step
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="flex items-center justify-between bg-white dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Amount</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl font-black text-church-green">GH₵ {customAmount || amount}</span>
                                            <button
                                                onClick={() => setStep('amount')}
                                                className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-church-gray transition-colors"
                                            >
                                                Change
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Mobile Network</label>
                                            <div className="grid grid-cols-3 gap-3">
                                                {['MTN', 'Telecel', 'AirtelTigo'].map(net => (
                                                    <button
                                                        key={net}
                                                        onClick={() => setNetwork(net)}
                                                        className={`py-3 rounded-xl text-xs font-bold border transition-all ${network === net
                                                            ? 'bg-gray-900 dark:bg-white text-white dark:text-black border-transparent'
                                                            : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500 hover:border-gray-400'
                                                            }`}
                                                    >
                                                        {net}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Phone Number</label>
                                            <input
                                                type="tel"
                                                placeholder="024 XXX XXXX"
                                                value={phoneNumber}
                                                onChange={(e) => setPhoneNumber(e.target.value)}
                                                className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl py-4 px-4 text-lg font-mono font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-church-green/50 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={handlePayment}
                                        disabled={loading || !phoneNumber || phoneNumber.length < 10}
                                        className="w-full py-4 bg-church-green text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-emerald-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-church-green/20 flex items-center justify-center gap-2"
                                    >
                                        {loading ? <Loader2 className="animate-spin" /> : <span>Confirm Giving</span>}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Reference Instructions */}
                    <div className="bg-church-gold/10 border border-church-gold/20 p-6 rounded-3xl flex items-start gap-4">
                        <div className="p-3 bg-church-gold text-white rounded-xl shadow-lg shadow-church-gold/20">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h4 className="text-church-gold font-black uppercase tracking-widest text-xs mb-2">Important Instructions</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                                When making a manual transfer, please use one of the following as your reference:
                                <span className="block mt-2 font-black text-gray-900 dark:text-white">
                                    • TITHE &nbsp; • OFFERING &nbsp; • SEED &nbsp; • THANKSGIVING
                                </span>
                            </p>
                        </div>
                    </div>

                    <PaymentCard
                        title="Mobile Money (Manual)"
                        icon={<Smartphone />}
                        color="text-church-green"
                        accounts={[
                            { name: "MTN Mobile Money", number: "054 123 4567", subtitle: "Doxa Church Ghana" },
                            { name: "Telecel Cash", number: "020 987 6543", subtitle: "Doxa Church Ghana" }
                        ]}
                    />

                    <PaymentCard
                        title="Bank Transfer"
                        icon={<Building2 />}
                        color="text-blue-500"
                        accounts={[
                            { name: "Ecobank Ghana", number: "144 100 123 4567", subtitle: "Branch: Legon Main" },
                            { name: "Stanbic Bank", number: "901 223 334 5566", subtitle: "Branch: Airport City" }
                        ]}
                    />
                </div>

                {/* Right Side: Impact and Info */}
                <div className="space-y-8">
                    {/* Visual Stewardship Breakdown */}
                    <div className="glass-card p-6 rounded-3xl border-church-gold/20 hover:border-church-gold/40 transition-colors">
                        <SectionHeader title="Giving Impact" subtitle="Where your giving goes" />

                        <div className="space-y-6 mt-6">
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
                    <div className="bg-gradient-to-br from-church-green to-emerald-900 p-8 rounded-[2.5rem] text-white shadow-premium relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[80px] -mr-32 -mt-32 group-hover:scale-150 transition-transform duration-1000"></div>

                        <div className="relative z-10">
                            <Heart className="mb-6 text-white/80" size={32} />
                            <h4 className="text-3xl font-black italic tracking-tighter mb-3 leading-none">Building the <br /> Kingdom.</h4>
                            <p className="text-white/70 text-xs font-medium leading-relaxed mb-8 border-l-2 border-white/20 pl-4">
                                "Generosity is the most natural outward expression of an inner attitude of compassion and care."
                                <span className="block mt-2 text-[10px] font-black uppercase tracking-widest opacity-60">— Word of Stewardship</span>
                            </p>
                        </div>
                        <div className="bg-black/20 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                            <div className="flex justify-between items-end mb-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Weekly Goal</p>
                                <div className="text-right">
                                    <span className="text-xl font-black">GH₵{(stats?.currentProgress || 0).toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-1000 ease-out"
                                    style={{ width: `${Math.min(100, ((stats?.currentProgress || 0) / (stats?.weeklyGoal || 10000)) * 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Note */}
                <div className="p-6 text-center">
                    <div className="inline-flex items-center justify-center p-3 rounded-full bg-gray-100 dark:bg-white/5 text-gray-400 mb-4">
                        <Wallet size={20} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Secure & Transparent</p>
                    <p className="text-[10px] text-gray-400 opacity-60">All contributions are recorded for accountability.</p>
                </div>
            </div>
        </div>
    );
};

export default GivingScreen;
