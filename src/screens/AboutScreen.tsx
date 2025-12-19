import React from 'react';
import { Anchor, Users, Globe, Target, Heart, ShieldCheck, Sparkles } from 'lucide-react';
import { SectionHeader } from '../components/UIComponents';

const AboutScreen: React.FC = () => {
    return (
        <div className="max-w-6xl mx-auto space-y-20 pb-20 animate-fade-in-up">
            <SectionHeader
                title="Our Identity & Mission"
                subtitle="Doxa Portal is more than a platform; it's a digital extension of our sanctuary, built to keep our community connected to the Word."
            />

            {/* Vision & Mission Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="glass-card p-12 rounded-[3.5rem] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-church-green/5 blur-[50px] -mr-16 -mt-16 group-hover:bg-church-green/10 transition-colors"></div>
                    <div className="w-16 h-16 rounded-[1.5rem] bg-church-green/5 text-church-green flex items-center justify-center mb-8">
                        <Target size={32} />
                    </div>
                    <h3 className="text-3xl font-black dark:text-white mb-6 tracking-tighter italic">Our Mission</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-lg leading-relaxed font-medium">
                        To witness Jesus Christ to the community, making disciples and empowering believers for ministry through impactful worship and the undiluted Word of God.
                    </p>
                </div>

                <div className="glass-card p-12 rounded-[3.5rem] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-church-gold/5 blur-[50px] -mr-16 -mt-16 group-hover:bg-church-gold/10 transition-colors"></div>
                    <div className="w-16 h-16 rounded-[1.5rem] bg-church-gold/5 text-church-gold flex items-center justify-center mb-8">
                        <Globe size={32} />
                    </div>
                    <h3 className="text-3xl font-black dark:text-white mb-6 tracking-tighter italic">Our Vision</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-lg leading-relaxed font-medium">
                        To be a vibrant and welcoming community of believers, growing in faith, love, and service, and impacting generations with the message of hope.
                    </p>
                </div>
            </div>

            {/* Values Section */}
            <div className="space-y-12">
                <div className="text-center">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-church-green mb-4 block">Core Principles</span>
                    <h2 className="text-4xl md:text-5xl font-black dark:text-white tracking-tighter">What We Stand For</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {[
                        { icon: <ShieldCheck />, title: "Integrity", desc: "Living out the gospel with truth and transparency in all we do." },
                        { icon: <Heart />, title: "Fellowship", desc: "Building authentic relationships that nurture and sustain faith." },
                        { icon: <Sparkles />, title: "Excellence", desc: "Honoring God by giving our very best in every endeavor." },
                        { icon: <Users />, title: "Discipleship", desc: "Equipping every believer to grow and share their faith with others." }
                    ].map((value, i) => (
                        <div key={i} className="text-center p-8">
                            <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-white/5 text-church-green flex items-center justify-center mx-auto mb-6 shadow-sm group-hover:scale-110 transition-transform">
                                {value.icon}
                            </div>
                            <h4 className="text-lg font-black dark:text-white mb-2 tracking-tight">{value.title}</h4>
                            <p className="text-gray-500 text-sm font-medium leading-relaxed">{value.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Community Moment */}
            <div className="relative h-[500px] rounded-[4rem] overflow-hidden group shadow-premium">
                <img
                    src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=2000"
                    alt="Community"
                    className="w-full h-full object-cover grayscale opacity-50 transition-transform duration-[5s] group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent flex flex-col items-center justify-end p-16 text-center">
                    <Anchor size={48} className="text-white mb-6 opacity-40" />
                    <h3 className="text-white text-4xl md:text-6xl font-black tracking-tighter leading-none italic mb-4">"Built on the Rock."</h3>
                    <p className="text-white/60 font-black uppercase tracking-[0.4em] text-xs">Matthew 16:18</p>
                </div>
            </div>
        </div>
    );
};

export default AboutScreen;
