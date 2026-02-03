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


    const PaymentCard = ({ title, icon, color, accounts }: { title: string, icon: React.ReactNode, color: string, accounts: { name: string, number: string, subtitle?: string }[] }) => (
        <div className="glass-card p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] relative overflow-hidden group hover:shadow-premium transition-all">
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

            <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 px-4 md:px-0">
                {/* Payment Channels */}
                <div className="space-y-6">

                    {/* Reference Instructions */}
                    <div className="bg-church-gold/10 border border-church-gold/20 p-5 md:p-6 rounded-3xl flex items-start gap-4">
                        <div className="p-3 bg-church-gold text-white rounded-xl shadow-lg shadow-church-gold/20 shrink-0">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h4 className="text-church-gold font-black uppercase tracking-widest text-xs mb-1 md:mb-2 text-[10px] md:text-xs">Required Reference</h4>
                            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                                Please use a reference:
                                <span className="block mt-1 md:mt-2 font-black text-gray-900 dark:text-white text-[11px] md:text-sm">
                                    • TITHE &nbsp; • OFFERING &nbsp; • SEED
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
