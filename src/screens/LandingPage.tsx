import React from 'react';
import {
    ArrowRight,
    BookOpen,
    Calendar,
    Heart,
    Users,
    ChevronRight,
    PlayCircle
} from 'lucide-react';
import { ThemeProvider } from '../components/ThemeContext';

interface LandingPageProps {
    onNavigate: (page: 'login' | 'register') => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
    return (
        <ThemeProvider>
            <div className="min-h-screen bg-white dark:bg-black font-sans text-gray-900 dark:text-gray-100 transition-colors duration-500">

                {/* Navigation */}
                <nav className="fixed w-full z-50 px-6 py-4 transition-all duration-300 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img src="/logo.png" alt="Doxa Portal" className="w-12 h-12 object-contain" />
                            <span className="font-serif font-bold text-xl tracking-tight dark:text-white">Doxa Portal</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => onNavigate('login')}
                                className="hidden md:block text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-church-green dark:hover:text-church-gold transition-colors"
                            >
                                Sign In
                            </button>
                            <button
                                onClick={() => onNavigate('register')}
                                className="px-5 py-2.5 rounded-full bg-church-green hover:bg-emerald-700 text-white text-sm font-bold shadow-lg shadow-church-green/20 hover:shadow-church-green/40 transition-all active:scale-95"
                            >
                                Get Started
                            </button>
                        </div>
                    </div>
                </nav>

                {/* Hero Section */}
                <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-church-green/10 via-transparent to-transparent opacity-50"></div>
                    <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-white dark:from-black to-transparent"></div>

                    <div className="max-w-7xl mx-auto relative z-10 text-center animate-fade-in-up">
                        <span className="inline-block py-1 px-3 rounded-full bg-church-gold/10 text-church-gold border border-church-gold/20 text-xs font-bold uppercase tracking-widest mb-6">
                            Welcome Home
                        </span>
                        <h1 className="text-5xl md:text-7xl font-serif font-bold mb-6 leading-tight dark:text-white">
                            Experience Fellowship <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-church-green to-church-gold">
                                Anytime, Anywhere.
                            </span>
                        </h1>
                        <p className="max-w-2xl mx-auto text-lg md:text-xl text-gray-500 dark:text-gray-400 mb-10 leading-relaxed">
                            Join our digital community to access sermons, stay updated with events, share testimonies, and grow in faith together.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button
                                onClick={() => onNavigate('register')}
                                className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-church-green to-emerald-700 text-white font-bold text-lg shadow-xl shadow-church-green/30 hover:shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-2"
                            >
                                Join Community <ArrowRight size={20} />
                            </button>
                            <button
                                onClick={() => onNavigate('login')}
                                className="w-full sm:w-auto px-8 py-4 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white font-bold text-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                            >
                                <PlayCircle size={20} className="text-church-gold" /> Watch Latest Sermon
                            </button>
                        </div>
                    </div>
                </section>

                {/* Features Grid */}
                <section className="py-24 px-6 bg-gray-50 dark:bg-[#111] relative">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4 dark:text-white">Everything you need to grow</h2>
                            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">Designed to help you stay connected with God and the church family through impactful digital tools.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {[
                                {
                                    icon: <BookOpen size={24} />,
                                    title: "Sermon Library",
                                    desc: "Access our complete archive of audio sermons. Listen on the go.",
                                    color: "church-green"
                                },
                                {
                                    icon: <Calendar size={24} />,
                                    title: "Events Calendar",
                                    desc: "Never miss a service or fellowship meeting. Stay in the loop.",
                                    color: "church-gold"
                                },
                                {
                                    icon: <Heart size={24} />,
                                    title: "Prayer Wall",
                                    desc: "Share requests and pray for others. Burden shared is burden halved.",
                                    color: "emerald-500"
                                },
                                {
                                    icon: <Users size={24} />,
                                    title: "Community",
                                    desc: "Connect with members, share testimonies, and celebrate God's goodness.",
                                    color: "amber-500"
                                }
                            ].map((feature, i) => (
                                <div key={i} className="group p-8 rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                                    <div className={`w-14 h-14 rounded-2xl mb-6 flex items-center justify-center bg-${feature.color}/10 text-${feature.color}`}>
                                        {React.cloneElement(feature.icon as React.ReactElement, { className: `text-${feature.color}` })}
                                    </div>
                                    <h3 className="text-xl font-bold mb-3 dark:text-white font-serif">{feature.title}</h3>
                                    <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm">{feature.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-24 px-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-church-green"></div>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-church-gold/20 rounded-full blur-3xl -ml-32 -mb-32"></div>

                    <div className="max-w-4xl mx-auto relative z-10 text-center text-white">
                        <h2 className="text-4xl md:text-5xl font-serif font-bold mb-8">Ready to join the family?</h2>
                        <p className="text-lg md:text-xl text-green-100 mb-10 max-w-2xl mx-auto">
                            Create an account today to get full access to all features and start your journey with us.
                        </p>
                        <button
                            onClick={() => onNavigate('register')}
                            className="px-10 py-4 rounded-full bg-white text-church-green font-bold text-lg shadow-xl hover:bg-gray-100 transition-all active:scale-95"
                        >
                            Create Free Account
                        </button>
                    </div>
                </section>

                {/* Footer */}
                <footer className="py-12 px-6 bg-gray-50 dark:bg-black border-t border-gray-200 dark:border-gray-800">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-church-green flex items-center justify-center">
                                <span className="text-white font-serif font-bold">D</span>
                            </div>
                            <span className="font-serif font-bold text-lg dark:text-white">Doxa Portal</span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            © {new Date().getFullYear()} Doxa Portal. All rights reserved.
                        </p>
                        <div className="flex gap-6">
                            <a href="#" className="text-gray-400 hover:text-church-green transition-colors">Privacy</a>
                            <a href="#" className="text-gray-400 hover:text-church-green transition-colors">Terms</a>
                            <a href="#" className="text-gray-400 hover:text-church-green transition-colors">Contact</a>
                        </div>
                    </div>
                </footer>
            </div>
        </ThemeProvider>
    );
};

export default LandingPage;
