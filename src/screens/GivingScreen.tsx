import React, { useState } from 'react';
import { doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirestoreDoc } from '../hooks';
import { SiteSettings, UserProfile } from '../types';
import {
    Heart,
    Smartphone,
    Globe,
    CheckCircle2,
    Sparkles,
    HelpingHand,
    Users,
    Copy,
    Building2,
    Wallet
} from 'lucide-react';
import { SectionHeader, StatusModal } from '../components/UIComponents';

// Define doc refs outside to ensure stability
const settingsRef = doc(db, 'site_settings', 'global');

import { usePaystackPayment } from 'react-paystack';

const GivingScreen: React.FC<{ user?: UserProfile }> = ({ user }) => {
    const { data: settings } = useFirestoreDoc<SiteSettings>(settingsRef);
    const [copied, setCopied] = useState<string | null>(null);
    const [amount, setAmount] = useState<string>('');
    const [category, setCategory] = useState<'OFFERING' | 'TITHE' | 'SEED'>('OFFERING');
    const [showSuccess, setShowSuccess] = useState(false);

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopied(label);
        setTimeout(() => setCopied(null), 2000);
    };

    const onSuccess = (reference: any) => {
        console.log("Payment Successful:", reference);
        setShowSuccess(true);
        setAmount('');
        setTimeout(() => setShowSuccess(false), 5000);
    };

    const onClose = () => {
        console.log("Payment Closed");
    };

    const paystackConfig = {
        reference: (new Date()).getTime().toString(),
        email: user?.email || 'member@doxa.portal',
        amount: Math.round(parseFloat(amount || '0') * 100), // Ensure integer for Paystack
        publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '',
        currency: 'GHS',
        metadata: {
            custom_fields: [
                {
                    display_name: "Giving Category",
                    variable_name: "category",
                    value: category
                },
                {
                    display_name: "Member Name",
                    variable_name: "member_name",
                    value: user?.displayName || 'Anonymous'
                }
            ]
        },
        onSuccess,
        onClose
    };

    const initializePayment = usePaystackPayment(paystackConfig);

    const handleInstantGive = (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || parseFloat(amount) <= 0) {
            alert("Please enter a valid amount");
            return;
        }
        initializePayment({ onSuccess, onClose });
    };

    const PaymentCard = ({ title, icon, color, accounts }: { title: string, icon: React.ReactNode, color: string, accounts: { name: string, number: string, subtitle?: string }[] }) => (
        <div className="glass-card card-pop glass-glow p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] relative overflow-hidden group">
            <div className={`absolute top-0 right-0 p-8 opacity-5 transition-transform group-hover:scale-110 duration-700 ${color}`}>
                {React.cloneElement(icon as React.ReactElement, { size: 100, className: 'md:w-[140px] md:h-[140px]' })}
            </div>

            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6 md:mb-8">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl ${color.replace('text-', 'bg-')}/10 flex items-center justify-center ${color}`}>
                        {React.cloneElement(icon as React.ReactElement, { size: 20, className: 'md:w-6 md:h-6' })}
                    </div>
                    <div>
                        <h3 className="text-lg md:text-xl font-black dark:text-white uppercase tracking-tight">{title}</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Digital Transfer</p>
                    </div>
                </div>

                <div className="space-y-3 md:space-y-4">
                    {accounts.map((acc, idx) => (
                        <div key={idx} className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 p-4 md:p-5 rounded-2xl flex items-center justify-between group/acc hover:border-gray-200 dark:hover:border-white/20 transition-all">
                            <div className="min-w-0 pr-4">
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1 truncate">{acc.name}</p>
                                <p className="text-base md:text-xl font-mono font-black text-gray-900 dark:text-white tracking-tight truncate">{acc.number}</p>
                                {acc.subtitle && <p className="text-[9px] font-bold text-church-green mt-1 line-clamp-1">{acc.subtitle}</p>}
                            </div>
                            <button
                                onClick={() => handleCopy(acc.number, acc.number)}
                                className="p-2.5 md:p-3 rounded-xl bg-white dark:bg-black/20 text-gray-400 hover:text-church-green hover:bg-church-green/10 transition-all shrink-0"
                            >
                                {copied === acc.number ? <CheckCircle2 size={16} className="text-church-green md:w-[18px] md:h-[18px]" /> : <Copy size={16} className="md:w-[18px] md:h-[18px]" />}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    // Prepare accounts from settings
    const mobileMoneyAccounts = [];
    if (settings?.momoNumber) {
        mobileMoneyAccounts.push({
            name: "MTN Mobile Money",
            number: settings.momoNumber,
            subtitle: settings.momoName || "Doxa Family Ghana"
        });
    }
    if (settings?.telecelNumber) {
        mobileMoneyAccounts.push({
            name: "Telecel Cash",
            number: settings.telecelNumber,
            subtitle: settings.telecelName || "Doxa Family Ghana"
        });
    }

    const bankAccounts = [];
    if (settings?.bankInfo) {
        bankAccounts.push({
            name: settings.bankInfo.bankName,
            number: settings.bankInfo.accountNumber,
            subtitle: `${settings.bankInfo.accountName} • ${settings.bankInfo.branch}`
        });
    }

    return (
        <div className="max-w-6xl mx-auto space-y-12 pb-32 animate-fade-in-up">
            <div className="flex items-center justify-between">
                <SectionHeader
                    title="Giving"
                    subtitle="Support the work of God."
                />
                <div className="lg:hidden w-12 h-12 bg-church-gold/10 rounded-2xl flex items-center justify-center text-church-gold">
                    <Heart size={20} fill="currentColor" />
                </div>
            </div>

            <StatusModal
                isOpen={showSuccess}
                onClose={() => setShowSuccess(false)}
                type="success"
                title="Divine Seeds Sown!"
                message="Thank you for your generous contribution. Your support helps spread the gospel globally."
                actionLabel="God Bless You"
            />

            <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 px-4 md:px-0">
                {/* Paystack Instant Giving - left side on desktop */}
                <div className="space-y-10 order-2 lg:order-1">
                    {/* Instant Offering Section */}
                    <div className="glass-card card-pop glass-glow p-8 md:p-14 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                        <div className="space-y-10">
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black dark:text-white tracking-tighter uppercase italic">Instant Offering</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Secure Pay via Paystack</p>
                            </div>

                            {/* Category Selector */}
                            <div className="flex p-1.5 bg-gray-50 dark:bg-white/5 rounded-2xl gap-1">
                                {['OFFERING', 'TITHE', 'SEED'].map((cat) => (
                                    <button
                                        key={cat}
                                        onClick={() => setCategory(cat as any)}
                                        className={`flex-1 py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${category === cat
                                            ? 'bg-white dark:bg-white/10 text-church-gold shadow-sm'
                                            : 'text-gray-400 hover:text-church-gold'
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>

                            {/* Preset Amounts Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                {[50, 100, 200, 500].map(amt => (
                                    <button
                                        key={amt}
                                        onClick={() => setAmount(amt.toString())}
                                        className={`py-5 rounded-2xl border-2 font-black text-xl transition-all active:scale-95 ${amount === amt.toString()
                                            ? 'border-church-gold bg-church-gold/5 text-church-gold'
                                            : 'border-gray-50 dark:border-white/5 text-gray-400'
                                            }`}
                                    >
                                        ₵{amt}
                                    </button>
                                ))}
                            </div>

                            <form onSubmit={handleInstantGive} className="space-y-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Enter Custom Amount</label>
                                    <div className="relative">
                                        <span className="absolute left-8 top-1/2 -translate-y-1/2 text-3xl font-black text-church-gold/30">₵</span>
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-[2.5rem] px-16 py-8 text-3xl font-black outline-none focus:border-church-gold dark:text-white transition-all shadow-inner"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-church-gold text-white py-8 rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.4em] shadow-2xl shadow-church-gold/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4"
                                >
                                    <HelpingHand size={24} />
                                    Give
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Manual Accounts - right side on desktop */}
                <div className="space-y-10 order-1 lg:order-2">
                    <div className="bg-gradient-to-br from-church-gold/20 to-yellow-600/10 border border-church-gold/20 p-8 rounded-[3rem] flex items-start gap-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-church-gold/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                        <div className="p-4 bg-church-gold text-white rounded-2xl shadow-xl shadow-church-gold/20 shrink-0">
                            <Sparkles size={24} />
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-church-gold font-black uppercase tracking-widest text-xs">Payment Reference</h4>
                            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                                For manual bank or mobile money transfers, use <span className="text-church-gold font-black">"{category}"</span> as your reference.
                            </p>
                        </div>
                    </div>

                    {mobileMoneyAccounts.length > 0 && (
                        <PaymentCard
                            title="Direct MoMo"
                            icon={<Smartphone />}
                            color="text-church-green"
                            accounts={mobileMoneyAccounts}
                        />
                    )}

                    {bankAccounts.length > 0 && (
                        <PaymentCard
                            title="Bank Details"
                            icon={<Building2 />}
                            color="text-blue-500"
                            accounts={bankAccounts}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default GivingScreen;
