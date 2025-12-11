/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./App.tsx"
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                church: {
                    green: '#16A34A', // More vibrant green (Tailwind Green-600)
                    gold: '#EAB308', // More vibrant gold (Yellow-500)
                    muted: '#F0FDF4', // Very light green tint
                    surface: '#FAFAF9', // Warm stone/gray for backgrounds
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                serif: ['Merriweather', 'serif'],
            },
            animation: {
                'fade-in-up': 'fadeInUp 0.5s ease-out',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                }
            }
        },
    },
    plugins: [],
}
