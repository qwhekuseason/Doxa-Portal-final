
import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Loader2, Activity, ShieldAlert } from 'lucide-react';

interface SystemSettings {
    systemName: string;
    systemMotto: string;
    maintenanceMode: boolean;
    enableChat: boolean;
    enableLive: boolean;
    enableAI: boolean;
    enableGallery: boolean;
    momoNumber?: string;
    momoName?: string;
    telecelNumber?: string;
    telecelName?: string;
    bankInfo?: {
        bankName: string;
        accountName: string;
        accountNumber: string;
        branch: string;
    };
}

interface SystemSettingsContextType {
    settings: SystemSettings;
    loading: boolean;
}

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined);

export const SystemSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<SystemSettings>({
        systemName: 'Doxa Portal',
        systemMotto: 'The Family of Faith',
        maintenanceMode: false,
        enableChat: true,
        enableLive: true,
        enableAI: true,
        enableGallery: true
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, 'site_settings', 'global'), (snapshot) => {
            if (snapshot.exists()) {
                setSettings(snapshot.data() as SystemSettings);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error listening to system settings:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#050505] flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="animate-spin text-church-green mx-auto" size={40} />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Initializing Sanitary Systems...</p>
                </div>
            </div>
        );
    }

    if (settings.maintenanceMode && !window.location.search.includes('bypass=true')) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#050505] flex flex-col items-center justify-center p-6 text-center">
                <div className="max-w-md w-full glass-card p-12 rounded-[3rem] space-y-8 animate-fade-in-up">
                    <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-xl shadow-red-500/5 transition-transform hover:scale-110 duration-700">
                        <ShieldAlert size={40} />
                    </div>
                    <div className="space-y-4">
                        <h1 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Sanctuary Maintenance</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                            We are currently performing spiritual maintenance and system upgrades to better serve the family. We'll be back shortly!
                        </p>
                    </div>
                    <div className="pt-6 border-t border-gray-100 dark:border-white/5">
                        <div className="flex items-center justify-center gap-3 text-church-green">
                            <Activity size={16} className="animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Live Synchronization in Progress</span>
                        </div>
                    </div>
                    <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest">&copy; 2025 Doxa Digital Systems</p>
                </div>

                {/* Subtle Admin Entrance */}
                <div className="mt-12 opacity-0 hover:opacity-100 transition-opacity duration-1000">
                    <button
                        onClick={() => {
                            const params = new URLSearchParams(window.location.search);
                            params.set('bypass', 'true');
                            window.location.search = params.toString();
                        }}
                        className="px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all"
                    >
                        Enter Administrative Portal
                    </button>
                </div>
            </div>
        );
    }

    return (
        <SystemSettingsContext.Provider value={{ settings, loading }}>
            {children}
        </SystemSettingsContext.Provider>
    );
};

export const useSystemSettings = () => {
    const context = useContext(SystemSettingsContext);
    if (context === undefined) {
        throw new Error('useSystemSettings must be used within a SystemSettingsProvider');
    }
    return context;
};
