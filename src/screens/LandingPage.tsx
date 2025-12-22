import React, { useEffect, useState } from 'react';
import {
    ArrowRight,
    BookOpen,
    Calendar,
    Heart,
    Users,
    ChevronRight,
    PlayCircle,
    Shield,
    Video,
    MessageCircle,
    Star,
    Anchor,
    Brain,
    ImageIcon
} from 'lucide-react';
import { ThemeProvider } from '../components/ThemeContext';
import {
    FloatingSocialMenu
} from '../components/UIComponents';

interface LandingPageProps {
    onNavigate: (page: 'login' | 'register') => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);

        // Simple Intersection Observer to reveal elements
        const observerOptions = { threshold: 0.1 };
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('reveal-visible');
                }
            });
        }, observerOptions);

        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

        return () => {
            window.removeEventListener('scroll', handleScroll);
            observer.disconnect();
        };
    }, []);

    return (
        <ThemeProvider>
            <div className="min-h-screen bg-white dark:bg-[#050505] font-sans text-gray-900 dark:text-gray-100 transition-colors duration-700 selection:bg-church-green selection:text-white">

                {/* --- Sticky Header --- */}
                <header
                    className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 px-6 py-4 ${scrolled ? 'glass-header py-3' : 'bg-transparent'
                        }`}
                >
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                            <div className="w-10 h-10 bg-gradient-to-br from-church-green to-emerald-700 rounded-xl flex items-center justify-center shadow-lg shadow-church-green/20 group-hover:scale-110 transition-all duration-500">
                                <img src="/logo.png" alt="Doxa Portal" className="w-6 h-6 object-contain" />
                            </div>
                            <span className="font-sans font-black text-xl tracking-tighter dark:text-white uppercase transition-colors group-hover:text-church-green">
                                Doxa<span className="text-church-green group-hover:text-white">Portal</span>
                            </span>
                        </div>

                        <nav className="hidden md:flex items-center gap-8 mr-auto ml-12">
                            {['features', 'vision', 'community'].map((item) => (
                                <button
                                    key={item}
                                    onClick={() => document.getElementById(item)?.scrollIntoView({ behavior: 'smooth' })}
                                    className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-church-green transition-colors"
                                >
                                    {item}
                                </button>
                            ))}
                        </nav>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => onNavigate('login')}
                                className="px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest text-gray-700 dark:text-white hover:text-church-green dark:hover:text-church-green transition-colors"
                            >
                                Sign In
                            </button>
                            <button
                                onClick={() => onNavigate('register')}
                                className="px-6 py-2.5 bg-church-green hover:bg-emerald-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-church-green/20 hover:scale-105 active:scale-95 transition-all"
                            >
                                Join Us
                            </button>
                        </div>
                    </div>
                </header>

                {/* Hero Section - Immersive & Premium */}
                <section className="relative pt-48 pb-32 px-6 lg:pt-64 lg:pb-48 overflow-hidden">
                    {/* Atmospheric Background Decor */}
                    <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-church-green/10 rounded-full blur-[120px] -mr-32 -mt-32 animate-pulse-slow"></div>
                    <div className="absolute bottom-0 left-0 w-[40vw] h-[40vw] bg-church-gold/10 rounded-full blur-[100px] -ml-20 -mb-20"></div>

                    <div className="max-w-6xl mx-auto text-center relative z-10">
                        <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full glass-card border-gray-100 dark:border-white/5 mb-10 animate-fade-in">
                            <span className="w-2 h-2 rounded-full bg-church-green animate-pulse"></span>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">A World of Fellowship Awaits</span>
                        </div>

                        <h1 className="text-7xl md:text-9xl font-black mb-8 leading-[0.85] tracking-tighter text-gray-900 dark:text-white animate-fade-in-up">
                            Experience <br className="hidden md:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-church-green via-emerald-500 to-church-gold">Divine Presence.</span>
                        </h1>

                        <p className="max-w-3xl mx-auto text-xl md:text-2xl text-gray-500 dark:text-gray-400 mb-14 leading-relaxed font-medium animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                            Doxa Portal isn't just an app—it's a digital sanctuary. From life-changing sermons to direct intercession, we bridge the gap between you and the body of Christ.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                            <button
                                onClick={() => onNavigate('register')}
                                className="w-full sm:w-auto px-12 py-5 rounded-2xl bg-church-green hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-church-green/40 hover:scale-105 transition-all flex items-center justify-center gap-3 group"
                            >
                                Get Started Free <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                            <button
                                onClick={() => onNavigate('login')}
                                className="w-full sm:w-auto px-12 py-5 rounded-2xl glass-card border-gray-100 dark:border-white/10 text-gray-900 dark:text-white font-black text-xs uppercase tracking-[0.3em] hover:bg-gray-50 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-3"
                            >
                                <PlayCircle size={18} className="text-church-gold" /> Member Login
                            </button>
                        </div>
                    </div>
                </section>

                {/* Video Teaser / Brand Moment */}
                <section id="vision" className="px-6 mb-32 reveal">
                    <div className="max-w-7xl mx-auto">
                        <div className="relative rounded-[3rem] md:rounded-[5rem] overflow-hidden shadow-premium group aspect-[21/9] border-8 border-white dark:border-gray-900">
                            <img
                                src="https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&q=80&w=2000"
                                alt="Worship"
                                className="w-full h-full object-cover transition-transform duration-[3000ms] group-hover:scale-110 brightness-50"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col items-center justify-center text-center p-10">
                                <div className="p-8 bg-white/10 backdrop-blur-3xl rounded-full border border-white/20 text-white hover:scale-110 transition-all cursor-pointer shadow-2xl mb-8 group/play">
                                    <PlayCircle size={64} className="fill-white/10 group-hover/play:fill-white/40 transition-all" />
                                </div>
                                <h3 className="text-white text-4xl md:text-6xl font-black italic tracking-tighter mb-4 leading-none max-w-4xl">"Where the Spirit of the Lord is, there is Liberty."</h3>
                                <div className="flex items-center gap-4">
                                    <div className="h-px w-12 bg-church-gold/50"></div>
                                    <p className="text-church-gold font-black uppercase tracking-[0.4em] text-xs">2 Corinthians 3:17</p>
                                    <div className="h-px w-12 bg-church-gold/50"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features - Premium Masonry/Grid */}
                <section id="features" className="py-40 px-6 bg-gray-50/50 dark:bg-white/[0.02] border-y border-gray-100 dark:border-white/5 reveal">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-8">
                            <div className="max-w-2xl">
                                <h4 className="text-church-green text-xs font-black uppercase tracking-[0.4em] mb-4">Divine Ecosystem</h4>
                                <h2 className="text-5xl md:text-7xl font-black dark:text-white tracking-tighter leading-none">Complete Tools for <br className="hidden md:block" /> your <span className="text-church-gold">Soul's Growth.</span></h2>
                            </div>
                            <p className="max-w-xs text-gray-500 font-medium text-lg leading-relaxed mb-4">
                                Curated experiences designed to nurture your spirit and connect the community.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {[
                                {
                                    icon: <BookOpen size={28} />,
                                    title: "Enlightened Sermons",
                                    desc: "Immerse yourself in our divine archive of audio and video sermons.",
                                    tag: "HD Audio"
                                },
                                {
                                    icon: <Calendar size={28} />,
                                    title: "Dynamic Events",
                                    desc: "Join live services and community gatherings with effortless scheduling.",
                                    tag: "Real-time"
                                },
                                {
                                    icon: <Heart size={28} />,
                                    title: "Prayer Sanctuary",
                                    desc: "Share your burdens and intercede for others in a sacred digital space.",
                                    tag: "Sacred"
                                },
                                {
                                    icon: <Star size={28} />,
                                    title: "Faith Journey",
                                    desc: "Track your spiritual growth, earn badges, and celebrate milestones.",
                                    tag: "Personalized"
                                },
                                {
                                    icon: <Brain size={28} />,
                                    title: "Biblical Quizzes",
                                    desc: "Test your knowledge and grow in your understanding of the Word.",
                                    tag: "Interactive"
                                },
                                {
                                    icon: <BookOpen size={28} />,
                                    title: "Immersive Bible",
                                    desc: "Read and study the Word with our focused, premium reader experience.",
                                    tag: "Scripture"
                                },
                                {
                                    icon: <ImageIcon size={28} />,
                                    title: "Sacred Gallery",
                                    desc: "Explore visual moments of our community through our curated gallery.",
                                    tag: "Visuals"
                                },
                                {
                                    icon: <Users size={28} />,
                                    title: "Spiritual Testimonies",
                                    desc: "Share your amazing stories of faith and be encouraged by others.",
                                    tag: "Inspiring"
                                }
                            ].map((feature, i) => (
                                <div key={i} className="group glass-card p-10 rounded-[3rem] hover:-translate-y-4 transition-all duration-700">
                                    <div className="w-16 h-16 rounded-2xl mb-8 flex items-center justify-center bg-church-green/5 text-church-green group-hover:bg-church-green group-hover:text-white transition-all duration-500 shadow-sm">
                                        {feature.icon}
                                    </div>
                                    <div className="mb-4">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-church-gold/60">{feature.tag}</span>
                                        <h3 className="text-xl font-black mt-1 text-gray-900 dark:text-white tracking-tight">{feature.title}</h3>
                                    </div>
                                    <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm font-medium">{feature.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Community Section */}
                <section id="community" className="py-32 reveal px-6">
                    <div className="max-w-6xl mx-auto rounded-[4rem] bg-gradient-to-br from-indigo-900 to-slate-900 overflow-hidden relative shadow-premium">
                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '30px 30px' }}></div>
                        <div className="p-12 md:p-24 relative z-10 flex flex-col md:flex-row items-center gap-16">
                            <div className="flex-1 text-center md:text-left">
                                <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-none mb-8">Built for the <br /><span className="text-church-gold">Modern Believer.</span></h2>
                                <p className="text-white/60 text-lg md:text-xl font-medium mb-12 leading-relaxed">
                                    Doxa Portal combines state-of-the-art technology with time-honored spiritual values. It's safe, secure, and purely professional.
                                </p>
                                <div className="flex flex-wrap gap-8 justify-center md:justify-start">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white border border-white/20"><Shield /></div>
                                        <p className="text-xs font-black uppercase tracking-widest text-white">Encrypted Data</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white border border-white/20"><Video /></div>
                                        <p className="text-xs font-black uppercase tracking-widest text-white">4K Live Streams</p>
                                    </div>
                                </div>
                            </div>
                            <div className="w-64 h-64 md:w-96 md:h-96 rounded-[3rem] bg-white/10 backdrop-blur-3xl border border-white/20 shadow-2xl flex items-center justify-center relative group">
                                <div className="absolute inset-0 bg-church-green/20 rounded-full blur-[100px] animate-pulse"></div>
                                <Star size={128} className="text-church-gold relative z-10 animate-float" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Stats / Impact */}
                <section className="py-32 px-6 reveal">
                    <div className="max-w-7xl mx-auto flex flex-wrap justify-center gap-16 md:gap-32 text-center">
                        {[
                            { label: "Community Members", value: "5k+" },
                            { label: "Sermons Shared", value: "1.2k+" },
                            { label: "Prayer Requests", value: "10k+" },
                            { label: "Live Sessions", value: "24/7" }
                        ].map((stat, i) => (
                            <div key={i}>
                                <div className="text-6xl md:text-8xl font-black text-gray-900 dark:text-white tracking-tighter mb-2">{stat.value}</div>
                                <div className="text-[10px] font-black uppercase tracking-[0.4em] text-church-green">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Testimonial Spotlight */}
                <section className="py-40 bg-church-green/5 dark:bg-white/[0.01] reveal">
                    <div className="max-w-4xl mx-auto text-center px-6">
                        <div className="w-24 h-24 bg-white dark:bg-gray-900 rounded-[2rem] shadow-premium flex items-center justify-center mx-auto mb-12 border border-gray-100 dark:border-white/5">
                            <Star size={48} className="text-church-gold fill-current" />
                        </div>
                        <h3 className="text-3xl md:text-5xl font-black italic tracking-tighter dark:text-white mb-10 leading-tight">
                            "A revolutionary approach to digital fellowship. The Doxa Portal provides a sanctuary for my soul in the midst of a busy world."
                        </h3>
                        <div className="flex items-center justify-center gap-6">
                            <div className="w-16 h-16 rounded-[1.5rem] bg-gray-200 overflow-hidden border-4 border-white dark:border-gray-800 shadow-2xl">
                                <img src="https://ui-avatars.com/api/?name=Rev.+David+Amoah&background=16A34A&color=fff" alt="User" />
                            </div>
                            <div className="text-left">
                                <p className="font-black text-sm uppercase tracking-widest dark:text-white">Rev. David Amoah</p>
                                <p className="text-[10px] font-bold text-church-green uppercase tracking-widest mt-1">Founding Director</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="py-48 px-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-church-green"></div>
                    <div className="absolute top-0 right-0 w-[60vw] h-[60vw] bg-white/10 rounded-full blur-[120px] -mr-32 -mt-32"></div>
                    <div className="absolute bottom-0 left-0 w-[40vw] h-[40vw] bg-black/10 rounded-full blur-[100px] -ml-20 -mb-20"></div>

                    <div className="max-w-4xl mx-auto text-center text-white relative z-10">
                        <h2 className="text-6xl md:text-8xl font-black mb-10 tracking-tighter leading-[0.85]">Ready to Begin <br /> Your Journey?</h2>
                        <p className="text-xl md:text-2xl text-white/80 mb-16 max-w-2xl mx-auto font-medium leading-relaxed">
                            Join thousands who are maturing together in faith. Your sanctuary is just one click away.
                        </p>
                        <button
                            onClick={() => onNavigate('register')}
                            className="px-16 py-7 rounded-2xl bg-white text-church-green font-black text-sm uppercase tracking-[0.4em] hover:bg-gray-100 transition-all shadow-2xl hover:scale-110 active:scale-95 border-b-4 border-gray-200"
                        >
                            Create Your Sanctuary
                        </button>
                    </div>
                </section>

                {/* Refined Footer */}
                <footer className="bg-white dark:bg-[#050505] py-24 px-8 border-t border-gray-100 dark:border-white/5">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-20 mb-24">
                            <div className="col-span-1 md:col-span-2">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-12 h-12 bg-church-green rounded-2xl flex items-center justify-center shadow-lg shadow-church-green/20">
                                        <Star size={24} className="text-white" />
                                    </div>
                                    <span className="font-black text-2xl tracking-tighter dark:text-white uppercase italic">Doxa <span className="text-church-green">Portal</span></span>
                                </div>
                                <p className="text-gray-500 font-medium max-w-sm leading-relaxed text-lg">
                                    Harnessing innovation to nurture spirits and unify the body of Christ across the digital frontier.
                                </p>
                            </div>
                            <div>
                                <h5 className="text-[11px] font-black uppercase tracking-[0.4em] dark:text-white mb-10 border-b border-gray-100 dark:border-white/5 pb-4">Resources</h5>
                                <ul className="space-y-5 text-sm font-black text-gray-400 uppercase tracking-widest">
                                    <li><a href="#" className="hover:text-church-green transition-colors">Sermons Archive</a></li>
                                    <li><a href="#" className="hover:text-church-green transition-colors">Prayer Requests</a></li>
                                    <li><a href="#" className="hover:text-church-green transition-colors">Community Stats</a></li>
                                    <li><a href="#" className="hover:text-church-green transition-colors">Vision 2025</a></li>
                                </ul>
                            </div>
                            <div>
                                <h5 className="text-[11px] font-black uppercase tracking-[0.4em] dark:text-white mb-10 border-b border-gray-100 dark:border-white/5 pb-4">Contact</h5>
                                <div className='flex flex-col gap-5 text-sm font-black text-gray-400 uppercase tracking-widest'>
                                    <p className="flex items-center gap-3"><MessageCircle size={16} /> support@doxa.portal</p>
                                    <p className="flex items-center gap-3"><Shield size={16} /> Data Security</p>
                                    <div className="flex gap-4 pt-4">
                                        {[1, 2, 3].map(i => <div key={i} className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 transition-colors hover:bg-church-green"></div>)}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="pt-12 border-t border-gray-100 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
                                &copy; {new Date().getFullYear()} Doxa Portal v3.0. Purely Professional.
                            </p>
                            <div className="flex gap-10 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
                                <a href="#" className="hover:text-church-green transition-colors">Security Ethics</a>
                                <a href="#" className="hover:text-church-green transition-colors">Transparency</a>
                                <a href="#" className="hover:text-church-green transition-colors">Terms of Sanctuary</a>
                            </div>
                        </div>
                    </div>
                </footer>

                <style>{`
                    .reveal {
                        opacity: 0;
                        transform: translateY(30px);
                        transition: all 1s cubic-bezier(0.16, 1, 0.3, 1);
                    }
                    .reveal-visible {
                        opacity: 1;
                        transform: translateY(0);
                    }
                `}</style>

                <FloatingSocialMenu />
            </div>
        </ThemeProvider>
    );
};

export default LandingPage;
