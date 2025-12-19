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
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <ThemeProvider>
            <div className="min-h-screen bg-white dark:bg-[#050505] font-sans text-gray-900 dark:text-gray-100 transition-colors duration-700 selection:bg-church-green selection:text-white">


                {/* Hero Section - Immersive & Premium */}
                <section className="relative pt-48 pb-32 px-6 lg:pt-60 lg:pb-48 overflow-hidden">
                    {/* Atmospheric Background Decor */}
                    <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-church-green/5 rounded-full blur-[120px] -mr-32 -mt-32 animate-pulse-slow"></div>
                    <div className="absolute bottom-0 left-0 w-[40vw] h-[40vw] bg-church-gold/5 rounded-full blur-[100px] -ml-20 -mb-20"></div>

                    <div className="max-w-5xl mx-auto text-center relative z-10">
                        <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full glass-card border-gray-100 dark:border-white/5 mb-10 animate-fade-in">
                            <span className="w-2 h-2 rounded-full bg-church-green animate-pulse"></span>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">A World of Fellowship Awaits</span>
                        </div>

                        <h1 className="text-6xl md:text-8xl font-black mb-8 leading-[0.9] tracking-tighter text-gray-900 dark:text-white animate-fade-in-up">
                            Experience <br className="hidden md:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-church-green to-emerald-500">Divine Fellowship.</span>
                        </h1>

                        <p className="max-w-2xl mx-auto text-xl text-gray-500 dark:text-gray-400 mb-14 leading-relaxed font-medium animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                            Beyond a platform, it's an sanctuary. Access life-changing sermons, connect in real-time, and grow with a community that cares.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                            <button
                                onClick={() => onNavigate('register')}
                                className="w-full sm:w-auto px-12 py-5 rounded-[2.5rem] bg-church-green hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-[0.3em] shadow-premium hover:scale-105 transition-all flex items-center justify-center gap-3 group"
                            >
                                Join Us Today <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                            <button
                                onClick={() => onNavigate('login')}
                                className="w-full sm:w-auto px-12 py-5 rounded-[2.5rem] glass-card border-gray-100 dark:border-white/10 text-gray-900 dark:text-white font-black text-xs uppercase tracking-[0.3em] hover:bg-gray-50 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-3"
                            >
                                <PlayCircle size={18} className="text-church-gold" /> Explore Archive
                            </button>
                        </div>
                    </div>
                </section>

                {/* Video Teaser / Brand Moment */}
                <section className="px-6 mb-32">
                    <div className="max-w-6xl mx-auto">
                        <div className="relative rounded-[4rem] overflow-hidden shadow-premium group aspect-[21/9]">
                            <img
                                src="https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&q=80&w=2000"
                                alt="Worship"
                                className="w-full h-full object-cover transition-transform duration-[3000ms] group-hover:scale-110 blur-[2px] brightness-75"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col items-center justify-center text-center p-10">
                                <div className="p-8 bg-white/10 backdrop-blur-xl rounded-full border border-white/20 text-white hover:scale-110 transition-all cursor-pointer shadow-2xl mb-8 group/play">
                                    <PlayCircle size={64} className="fill-white/10 group-hover/play:fill-white/20" />
                                </div>
                                <h3 className="text-white text-3xl md:text-5xl font-black italic tracking-tighter mb-4">"Where the Spirit of the Lord is, there is Liberty."</h3>
                                <p className="text-white/60 font-bold uppercase tracking-[0.4em] text-xs">2 Corinthians 3:17</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features - Premium Masonry/Grid */}
                <section id="features" className="py-32 px-6 bg-gray-50/50 dark:bg-white/[0.02] border-y border-gray-100 dark:border-white/5">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
                            <div className="max-w-2xl">
                                <h4 className="text-church-green text-xs font-black uppercase tracking-[0.4em] mb-4">Divine Ecosystem</h4>
                                <h2 className="text-4xl md:text-6xl font-black dark:text-white tracking-tighter leading-none">Complete Tools for <br className="hidden md:block" /> your <span className="text-church-gold">Faith Journey.</span></h2>
                            </div>
                            <p className="max-w-xs text-gray-500 font-medium text-sm leading-relaxed">
                                Curated experiences designed to nurture your soul and connect you with the body of Christ.
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
                                <div key={i} className="group glass-card p-10 rounded-[3rem] hover:-translate-y-4 transition-all duration-700 animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                                    <div className="w-16 h-16 rounded-[1.5rem] mb-8 flex items-center justify-center bg-church-green/5 text-church-green group-hover:bg-church-green group-hover:text-white transition-all duration-500 shadow-sm">
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

                {/* Stats / Impact */}
                <section className="py-32 px-6">
                    <div className="max-w-7xl mx-auto flex flex-wrap justify-center gap-16 md:gap-32 text-center">
                        {[
                            { label: "Community Members", value: "5k+" },
                            { label: "Sermons Shared", value: "1.2k+" },
                            { label: "Prayer Requests", value: "10k+" },
                            { label: "Live Sessions", value: "24/7" }
                        ].map((stat, i) => (
                            <div key={i} className="animate-fade-in" style={{ animationDelay: `${i * 200}ms` }}>
                                <div className="text-5xl md:text-7xl font-black text-gray-900 dark:text-white tracking-tighter mb-2">{stat.value}</div>
                                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Testimonial Spotlight */}
                <section className="py-32 bg-church-green/5 dark:bg-white/[0.01]">
                    <div className="max-w-4xl mx-auto text-center px-6">
                        <div className="w-20 h-20 bg-church-gold/20 rounded-full flex items-center justify-center mx-auto mb-10">
                            <Star size={32} className="text-church-gold fill-current" />
                        </div>
                        <h3 className="text-3xl md:text-5xl font-black italic tracking-tighter dark:text-white mb-8 leading-tight">
                            "This portal has transformed how I fellowship. Even when I'm away, I feel closer to my church family than ever before."
                        </h3>
                        <div className="flex items-center justify-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden border-2 border-white shadow-lg">
                                <img src="https://ui-avatars.com/api/?name=Sarah+Johnson&background=random" alt="User" />
                            </div>
                            <div className="text-left">
                                <p className="font-black text-xs uppercase tracking-widest dark:text-white">Sarah Johnson</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Faithful Member</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="py-40 px-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-church-green"></div>
                    <div className="absolute top-0 right-0 w-[60vw] h-[60vw] bg-white/5 rounded-full blur-[100px] -mr-32 -mt-32"></div>

                    <div className="max-w-4xl mx-auto text-center text-white relative z-10">
                        <h2 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter leading-none">Ready to Begin <br /> Your Journey?</h2>
                        <p className="text-xl text-white/70 mb-14 max-w-2xl mx-auto font-medium leading-relaxed">
                            Join thousands of believers who are growing together in faith and love through the Doxa Portal.
                        </p>
                        <button
                            onClick={() => onNavigate('register')}
                            className="px-14 py-6 rounded-[3rem] bg-white text-church-green font-black text-xs uppercase tracking-[0.4em] hover:bg-gray-50 transition-all shadow-2xl hover:scale-105 active:scale-95"
                        >
                            Create Your Sanctuary
                        </button>
                    </div>
                </section>

                {/* Refined Footer */}
                <footer className="bg-white dark:bg-[#050505] py-20 px-8 border-t border-gray-100 dark:border-white/5">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-20">
                            <div className="col-span-1 md:col-span-2">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-10 h-10 bg-church-green rounded-xl flex items-center justify-center">
                                        <Star size={22} className="text-white" />
                                    </div>
                                    <span className="font-black text-xl tracking-tighter dark:text-white uppercase">Doxa Portal</span>
                                </div>
                                <p className="text-gray-400 font-medium max-w-sm leading-relaxed text-sm">
                                    Bringing the light of the gospel to the digital age through innovation, community, and unwavering faith.
                                </p>
                            </div>
                            <div>
                                <h5 className="text-[11px] font-black uppercase tracking-[0.3em] dark:text-white mb-8">Fellowship</h5>
                                <ul className="space-y-4 text-sm font-bold text-gray-500">
                                    <li><a href="#" className="hover:text-church-green transition-colors">Latest Sermons</a></li>
                                    <li><a href="#" className="hover:text-church-green transition-colors">Prayer Wall</a></li>
                                    <li><a href="#" className="hover:text-church-green transition-colors">Testimonies</a></li>
                                    <li><a href="#" className="hover:text-church-green transition-colors">Faith Journey</a></li>
                                    <li><a href="#" className="hover:text-church-green transition-colors">Events Calendar</a></li>
                                    <li><a href="#" className="hover:text-church-green transition-colors">Live Sessions</a></li>
                                </ul>
                            </div>
                            <div>
                                <h5 className="text-[11px] font-black uppercase tracking-[0.3em] dark:text-white mb-8">Connect</h5>
                                <div className='flex flex-col gap-4 text-sm font-bold text-gray-500'>
                                    <a href="#" className="hover:text-church-green transition-colors">Instagram</a>
                                    <a href="#" className="hover:text-church-green transition-colors">Facebook</a>
                                    <a href="#" className="hover:text-church-green transition-colors">YouTube</a>
                                    <a href="#" className="hover:text-church-green transition-colors">Twitter</a>
                                </div>
                            </div>
                        </div>
                        <div className="pt-10 border-t border-gray-100 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                &copy; {new Date().getFullYear()} Doxa Portal. Created with faith for the community.
                            </p>
                            <div className="flex gap-8 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                <a href="#" className="hover:text-black dark:hover:text-white transition-colors">Privacy</a>
                                <a href="#" className="hover:text-black dark:hover:text-white transition-colors">Terms</a>
                                <a href="#" className="hover:text-black dark:hover:text-white transition-colors">Contact</a>
                            </div>
                        </div>
                    </div>
                </footer>

                <FloatingSocialMenu />
            </div>
        </ThemeProvider>
    );
};

export default LandingPage;
