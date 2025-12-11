import React, { useEffect, useState } from 'react';
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
import {
    FloatingSocialMenu
} from '../components/UIComponents';

interface LandingPageProps {
    onNavigate: (page: 'login' | 'register') => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
    return (
        <ThemeProvider>
            <div className="min-h-screen bg-white dark:bg-black font-sans text-gray-900 dark:text-gray-100 transition-colors duration-500">

                {/* Navigation - Solid Background */}
                <nav className="fixed w-full z-50 px-6 py-4 bg-white dark:bg-black border-b border-gray-100 dark:border-gray-900 shadow-sm">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img src="/logo.png" alt="Doxa Portal" className="w-10 h-10 object-contain" />
                            <span className="font-serif font-bold text-xl tracking-wide dark:text-white uppercase text-gray-900">Doxa Portal</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => onNavigate('login')}
                                className="hidden md:block text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-church-green dark:hover:text-white transition-colors uppercase tracking-wider"
                            >
                                Sign In
                            </button>
                            <button
                                onClick={() => onNavigate('register')}
                                className="px-6 py-2.5 rounded-lg bg-church-green hover:bg-green-700 text-white text-sm font-bold transition-all shadow-sm active:scale-95 uppercase tracking-wide"
                            >
                                Get Started
                            </button>
                        </div>
                    </div>
                </nav>

                {/* Hero Section - Clean & Formal */}
                <section className="relative pt-40 pb-24 px-6 md:pt-48 md:pb-32 bg-gray-50 dark:bg-[#0a0a0a] border-b border-gray-100 dark:border-gray-900">
                    <div className="max-w-4xl mx-auto text-center animate-fade-in-up">
                        {/* Pill Label */}
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm mb-8">
                            <span className="w-2 h-2 rounded-full bg-church-green animate-pulse"></span>
                            <span className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">Welcome Home</span>
                        </div>

                        <h1 className="text-5xl md:text-7xl font-serif font-bold mb-6 leading-tight text-gray-900 dark:text-white">
                            Experience Fellowship <br />
                            <span className="text-church-green">Anytime, Anywhere.</span>
                        </h1>
                        <p className="max-w-2xl mx-auto text-lg text-gray-600 dark:text-gray-400 mb-10 leading-relaxed font-light">
                            Join our digital community to access sermons, stay updated with events, share testimonies, and grow in faith together in a space designed for clarity and peace.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button
                                onClick={() => onNavigate('register')}
                                className="w-full sm:w-auto px-8 py-4 rounded-lg bg-church-green hover:bg-green-700 text-white font-bold text-sm uppercase tracking-widest shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                            >
                                Join Community <ArrowRight size={18} />
                            </button>
                            <button
                                onClick={() => onNavigate('login')}
                                className="w-full sm:w-auto px-8 py-4 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white font-bold text-sm uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                            >
                                <PlayCircle size={18} className="text-church-gold" /> Watch Latest Sermon
                            </button>
                        </div>
                    </div>
                </section>

                {/* Features Grid - Solid Cards */}
                <section className="py-24 px-6 bg-white dark:bg-black">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4 text-gray-900 dark:text-white">Everything you need to grow</h2>
                            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto font-light">
                                Professional tools for your spiritual journey.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {[
                                {
                                    icon: <BookOpen size={24} />,
                                    title: "Sermon Library",
                                    desc: "Access our complete archive of audio sermons. Listen on the go.",
                                    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                },
                                {
                                    icon: <Calendar size={24} />,
                                    title: "Events Calendar",
                                    desc: "Never miss a service or fellowship meeting. Stay in the loop.",
                                    color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                },
                                {
                                    icon: <Heart size={24} />,
                                    title: "Prayer Wall",
                                    desc: "Share requests and pray for others. Burden shared is burden halved.",
                                    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                },
                                {
                                    icon: <Users size={24} />,
                                    title: "Community",
                                    desc: "Connect with members, share testimonies, and celebrate goodness.",
                                    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                }
                            ].map((feature, i) => (
                                <div key={i} className="group p-8 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-transparent hover:border-gray-200 dark:hover:border-gray-800 transition-all duration-300">
                                    <div className={`w-12 h-12 rounded-lg mb-6 flex items-center justify-center ${feature.color}`}>
                                        {feature.icon}
                                    </div>
                                    <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white font-serif">{feature.title}</h3>
                                    <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm font-light">{feature.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Formal CTA Section */}
                <section className="py-24 px-6 bg-church-green relative">
                    <div className="max-w-4xl mx-auto text-center text-white">
                        <h2 className="text-3xl md:text-5xl font-serif font-bold mb-6">Ready to join the family?</h2>
                        <p className="text-lg text-green-100 mb-10 max-w-2xl mx-auto font-light">
                            Create an account today to get full access to all features and start your journey with us.
                        </p>
                        <button
                            onClick={() => onNavigate('register')}
                            className="px-10 py-4 rounded-lg bg-white text-church-green font-bold text-sm uppercase tracking-widest hover:bg-gray-50 transition-all shadow-xl"
                        >
                            Create Free Account
                        </button>
                    </div>
                </section>

                {/* Simple Footer */}
                <div className="bg-gray-50 dark:bg-[#0a0a0a] border-t border-gray-200 dark:border-gray-900 py-12 px-6">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-3">
                            <span className="font-serif font-bold text-xl dark:text-white text-gray-900">DOXA PORTAL</span>
                        </div>
                        <div className='flex gap-6 text-sm font-medium text-gray-500'>
                            <a href="#" className="hover:text-church-green transition-colors">Instagram</a>
                            <a href="#" className="hover:text-church-green transition-colors">Facebook</a>
                            <a href="#" className="hover:text-church-green transition-colors">YouTube</a>
                        </div>
                    </div>
                    <div className="max-w-7xl mx-auto mt-8 pt-8 border-t border-gray-200 dark:border-gray-800 text-center md:text-left text-xs text-gray-400 uppercase tracking-widest">
                        &copy; {new Date().getFullYear()} Doxa Portal. All rights reserved.
                    </div>
                </div>
            </div>
        </ThemeProvider>
    );
};

export default LandingPage;
