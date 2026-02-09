import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, ServiceReviewSession } from '../types';
import { Star, Send, CheckCircle2, MessageSquare, Calendar, Loader2, ArrowLeft, PenTool } from 'lucide-react';
import { SectionHeader } from '../components/UIComponents';

interface ServiceReviewScreenProps {
    user: UserProfile;
    sessionId?: string;
    onBack?: () => void;
}

const ServiceReviewScreen: React.FC<ServiceReviewScreenProps> = ({ user, sessionId, onBack }) => {
    const [session, setSession] = useState<ServiceReviewSession | null>(null);
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [generalExperience, setGeneralExperience] = useState('');
    const [highlights, setHighlights] = useState('');
    const [suggestions, setSuggestions] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribe: () => void;

        if (sessionId) {
            // Fetch specific session
            const fetchSession = async () => {
                const docRef = doc(db, 'service_review_sessions', sessionId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists() && docSnap.data().isActive) {
                    setSession({ id: docSnap.id, ...docSnap.data() } as ServiceReviewSession);
                }
                setLoading(false);
            };
            fetchSession();
        } else {
            // Fetch latest active session
            const q = query(
                collection(db, 'service_review_sessions'),
                where('isActive', '==', true),
                orderBy('date', 'desc'),
                limit(1)
            );

            unsubscribe = onSnapshot(q, (snapshot) => {
                if (!snapshot.empty) {
                    const data = snapshot.docs[0].data();
                    setSession({ id: snapshot.docs[0].id, ...data } as ServiceReviewSession);
                }
                setLoading(false);
            });
        }

        return () => unsubscribe?.();
    }, [sessionId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) return;

        setSubmitting(true);
        try {
            await addDoc(collection(db, 'service_reviews'), {
                sessionId: session?.id,
                uid: user.uid,
                displayName: user.displayName,
                rating,
                generalExperience,
                highlights,
                suggestions,
                createdAt: serverTimestamp()
            });
            setSubmitted(true);
        } catch (error) {
            console.error("Error submitting review:", error);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="w-12 h-12 text-church-green animate-spin mb-4" />
                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Loading Review Form...</p>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-12 text-center animate-fade-in">
                <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400">
                    <Calendar size={40} />
                </div>
                <h2 className="text-2xl font-black dark:text-white mb-4 tracking-tight uppercase">No Active Review Session</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto">
                    There are no services currently open for review. Please check back after the next service.
                </p>
                {onBack && (
                    <button
                        onClick={onBack}
                        className="px-8 py-4 bg-church-green text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-church-green/20 active:scale-95 transition-all"
                    >
                        Back to Home
                    </button>
                )}
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-12 text-center animate-fade-in-up">
                <div className="w-24 h-24 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-green-500/20">
                    <CheckCircle2 size={48} className="animate-bounce" />
                </div>
                <h2 className="text-3xl font-black dark:text-white mb-4 tracking-tighter uppercase italic">Thank You!</h2>
                <p className="text-gray-500 dark:text-gray-400 text-lg font-medium mb-12 max-w-md mx-auto leading-relaxed">
                    Your feedback is invaluable to us. We appreciate your contribution to making our services better.
                </p>
                {onBack && (
                    <button
                        onClick={onBack}
                        className="px-10 py-5 bg-church-green text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-church-green/20 active:scale-95 transition-all"
                    >
                        Return to Dashboard
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-4 md:px-0 pb-20 animate-fade-in">
            <div className="flex items-center gap-4 mb-8">
                {onBack && (
                    <button
                        onClick={onBack}
                        className="p-3 bg-white dark:bg-white/5 rounded-2xl text-gray-400 hover:text-church-green transition-all border border-gray-100 dark:border-white/5"
                    >
                        <ArrowLeft size={20} />
                    </button>
                )}
                <div>
                    <h1 className="text-2xl md:text-4xl font-black dark:text-white tracking-tighter uppercase italic">Service Review</h1>
                    <p className="text-church-green font-black text-[10px] md:text-xs uppercase tracking-[0.3em] mt-1">{session.title}</p>
                </div>
            </div>

            <div className="glass-card p-1 p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] relative overflow-hidden group border-white/40 shadow-premium">
                <div className="absolute top-0 right-0 w-64 h-64 bg-church-green/5 blur-[80px] -mr-32 -mt-32 group-hover:bg-church-green/10 transition-colors"></div>

                <form onSubmit={handleSubmit} className="relative z-10 space-y-12">
                    {/* Rating Section */}
                    <div className="space-y-6">
                        <label className="text-sm font-black text-gray-400 uppercase tracking-widest block text-center">
                            How was your experience today?
                        </label>
                        <div className="flex justify-center gap-2 md:gap-4">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    onClick={() => setRating(star)}
                                    className="p-2 transition-all duration-300 transform hover:scale-125 active:scale-90"
                                >
                                    <Star
                                        size={48}
                                        className={`transition-all duration-300 ${(hoverRating || rating) >= star
                                            ? 'fill-church-gold text-church-gold drop-shadow-[0_0_10px_rgba(255,193,7,0.4)]'
                                            : 'text-gray-200 dark:text-white/10'
                                            }`}
                                    />
                                </button>
                            ))}
                        </div>
                        {rating > 0 && (
                            <p className="text-center font-black text-church-gold text-xs uppercase tracking-[0.2em] animate-fade-in italic">
                                {rating === 5 ? 'Excellent! 🌟' : rating === 4 ? 'Very Good! ✨' : rating === 3 ? 'Good 👍' : rating === 2 ? 'Fair 😐' : 'Could be better 😕'}
                            </p>
                        )}
                    </div>

                    {/* Question 1: How was service? */}
                    <div className="space-y-4">
                        <label className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-3">
                            <span className="w-8 h-8 rounded-xl bg-church-green/10 text-church-green flex items-center justify-center">
                                <MessageSquare size={16} />
                            </span>
                            How was the service today?
                        </label>
                        <div className="relative">
                            <textarea
                                value={generalExperience}
                                onChange={(e) => setGeneralExperience(e.target.value)}
                                placeholder="Share your general thoughts about the service..."
                                className="w-full bg-gray-50 dark:bg-white/5 border-2 border-transparent focus:border-church-green/20 rounded-[2rem] p-6 md:p-8 text-gray-700 dark:text-gray-100 text-base md:text-lg min-h-[120px] outline-none transition-all placeholder:text-gray-400"
                                required
                            />
                        </div>
                    </div>

                    {/* Question 2: What caught your eye? */}
                    <div className="space-y-4">
                        <label className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-3">
                            <span className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                <CheckCircle2 size={16} />
                            </span>
                            What caught your eye or stood out to you?
                        </label>
                        <div className="relative">
                            <textarea
                                value={highlights}
                                onChange={(e) => setHighlights(e.target.value)}
                                placeholder="Any specific moment, word, or person that stood out?"
                                className="w-full bg-gray-50 dark:bg-white/5 border-2 border-transparent focus:border-church-green/20 rounded-[2rem] p-6 md:p-8 text-gray-700 dark:text-gray-100 text-base md:text-lg min-h-[120px] outline-none transition-all placeholder:text-gray-400"
                                required
                            />
                        </div>
                    </div>

                    {/* Question 3: What would you suggest? */}
                    <div className="space-y-4">
                        <label className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-3">
                            <span className="w-8 h-8 rounded-xl bg-church-gold/10 text-church-gold flex items-center justify-center">
                                <PenTool size={16} />
                            </span>
                            What would you suggest we improve?
                        </label>
                        <div className="relative">
                            <textarea
                                value={suggestions}
                                onChange={(e) => setSuggestions(e.target.value)}
                                placeholder="How can we make your next experience even better?"
                                className="w-full bg-gray-50 dark:bg-white/5 border-2 border-transparent focus:border-church-green/20 rounded-[2rem] p-6 md:p-8 text-gray-700 dark:text-gray-100 text-base md:text-lg min-h-[120px] outline-none transition-all placeholder:text-gray-400"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting || rating === 0}
                        className="w-full py-6 md:py-8 bg-church-green text-white rounded-[2rem] font-black text-xs md:text-sm uppercase tracking-[0.3em] flex items-center justify-center gap-4 transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50 shadow-2xl shadow-church-green/30"
                    >
                        {submitting ? (
                            <Loader2 className="animate-spin" size={24} />
                        ) : (
                            <>
                                <Send size={20} />
                                Submit Your Review
                            </>
                        )}
                    </button>
                </form>
            </div>

            <div className="mt-12 p-8 glass-card rounded-[2.5rem] border-church-green/10 bg-gradient-to-r from-church-green/5 to-emerald-500/5 text-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
                    Your Privacy Matters
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                    Reviews are shared with church leadership to help enhance our service delivery.
                    Thank you for your honesty and participation.
                </p>
            </div>
        </div>
    );
};

export default ServiceReviewScreen;
