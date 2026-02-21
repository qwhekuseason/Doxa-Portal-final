
import React from 'react';
import { Watch, CloudLightning, Shield, Flame, BookOpen, Sun, Moon } from 'lucide-react';

export interface WatchData {
    period: string;
    timeRange: string;
    theme: string;
    scriptures: string[];
    prayerBullets: string[];
    iconName: 'Watch' | 'CloudLightning' | 'Shield' | 'Flame' | 'BookOpen' | 'Sun' | 'Moon';
    color: string;
}

export const WATCHES: WatchData[] = [
    {
        period: "First Watch",
        timeRange: "6:00 PM - 9:00 PM",
        theme: "Evening Prayer",
        scriptures: ["Matthew 16:18", "Genesis 24:63"],
        prayerBullets: [
            "Lord, lead my evening with peace and clarity.",
            "Let tonight be restful and free from worry.",
            "Thank you for bringing me safely to this evening."
        ],
        iconName: 'Moon',
        color: "from-emerald-950 to-black"
    },
    {
        period: "Second Watch",
        timeRange: "9:00 PM - 12:00 AM",
        theme: "Protection & Safety",
        scriptures: ["Psalm 91:1-16", "Exodus 11:4"],
        prayerBullets: [
            "Lord, protect me and my loved ones through the night.",
            "Keep evil far from my home and family.",
            "Let your peace fill every room while we sleep."
        ],
        iconName: 'Shield',
        color: "from-black to-emerald-950"
    },
    {
        period: "Third Watch",
        timeRange: "12:00 AM - 3:00 AM",
        theme: "Breaking Chains",
        scriptures: ["Acts 16:25", "Psalm 119:62"],
        prayerBullets: [
            "Lord, break every stronghold that holds me back.",
            "Lift every burden and heavy thing off my shoulders.",
            "Bring light into every difficult area of my life."
        ],
        iconName: 'CloudLightning',
        color: "from-black to-gray-900"
    },
    {
        period: "Fourth Watch",
        timeRange: "3:00 AM - 6:00 AM",
        theme: "Morning Prayer",
        scriptures: ["Psalm 5:3", "Job 38:12"],
        prayerBullets: [
            "Thank you Lord for a fresh new day.",
            "Let today bring healing, strength, and new opportunities.",
            "Clear my mind and fill me with purpose for this day."
        ],
        iconName: 'Sun',
        color: "from-emerald-900 to-church-green-dark"
    },
    {
        period: "Fifth Watch",
        timeRange: "6:00 AM - 9:00 AM",
        theme: "Strength for the Day",
        scriptures: ["Psalm 19:2", "Acts 2:15"],
        prayerBullets: [
            "Lord, give me the strength and focus I need today.",
            "Guide my decisions and keep me on the right path.",
            "Help me to be the best version of myself today."
        ],
        iconName: 'BookOpen',
        color: "from-church-green-dark to-church-green"
    },
    {
        period: "Sixth Watch",
        timeRange: "9:00 AM - 12:00 PM",
        theme: "Productivity & Success",
        scriptures: ["Acts 2:41", "Matthew 20:3"],
        prayerBullets: [
            "Let everything I put my hands to succeed today.",
            "Lord, bless my work and make it fruitful.",
            "Help me stay consistent, focused, and productive."
        ],
        iconName: 'Flame',
        color: "from-church-green to-church-gold-dark"
    },
    {
        period: "Seventh Watch",
        timeRange: "12:00 PM - 3:00 PM",
        theme: "Midday Prayer",
        scriptures: ["Acts 10:9", "Psalm 55:17"],
        prayerBullets: [
            "Lord, refresh my mind and spirit this afternoon.",
            "Give me wisdom and good ideas for the rest of the day.",
            "Keep me away from distractions and poor choices."
        ],
        iconName: 'Sun',
        color: "from-church-gold-dark to-church-gold"
    },
    {
        period: "Eighth Watch",
        timeRange: "3:00 PM - 6:00 PM",
        theme: "Transformation",
        scriptures: ["Acts 3:1", "Genesis 3:8"],
        prayerBullets: [
            "Lord, change the things in my life that need changing.",
            "Let this hour be one of growth, gratitude, and reflection.",
            "Strengthen me for the evening ahead."
        ],
        iconName: 'Watch',
        color: "from-church-gold to-church-green"
    }
];

export const getCurrentWatchIndex = (date: Date = new Date()): number => {
    const hour = date.getHours();
    if (hour >= 18 && hour < 21) return 0;
    if (hour >= 21) return 1;
    if (hour >= 0 && hour < 3) return 2;
    if (hour >= 3 && hour < 6) return 3;
    if (hour >= 6 && hour < 9) return 4;
    if (hour >= 9 && hour < 12) return 5;
    if (hour >= 12 && hour < 15) return 6;
    if (hour >= 15 && hour < 18) return 7;
    return 0;
};
