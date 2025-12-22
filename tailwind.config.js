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
                    green: {
                        DEFAULT: '#16A34A',
                        dark: '#15803D',
                        light: '#DCFCE7',
                    },
                    gold: {
                        DEFAULT: '#EAB308',
                        dark: '#A16207',
                        light: '#FEF9C3',
                    },
                    muted: '#F8FAFC',
                    surface: '#FFFFFF',
                    accent: '#F59E0B',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                serif: ['Merriweather', 'Georgia', 'serif'],
                display: ['Outfit', 'Inter', 'sans-serif'],
            },
            boxShadow: {
                'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
                'glass-sm': '0 4px 16px 0 rgba(31, 38, 135, 0.05)',
                'premium': '0 20px 50px -12px rgba(0, 0, 0, 0.1)',
            },
            borderRadius: {
                '4xl': '2rem',
                '5xl': '2.5rem',
            },
            animation: {
                'fade-in-up': 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                'fade-in': 'fadeIn 0.5s ease-out',
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'shimmer': 'shimmer 2s linear infinite',
                'float': 'float 3s ease-in-out infinite',
            },
            keyframes: {
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                shake: {
                    '0%, 100%': { transform: 'translateX(0)' },
                    '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
                    '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
                },
                floatUp: {
                    '0%': { transform: 'translateY(0) translateX(-50%) scale(0.5)', opacity: '0' },
                    '10%': { opacity: '1', transform: 'translateY(-20px) translateX(-50%) scale(1.2)' },
                    '100%': { transform: 'translateY(-150px) translateX(-50%) scale(1)', opacity: '0' },
                }
            },
            animation: {
                'fade-in-up': 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                'fade-in': 'fadeIn 0.5s ease-out',
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'shimmer': 'shimmer 2s linear infinite',
                'float': 'float 3s ease-in-out infinite',
                'shake': 'shake 0.5s ease-in-out',
                'float-up': 'floatUp 2s ease-out forwards',
            },
        },
    },
    plugins: [],
}
