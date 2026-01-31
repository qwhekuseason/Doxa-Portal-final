import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import {
    Users,
    Calendar,
    ArrowLeft,
    BarChart3,
    UserPlus,
    Flame,
    Download,
    Filter,
    ChevronRight,
    Search,
    Clock,
    X,
    CheckCircle
} from 'lucide-react';
import { LoadingSpinner, SectionHeader } from '../UIComponents';

interface SessionRecord {
    id: string;
    createdAt: any;
    attendeeCount: number;
    newMemberCount: number;
    active: boolean;
}

interface Attendee {
    uid: string;
    displayName: string;
    photoURL?: string;
    scannedAt?: any;
}

export const AttendanceAnalysis: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [sessions, setSessions] = useState<SessionRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSession, setSelectedSession] = useState<SessionRecord | null>(null);
    const [attendees, setAttendees] = useState<Attendee[]>([]);
    const [loadingAttendees, setLoadingAttendees] = useState(false);
    const [stats, setStats] = useState({
        totalCheckins: 0,
        avgPerSession: 0,
        totalNewMembers: 0,
        growthRate: 0
    });

    useEffect(() => {
        const fetchSessions = async () => {
            try {
                const sessionsRef = collection(db, 'attendance_sessions');
                const q = query(sessionsRef, orderBy('createdAt', 'desc'));

                const unsubscribe = onSnapshot(q, async (snapshot) => {
                    const sessionData: SessionRecord[] = [];
                    let totalAttendees = 0;
                    let totalNew = 0;

                    // For each session, we need to count attendees
                    // NOTE: In a high-traffic app, we'd store the count on the session document itself via cloud functions
                    // But for this portal, we'll fetch subcollection sizes for better accuracy in this admin view

                    const promises = snapshot.docs.map(async (docSnap) => {
                        const attendeesRef = collection(db, 'attendance_sessions', docSnap.id, 'attendees');
                        const attendeesSnap = await getDocs(attendeesRef);

                        const count = attendeesSnap.size;
                        const newData = attendeesSnap.docs.filter(d => d.data().isNewMember).length;

                        totalAttendees += count;
                        totalNew += newData;

                        return {
                            id: docSnap.id,
                            createdAt: docSnap.data().createdAt,
                            active: docSnap.data().active,
                            attendeeCount: count,
                            newMemberCount: newData
                        };
                    });

                    const results = await Promise.all(promises);
                    setSessions(results);

                    setStats({
                        totalCheckins: totalAttendees,
                        avgPerSession: results.length > 0 ? Math.round(totalAttendees / results.length) : 0,
                        totalNewMembers: totalNew,
                        growthRate: results.length > 0 ? Math.round((totalNew / totalAttendees) * 100) : 0
                    });

                    setLoading(false);
                });

                return () => unsubscribe();
            } catch (error) {
                console.error("Error fetching attendance history:", error);
                setLoading(false);
            }
        };

        fetchSessions();
    }, []);

    const filteredSessions = sessions.filter(s =>
        s.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelectSession = async (session: SessionRecord) => {
        setSelectedSession(session);
        setLoadingAttendees(true);
        try {
            const attendeesRef = collection(db, 'attendance_sessions', session.id, 'attendees');
            const q = query(attendeesRef, orderBy('scannedAt', 'desc'));
            const snap = await getDocs(q);
            setAttendees(snap.docs.map(d => d.data() as Attendee));
        } catch (error) {
            console.error("Error fetching attendees:", error);
        } finally {
            setLoadingAttendees(false);
        }
    };

    const handleCloseSession = async (sessionId: string) => {
        if (!confirm("Are you sure you want to close this session? No more check-ins will be allowed.")) return;
        try {
            const { updateDoc, doc } = await import('firebase/firestore');
            await updateDoc(doc(db, 'attendance_sessions', sessionId), {
                active: false
            });
            // Snapshot will update the list
            if (selectedSession?.id === sessionId) {
                setSelectedSession(prev => prev ? { ...prev, active: false } : null);
            }
        } catch (error) {
            console.error("Error closing session:", error);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20">
            <LoadingSpinner />
            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Loading historical data...</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-3 bg-white dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl hover:bg-church-green/10 text-gray-500 hover:text-church-green transition-all"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-3xl font-black dark:text-white tracking-tighter uppercase">Attendance Analytics</h2>
                        <p className="text-xs text-gray-500 font-medium">Review yearly participation and newcomer growth</p>
                    </div>
                </div>
                <button className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-black/10">
                    <Download size={14} /> Export Report
                </button>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {[
                    { label: 'Total Check-ins', value: stats.totalCheckins, icon: <Users />, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                    { label: 'Average/Session', value: stats.avgPerSession, icon: <BarChart3 />, color: 'text-church-green', bg: 'bg-church-green/10' },
                    { label: 'New Members', value: stats.totalNewMembers, icon: <UserPlus />, color: 'text-church-gold', bg: 'bg-church-gold/10' },
                    { label: 'Retention Focus', value: `${stats.growthRate}%`, icon: <Flame />, color: 'text-orange-500', bg: 'bg-orange-500/10' },
                ].map((s, idx) => (
                    <div key={idx} className="glass-card p-6 rounded-[2rem] border-white/40 shadow-premium flex flex-col gap-4 group hover:-translate-y-1 transition-all">
                        <div className={`w-12 h-12 ${s.bg} ${s.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                            {s.icon}
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{s.label}</p>
                            <p className="text-3xl font-black dark:text-white tracking-tighter">{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* List Table */}
            <div className="glass-card rounded-[2.5rem] border-white/40 shadow-premium overflow-hidden">
                <div className="p-8 border-b border-gray-100 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <Calendar className="text-church-green" size={24} />
                        <span className="font-black text-lg uppercase tracking-tight">Session History</span>
                    </div>
                    <div className="relative w-full md:w-64">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by date (YYYY-MM-DD)..."
                            className="w-full bg-gray-100 dark:bg-white/5 border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:ring-2 ring-church-green/30 transition-all shadow-inner"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-white/5">
                                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date / ID</th>
                                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Total Present</th>
                                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Newcomers</th>
                                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {filteredSessions.map(session => (
                                <tr key={session.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500">
                                                <Clock size={18} />
                                            </div>
                                            <div>
                                                <p className="font-black text-gray-900 dark:text-white uppercase tracking-tight">{session.id}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                    {session.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${session.active
                                            ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                                            : 'bg-gray-500/10 text-gray-500 border border-gray-500/20'
                                            }`}>
                                            {session.active ? 'Ongoing' : 'Closed'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <div className="flex flex-col items-center">
                                            <span className="text-lg font-black dark:text-white">{session.attendeeCount}</span>
                                            <div className="w-8 h-1 bg-church-green rounded-full opacity-20"></div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        {session.newMemberCount > 0 ? (
                                            <div className="flex flex-col items-center">
                                                <span className="text-lg font-black text-church-gold">{session.newMemberCount}</span>
                                                <span className="text-[8px] font-black text-church-gold uppercase tracking-tighter">Welcome Team Req.</span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 text-xs font-bold">—</span>
                                        )}
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button
                                            onClick={() => handleSelectSession(session)}
                                            className="p-3 bg-gray-100 dark:bg-white/5 rounded-xl text-gray-500 hover:text-church-green hover:bg-church-green/10 transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <ChevronRight size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {filteredSessions.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                        <div className="opacity-20 flex flex-col items-center">
                                            <Filter size={48} className="mb-4" />
                                            <p className="text-sm font-black uppercase tracking-widest">No matching sessions found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Session Detail Drawer/Modal */}
            {selectedSession && (
                <div className="fixed inset-0 z-[110] flex items-center justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-xl h-full bg-white dark:bg-[#0a0a0a] shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col">
                        <div className="p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${selectedSession.active ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'}`}>
                                    <Clock size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">{selectedSession.id}</h3>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Session Detail View</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedSession(null)}
                                className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-white/5 rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8">
                            <div className="flex items-center justify-between mb-8 pb-8 border-b border-gray-100 dark:border-white/5">
                                <div className="grid grid-cols-2 gap-8">
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${selectedSession.active ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                                            <span className="font-black text-sm uppercase dark:text-white">{selectedSession.active ? 'Live' : 'Closed'}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Unique Check-ins</p>
                                        <span className="font-black text-sm uppercase dark:text-white">{selectedSession.attendeeCount}</span>
                                    </div>
                                </div>
                                {selectedSession.active && (
                                    <button
                                        onClick={() => handleCloseSession(selectedSession.id)}
                                        className="px-6 py-3 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95 transition-all"
                                    >
                                        End Session
                                    </button>
                                )}
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Present Members</h4>
                                {loadingAttendees ? (
                                    <div className="py-12 flex justify-center"><LoadingSpinner /></div>
                                ) : attendees.length === 0 ? (
                                    <div className="py-12 text-center opacity-30">
                                        <Users size={32} className="mx-auto mb-2" />
                                        <p className="text-xs font-black uppercase tracking-widest">No one has checked in yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {attendees.map(attendee => (
                                            <div key={attendee.uid} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-transparent hover:border-church-green/30 transition-all group">
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={attendee.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(attendee.displayName)}&background=107e55&color=fff`}
                                                        className="w-10 h-10 rounded-xl object-cover"
                                                    />
                                                    <div>
                                                        <p className="text-sm font-black dark:text-white uppercase tracking-tight">{attendee.displayName}</p>
                                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Regular Member</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-church-green opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <CheckCircle size={14} />
                                                    <span>{attendee.scannedAt?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '0:00'}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
