import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, deleteDoc, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { ServiceReviewSession, ServiceReview } from '../../types';
import { Plus, Trash2, QrCode, ToggleLeft, ToggleRight, ExternalLink, MessageSquare, Star, Users, Calendar, Download, ChevronRight, Loader2, ListFilter, TrendingUp, BarChart3, Copy, Check } from 'lucide-react';
import QRCode from 'react-qr-code';

export const ServiceReviewManager: React.FC = () => {
    const [sessions, setSessions] = useState<ServiceReviewSession[]>([]);
    const [reviews, setReviews] = useState<Record<string, ServiceReview[]>>({});
    const [showNewSession, setShowNewSession] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedSession, setSelectedSession] = useState<ServiceReviewSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        const q = query(collection(db, 'service_review_sessions'), orderBy('date', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const sess = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ServiceReviewSession[];
            setSessions(sess);
            setLoading(false);
        });

        const qReviews = query(collection(db, 'service_reviews'), orderBy('createdAt', 'desc'));
        const unsubscribeReviews = onSnapshot(qReviews, (snapshot) => {
            const revs: Record<string, ServiceReview[]> = {};
            snapshot.docs.forEach(doc => {
                const data = doc.data() as ServiceReview;
                if (!revs[data.sessionId]) revs[data.sessionId] = [];
                revs[data.sessionId].push({ id: doc.id, ...data });
            });
            setReviews(revs);
        });

        return () => {
            unsubscribe();
            unsubscribeReviews();
        };
    }, []);

    const handleCreateSession = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle) return;

        try {
            await addDoc(collection(db, 'service_review_sessions'), {
                title: newTitle,
                date: newDate,
                isActive: true,
                createdAt: serverTimestamp(),
            });
            setNewTitle('');
            setShowNewSession(false);
        } catch (error) {
            console.error("Error creating session:", error);
        }
    };

    const toggleSession = async (id: string, currentStatus: boolean) => {
        try {
            await updateDoc(doc(db, 'service_review_sessions', id), {
                isActive: !currentStatus
            });
        } catch (error) {
            console.error("Error toggling session:", error);
        }
    };

    const deleteSession = async (id: string) => {
        if (!confirm("Are you sure? This will not delete the reviews but the session will be gone.")) return;
        try {
            await deleteDoc(doc(db, 'service_review_sessions', id));
        } catch (error) {
            console.error("Error deleting session:", error);
        }
    };

    const copyLink = (id: string) => {
        const url = `${window.location.origin}?reviewSession=${id}`;
        navigator.clipboard.writeText(url);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const getAverageRating = (sessionId: string) => {
        const sessReviews = reviews[sessionId] || [];
        if (sessReviews.length === 0) return 0;
        const sum = sessReviews.reduce((acc, r) => acc + r.rating, 0);
        return (sum / sessReviews.length).toFixed(1);
    };

    const exportToCSV = (sessionId: string, sessionTitle: string) => {
        const sessReviews = reviews[sessionId] || [];
        if (sessReviews.length === 0) return;

        const headers = ["Date", "Name", "Rating", "Experience", "Highlights", "Suggestions"];
        const rows = sessReviews.map(r => [
            r.createdAt?.toDate?.().toLocaleDateString() || "",
            r.displayName || "Anonymous",
            r.rating,
            `"${(r.generalExperience || "").replace(/"/g, '""')}"`,
            `"${(r.highlights || "").replace(/"/g, '""')}"`,
            `"${(r.suggestions || "").replace(/"/g, '""')}"`
        ]);

        const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `reviews_${sessionTitle.replace(/\s+/g, '_')}_${new Date().toLocaleDateString()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-8 animate-fade-in px-2 md:px-0">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-2xl bg-church-gold/10 text-church-gold flex items-center justify-center shadow-lg shadow-church-gold/10">
                            <BarChart3 size={24} />
                        </div>
                        <h2 className="text-3xl font-black dark:text-white tracking-tighter uppercase italic">Service Reviews</h2>
                    </div>
                    <p className="text-gray-500 font-bold text-[10px] uppercase tracking-[0.3em] ml-15">Analyze member feedback</p>
                </div>

                <button
                    onClick={() => setShowNewSession(!showNewSession)}
                    className="flex items-center justify-center gap-3 px-8 py-4 bg-church-green text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-church-green/20 hover:scale-105 active:scale-95 transition-all w-full md:w-auto"
                >
                    <Plus size={20} />
                    {showNewSession ? 'Cancel' : 'New Review Session'}
                </button>
            </div>

            {/* New Session Form */}
            {showNewSession && (
                <div className="glass-card p-8 rounded-[2rem] border-church-green/20 animate-fade-in-up">
                    <form onSubmit={handleCreateSession} className="grid md:grid-cols-3 gap-6 items-end">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Service Title</label>
                            <input
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder="Sunday Celebration Service..."
                                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl px-5 py-4 text-sm font-bold outline-none focus:border-church-green transition-all"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Service Date</label>
                            <input
                                type="date"
                                value={newDate}
                                onChange={(e) => setNewDate(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl px-5 py-4 text-sm font-bold outline-none focus:border-church-green transition-all"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="bg-church-green text-white py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-church-green/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                        >
                            <Plus size={18} />
                            Create Session
                        </button>
                    </form>
                </div>
            )}

            {/* Sessions Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {sessions.map((session) => {
                    const avgRating = getAverageRating(session.id);
                    const reviewCount = reviews[session.id]?.length || 0;

                    return (
                        <div key={session.id} className="glass-card p-6 md:p-8 rounded-[2.5rem] border-white/40 shadow-premium hover:border-church-gold/30 transition-all group flex flex-col md:flex-row gap-8">
                            {/* QR Code Section */}
                            <div className="flex flex-col items-center gap-4 shrikh-0">
                                <div className="p-4 bg-white rounded-3xl shadow-xl shadow-black/5 ring-1 ring-black/5 group-hover:ring-church-gold/20 transition-all">
                                    <QRCode
                                        value={`${window.location.origin}?reviewSession=${session.id}`}
                                        size={120}
                                        fgColor={session.isActive ? "#10B981" : "#94A3B8"}
                                    />
                                </div>
                                <button
                                    onClick={() => copyLink(session.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${copiedId === session.id
                                        ? 'bg-green-500 text-white'
                                        : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-church-green'
                                        }`}
                                >
                                    {copiedId === session.id ? <Check size={14} /> : <Copy size={14} />}
                                    {copiedId === session.id ? 'Copied' : 'Copy Link'}
                                </button>
                            </div>

                            {/* Info Section */}
                            <div className="flex-1 space-y-6">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Calendar size={14} className="text-church-gold" />
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{session.date}</span>
                                        </div>
                                        <h3 className="text-xl font-black dark:text-white leading-tight">{session.title}</h3>
                                    </div>
                                    <button
                                        onClick={() => toggleSession(session.id, session.isActive)}
                                        className={`p-2 rounded-xl transition-all ${session.isActive ? 'text-green-500' : 'text-gray-400'}`}
                                        title={session.isActive ? 'Session is Active' : 'Session is closed'}
                                    >
                                        {session.isActive ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                                        <div className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Average Rating</div>
                                        <div className="flex items-center gap-2 text-2xl font-black dark:text-white italic">
                                            <Star size={20} className="fill-church-gold text-church-gold" />
                                            {avgRating} {avgRating === "0.0" && <span className="text-[10px] text-gray-400 ml-1">N/A</span>}
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                                        <div className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Responses</div>
                                        <div className="flex items-center gap-2 text-2xl font-black dark:text-white italic">
                                            <Users size={20} className="text-church-green" />
                                            {reviewCount}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-2">
                                    <button
                                        onClick={() => setSelectedSession(selectedSession?.id === session.id ? null : session)}
                                        className="flex-1 py-3 bg-church-gold/10 hover:bg-church-gold/20 text-church-gold rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                    >
                                        <MessageSquare size={14} />
                                        {selectedSession?.id === session.id ? 'Hide Reviews' : 'View Feedback'}
                                    </button>
                                    <button
                                        onClick={() => deleteSession(session.id)}
                                        className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {loading && (
                    <div className="col-span-full py-20 flex flex-col items-center">
                        <Loader2 className="animate-spin text-church-green mb-4" size={32} />
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest leading-relaxed">Loading Analytics...</p>
                    </div>
                )}
            </div>

            {/* Selected Session Reviews */}
            {selectedSession && (
                <div className="animate-fade-in-up space-y-6">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xl font-black dark:text-white tracking-tight uppercase italic flex items-center gap-3">
                            <span className="w-10 h-10 rounded-xl bg-church-green/10 text-church-green flex items-center justify-center">
                                <MessageSquare size={20} />
                            </span>
                            Feedback for {selectedSession.title}
                        </h4>
                        <button
                            onClick={() => exportToCSV(selectedSession.id, selectedSession.title)}
                            className="text-[10px] font-black text-church-green uppercase tracking-widest flex items-center gap-2 hover:underline"
                        >
                            <Download size={14} /> Export CSV
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(reviews[selectedSession.id] || []).length > 0 ? (
                            reviews[selectedSession.id].map((review) => (
                                <div key={review.id} className="p-6 glass-card rounded-[2rem] border-white/20">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-church-green/10 flex items-center justify-center font-black text-church-green text-sm uppercase">
                                                {review.displayName?.[0] || 'U'}
                                            </div>
                                            <div>
                                                <div className="font-black dark:text-white text-xs">{review.displayName || 'Anonymous'}</div>
                                                <div className="text-[9px] text-gray-400 font-bold uppercase">{review.createdAt?.toDate?.().toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                    key={star}
                                                    size={12}
                                                    className={`${star <= review.rating ? 'fill-church-gold text-church-gold' : 'text-gray-200 dark:text-white/10'}`}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-[9px] font-black text-church-green uppercase tracking-widest mb-1">Service Experience</p>
                                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 leading-relaxed italic">
                                                "{review.generalExperience}"
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">What caught their eye</p>
                                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 leading-relaxed italic">
                                                "{review.highlights}"
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-church-gold uppercase tracking-widest mb-1">Suggestions</p>
                                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 leading-relaxed italic">
                                                "{review.suggestions}"
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-12 text-center glass-card rounded-[2rem] border-dashed border-gray-200 dark:border-white/10">
                                <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">No reviews yet for this session</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
