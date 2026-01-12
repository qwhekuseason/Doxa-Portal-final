import React, { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirestoreQuery } from '../hooks';
import { UserProfile } from '../types';
import { Cake, Calendar, Users, Sparkles } from 'lucide-react';
import { SkeletonCard, SectionHeader } from '../components/UIComponents';

interface BirthdaysScreenProps {
    user: UserProfile;
}

// Define query outside to avoid re-creation
// Fetch all users for Publicity role (internal view, so ignores publicProfile preference)
const usersQuery = query(collection(db, 'users'));

const BirthdaysScreen: React.FC<BirthdaysScreenProps> = ({ user }) => {
    // Fetch all users with public profiles

    const { data: users, loading, error } = useFirestoreQuery<UserProfile>(usersQuery);

    // Process birthdays data
    const birthdayData = useMemo(() => {
        if (!users) return { upcoming: [], byMonth: {} };

        const today = new Date();
        const currentMonth = today.getMonth();
        const currentDay = today.getDate();

        // Filter users with birthdays
        const usersWithBirthdays = users.filter(u => u.dateOfBirth);

        // Calculate upcoming birthdays (next 30 days)
        const upcoming = usersWithBirthdays
            .map(u => {
                const birthDate = new Date(u.dateOfBirth!);
                const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());

                // If birthday already passed this year, use next year
                if (thisYearBirthday < today) {
                    thisYearBirthday.setFullYear(today.getFullYear() + 1);
                }

                const daysUntil = Math.ceil((thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                return {
                    ...u,
                    birthDate,
                    daysUntil,
                    isToday: daysUntil === 0,
                    isTomorrow: daysUntil === 1,
                    isThisWeek: daysUntil <= 7
                };
            })
            .filter(u => u.daysUntil <= 30)
            .sort((a, b) => a.daysUntil - b.daysUntil);

        // Group by month
        const byMonth: Record<number, typeof usersWithBirthdays> = {};
        usersWithBirthdays.forEach(u => {
            const month = new Date(u.dateOfBirth!).getMonth();
            if (!byMonth[month]) byMonth[month] = [];
            byMonth[month].push(u);
        });

        // Sort each month by day
        Object.keys(byMonth).forEach(month => {
            byMonth[Number(month)].sort((a, b) => {
                const dayA = new Date(a.dateOfBirth!).getDate();
                const dayB = new Date(b.dateOfBirth!).getDate();
                return dayA - dayB;
            });
        });

        return { upcoming, byMonth };
    }, [users]);

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const formatBirthday = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    };

    const calculateAge = (dateStr: string) => {
        const birthDate = new Date(dateStr);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <SectionHeader title="Member Birthdays" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
                    <Cake className="text-red-600 dark:text-red-400" size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Error Loading Birthdays</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{(error as any)?.message || 'An unknown error occurred'}</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <SectionHeader
                    title="Member Birthdays"
                    subtitle="Celebrate with our church family"
                />
                <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-church-green/10 dark:bg-church-green/20 rounded-2xl border border-church-green/20">
                    <Users size={16} className="text-church-green" />
                    <span className="text-xs font-bold text-church-green">
                        {users?.filter(u => u.dateOfBirth).length || 0} Members
                    </span>
                </div>
            </div>

            {/* Upcoming Birthdays */}
            {birthdayData.upcoming.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Sparkles size={20} className="text-church-gold" />
                        <h2 className="text-xl font-black uppercase tracking-tight dark:text-white">
                            Upcoming Celebrations
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {birthdayData.upcoming.map((member) => (
                            <div
                                key={member.uid}
                                className={`glass-card p-6 rounded-3xl border-2 transition-all hover:scale-105 ${member.isToday
                                    ? 'border-church-gold bg-gradient-to-br from-church-gold/20 to-church-gold/5 shadow-xl shadow-church-gold/20'
                                    : member.isTomorrow
                                        ? 'border-church-green bg-gradient-to-br from-church-green/20 to-church-green/5'
                                        : 'border-gray-200 dark:border-white/10'
                                    }`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="relative">
                                        <img
                                            src={member.photoURL || `https://ui-avatars.com/api/?name=${member.displayName}`}
                                            alt={member.displayName}
                                            className="w-16 h-16 rounded-2xl object-cover border-2 border-white dark:border-gray-800 shadow-lg"
                                        />
                                        {member.isToday && (
                                            <div className="absolute -top-2 -right-2 w-8 h-8 bg-church-gold rounded-full flex items-center justify-center animate-bounce shadow-lg">
                                                <Cake size={16} className="text-white" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-black text-sm dark:text-white truncate uppercase tracking-tight">
                                            {member.displayName}
                                        </h3>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 font-bold mt-1">
                                            {formatBirthday(member.dateOfBirth!)}
                                        </p>

                                        {member.isToday ? (
                                            <div className="mt-2 px-3 py-1 bg-church-gold text-white rounded-full text-[10px] font-black uppercase tracking-wider inline-block">
                                                🎉 Today!
                                            </div>
                                        ) : member.isTomorrow ? (
                                            <div className="mt-2 px-3 py-1 bg-church-green text-white rounded-full text-[10px] font-black uppercase tracking-wider inline-block">
                                                Tomorrow
                                            </div>
                                        ) : member.isThisWeek ? (
                                            <div className="mt-2 px-3 py-1 bg-blue-500 text-white rounded-full text-[10px] font-black uppercase tracking-wider inline-block">
                                                In {member.daysUntil} days
                                            </div>
                                        ) : (
                                            <div className="mt-2 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                In {member.daysUntil} days
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* All Birthdays by Month */}
            <div className="space-y-6">
                <div className="flex items-center gap-2">
                    <Calendar size={20} className="text-church-green" />
                    <h2 className="text-xl font-black uppercase tracking-tight dark:text-white">
                        All Birthdays
                    </h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {Object.entries(birthdayData.byMonth)
                        .sort(([a], [b]) => Number(a) - Number(b))
                        .map(([month, members]) => (
                            <div
                                key={month}
                                className="glass-card p-6 rounded-3xl border border-gray-200 dark:border-white/10"
                            >
                                <h3 className="text-lg font-black uppercase tracking-tight text-church-green mb-4 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-church-green rounded-full"></div>
                                    {monthNames[Number(month)]}
                                    <span className="ml-auto text-xs text-gray-500 dark:text-gray-400 font-bold">
                                        {members.length} {members.length === 1 ? 'birthday' : 'birthdays'}
                                    </span>
                                </h3>

                                <div className="space-y-3">
                                    {members.map((member) => (
                                        <div
                                            key={member.uid}
                                            className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                        >
                                            <img
                                                src={member.photoURL || `https://ui-avatars.com/api/?name=${member.displayName}`}
                                                alt={member.displayName}
                                                className="w-10 h-10 rounded-xl object-cover border border-gray-200 dark:border-white/10"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-xs dark:text-white truncate uppercase tracking-tight">
                                                    {member.displayName}
                                                </p>
                                                <p className="text-[10px] text-gray-600 dark:text-gray-400 font-bold mt-0.5">
                                                    {formatBirthday(member.dateOfBirth!)}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] font-black text-church-green uppercase tracking-wider">
                                                    {new Date(member.dateOfBirth!).getDate()}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                </div>

                {Object.keys(birthdayData.byMonth).length === 0 && (
                    <div className="text-center py-12 glass-card rounded-3xl">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-white/5 mb-4">
                            <Cake className="text-gray-400" size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Birthdays Yet</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            No members have added their birthdays to their profiles yet.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BirthdaysScreen;
