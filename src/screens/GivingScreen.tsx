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
import { SectionHeader } from '../components/UIComponents';

// Define doc refs outside to ensure stability
const settingsRef = doc(db, 'site_settings', 'global');

const GivingScreen: React.FC<{ user?: UserProfile }> = ({ user }) => {
    const { data: settings } = useFirestoreDoc<SiteSettings>(settingsRef);
    const [copied, setCopied] = useState<string | null>(null);

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

    const impactItems = [
        { label: 'Core Operations', percent: 45 },
        { label: 'Community Outreach', percent: 30 },
        { label: 'Development Fund', percent: 15 },
        { label: 'Direct Support', percent: 10 }
    ];

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
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bank Transfer</p>
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

    // Prepare accounts from settings
    const mobileMoneyAccounts = [];
    if (settings?.momoNumber) {
        mobileMoneyAccounts.push({
            name: "MTN Mobile Money",
            number: settings.momoNumber,
            subtitle: settings.momoName || "Doxa Church Ghana"
        });
    }
    if (settings?.telecelNumber) {
        mobileMoneyAccounts.push({
            name: "Telecel Cash",
            number: settings.telecelNumber,
            subtitle: settings.telecelName || "Doxa Church Ghana"
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
        <div className="max-w-6xl mx-auto space-y-12 pb-20 animate-fade-in-up">
            <SectionHeader
                title="Giving & Support"
                subtitle="Support the work of God and help us grow our ministry."
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Side: Payment Channels */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Reference Instructions */}
                    <div className="bg-church-gold/10 border border-church-gold/20 p-6 rounded-3xl flex items-start gap-4">
                        <div className="p-3 bg-church-gold text-white rounded-xl shadow-lg shadow-church-gold/20">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h4 className="text-church-gold font-black uppercase tracking-widest text-xs mb-2">Important Instructions</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                                When making a transfer, please use one of the following as your reference:
                                <span className="block mt-2 font-black text-gray-900 dark:text-white">
                                    • TITHE &nbsp; • OFFERING &nbsp; • SEED &nbsp; • THANKSGIVING
                                </span>
                            </p>
                        </div>
                    </div>

                    {/* Mobile Money Accounts */}
                    {mobileMoneyAccounts.length > 0 && (
                        <PaymentCard
                            title="Mobile Money"
                            icon={<Smartphone />}
                            color="text-church-green"
                            accounts={mobileMoneyAccounts}
                        />
                    )}

                    {/* Bank Transfer Accounts */}
                    {bankAccounts.length > 0 && (
                        <PaymentCard
                            title="Bank Transfer"
                            icon={<Building2 />}
                            color="text-blue-500"
                            accounts={bankAccounts}
                        />
                    )}

                    {/* Fallback message if no accounts configured */}
                    {mobileMoneyAccounts.length === 0 && bankAccounts.length === 0 && (
                        <div className="glass-card p-8 rounded-[2.5rem] text-center">
                            <Wallet className="mx-auto mb-4 text-gray-400" size={48} />
                            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">Payment Details Coming Soon</h3>
                            <p className="text-sm text-gray-500">
                                Bank account information will be displayed here once configured by the admin.
                            </p>
                        </div>
                    )}
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
