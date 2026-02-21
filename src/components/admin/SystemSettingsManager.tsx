import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { SiteSettings } from '../../types';
import { Shield, MessageSquare, Video, Brain, ImageIcon, Activity, AlertTriangle, Settings, Save, Loader2 } from 'lucide-react';

export const AdminSettingsManager: React.FC = () => {
    const [settings, setSettings] = useState<any>({
        momoNumber: '', momoName: '', telecelNumber: '', telecelName: '', contactEmail: '',
        bankInfo: { bankName: '', accountName: '', accountNumber: '', branch: '' },
        systemName: 'Doxa Portal',
        systemMotto: 'The Family of Faith',
        maintenanceMode: false,
        enableChat: true,
        enableLive: true,
        enableAI: true,
        enableGallery: true
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const settingsSnap = await getDoc(doc(db, 'site_settings', 'global'));
                if (settingsSnap.exists()) setSettings(settingsSnap.data() as SiteSettings);
            } catch (e) {
                console.error("Error fetching settings:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Save settings
    const saveGlobalSettings = async () => {
        setSaving(true);
        try {
            await setDoc(doc(db, 'site_settings', 'global'), settings);
            alert("Settings synchronized successfully!");
        } catch (e) {
            console.error(e);
            alert("Sync failed.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-church-green" size={40} /></div>;

    return (
        <div className="space-y-12 animate-fade-in pb-20">
            <div className="max-w-4xl mx-auto">

                {/* Payment & Contact Settings */}
                <div className="space-y-8">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 rounded-2xl bg-church-green/10 text-church-green flex items-center justify-center">
                            <Shield size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black dark:text-white tracking-tighter uppercase">System Control Center</h3>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Global Platform Configuration</p>
                        </div>
                    </div>

                    <div className="glass-card p-8 rounded-[2.5rem] space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Platform Identity</h4>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-2">Family Name</label>
                                        <input
                                            value={settings.systemName}
                                            onChange={e => setSettings({ ...settings, systemName: e.target.value })}
                                            className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl focus:border-church-green outline-none font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-2">Motto / Tagline</label>
                                        <input
                                            value={settings.systemMotto}
                                            onChange={e => setSettings({ ...settings, systemMotto: e.target.value })}
                                            className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl focus:border-church-green outline-none font-bold"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Feature Management</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { id: 'enableChat', label: 'Community Chat', icon: <MessageSquare size={16} /> },
                                        { id: 'enableLive', label: 'Live Sessions', icon: <Video size={16} /> },
                                        { id: 'enableAI', label: 'Doxa AI', icon: <Brain size={16} /> },
                                        { id: 'enableGallery', label: 'Media Gallery', icon: <ImageIcon size={16} /> },
                                        { id: 'maintenanceMode', label: 'Maintenance Mode', icon: <Activity size={16} />, color: 'text-red-500' }
                                    ].map(feature => (
                                        <button
                                            key={feature.id}
                                            onClick={() => setSettings({ ...settings, [feature.id]: !settings[feature.id] })}
                                            className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${settings[feature.id] ? 'bg-church-green/5 border-church-green text-church-green' : 'bg-gray-50 dark:bg-white/5 border-transparent text-gray-400'}`}
                                        >
                                            <div className="flex flex-col items-start gap-1">
                                                <div className={feature.color || ''}>{feature.icon}</div>
                                                <span className="text-[8px] font-black uppercase tracking-widest">{feature.label}</span>
                                            </div>
                                            <div className={`w-8 h-4 rounded-full relative transition-colors ${settings[feature.id] ? 'bg-church-green' : 'bg-gray-300'}`}>
                                                <div className={`absolute top-1 w-2 h-2 bg-white rounded-full transition-transform ${settings[feature.id] ? 'left-5' : 'left-1'}`}></div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 mb-2 pt-8">
                        <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black dark:text-white tracking-tighter uppercase">System Recovery</h3>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Emergency Restoration Tools</p>
                        </div>
                    </div>

                    <div className="glass-card p-8 rounded-[2.5rem] border-red-500/10 bg-red-500/[0.02]">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="space-y-2 text-center md:text-left">
                                <h4 className="text-sm font-black dark:text-white uppercase tracking-tight">Full System Reset</h4>
                                <p className="text-xs text-gray-500 max-w-md font-medium">
                                    This will immediately disable Maintenance Mode, restore the default system name, and re-enable all core features (Chat, AI, Live). Use this if you are locked out or experiencing critical configuration errors.
                                </p>
                            </div>
                            <button
                                onClick={async () => {
                                    if (!confirm("Are you sure you want to REVERT all system settings to default? This will end maintenance mode immediately.")) return;
                                    const defaults = {
                                        systemName: 'Doxa Portal',
                                        systemMotto: 'The Family of Faith',
                                        maintenanceMode: false,
                                        enableChat: true,
                                        enableLive: true,
                                        enableAI: true,
                                        enableGallery: true,
                                        momoNumber: '', momoName: '', telecelNumber: '', telecelName: '', contactEmail: '',
                                        bankInfo: { bankName: '', accountName: '', accountNumber: '', branch: '' }
                                    };
                                    setSettings(defaults);
                                    await setDoc(doc(db, 'site_settings', 'global'), defaults);
                                    alert("System has been successfully reverted to safe defaults.");
                                }}
                                className="px-8 py-4 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 active:scale-95 whitespace-nowrap"
                            >
                                Revert System to Defaults
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 mb-2 pt-12">
                        <div className="w-12 h-12 rounded-2xl bg-church-green/10 text-church-green flex items-center justify-center">
                            <Settings size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black dark:text-white tracking-tighter uppercase">Payment Endpoints</h3>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Global Finance Constants</p>
                        </div>
                    </div>

                    <div className="glass-card p-8 rounded-[2.5rem] space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">MTN MoMo Number</label>
                                <input
                                    value={settings.momoNumber}
                                    onChange={e => setSettings({ ...settings, momoNumber: e.target.value })}
                                    className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl focus:border-church-green outline-none font-bold"
                                    placeholder="024 XXX XXXX"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">MTN Account Name</label>
                                <input
                                    value={settings.momoName}
                                    onChange={e => setSettings({ ...settings, momoName: e.target.value })}
                                    className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl focus:border-church-green outline-none font-bold"
                                    placeholder="Doxa Portal"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Telecel Number</label>
                                <input
                                    value={settings.telecelNumber}
                                    onChange={e => setSettings({ ...settings, telecelNumber: e.target.value })}
                                    className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl focus:border-church-green outline-none font-bold"
                                    placeholder="020 XXX XXXX"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Telecel Name</label>
                                <input
                                    value={settings.telecelName}
                                    onChange={e => setSettings({ ...settings, telecelName: e.target.value })}
                                    className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl focus:border-church-green outline-none font-bold"
                                    placeholder="Doxa Portal"
                                />
                            </div>
                        </div>

                        <div className="h-px bg-gray-100 dark:bg-white/5 my-4"></div>

                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-church-gold uppercase tracking-[0.2em] ml-2">Bank Details</h4>
                            <input
                                value={settings.bankInfo?.bankName}
                                onChange={e => setSettings({ ...settings, bankInfo: { ...settings.bankInfo!, bankName: e.target.value } })}
                                className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl focus:border-church-gold outline-none font-bold"
                                placeholder="Bank Name (e.g. Ecobank)"
                            />
                            <input
                                value={settings.bankInfo?.accountName}
                                onChange={e => setSettings({ ...settings, bankInfo: { ...settings.bankInfo!, accountName: e.target.value } })}
                                className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl focus:border-church-gold outline-none font-bold"
                                placeholder="Account Name (e.g. Doxa Family Ghana)"
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <input
                                    value={settings.bankInfo?.accountNumber}
                                    onChange={e => setSettings({ ...settings, bankInfo: { ...settings.bankInfo!, accountNumber: e.target.value } })}
                                    className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl focus:border-church-gold outline-none font-bold font-mono"
                                    placeholder="Account Number"
                                />
                                <input
                                    value={settings.bankInfo?.branch}
                                    onChange={e => setSettings({ ...settings, bankInfo: { ...settings.bankInfo!, branch: e.target.value } })}
                                    className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl focus:border-church-gold outline-none font-bold"
                                    placeholder="Branch"
                                />
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            <div className="flex justify-center pt-8">
                <button
                    onClick={saveGlobalSettings}
                    disabled={saving}
                    className="px-12 py-5 bg-church-green hover:bg-emerald-700 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] shadow-premium flex items-center gap-4 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                    {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                    Synchronize Divine Data
                </button>
            </div>
        </div>
    );
};
