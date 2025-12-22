

import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useTheme } from './ThemeContext';
import {
  Sun,
  Moon,
  Mail,
  Lock,
  User,
  ArrowRight,
  Loader2,
  Phone,
  Home,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  Camera,
  Upload,
  Shield
} from 'lucide-react';

interface AuthPageProps {
  initialMode?: 'login' | 'register';
  onBack?: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ initialMode = 'login', onBack }) => {
  const { theme, toggleTheme } = useTheme();
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [hostelName, setHostelName] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Image Helper
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size should be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Compress to JPEG with 0.7 quality to keep size low for Firestore
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setPhotoPreview(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Please enter a valid email address.";

    if (authMode === 'forgot') return null;

    if (password.length < 6) return "Password must be at least 6 characters long.";

    if (authMode === 'register') {
      if (password !== confirmPassword) return "Passwords do not match.";
      if (!displayName.trim()) return "Full Name is required.";
      if (!phoneNumber.trim()) return "Phone Number is required.";
      if (!dateOfBirth) return "Date of Birth is required.";
      if (!hostelName.trim()) return "Hostel Name is required.";
    }

    return null;
  };

  const getFriendlyErrorMessage = (err: any) => {
    console.error("Auth Error:", err);
    if (err.code === 'auth/unauthorized-domain') return `Domain Authorization Error: Add "${window.location.hostname}" to Firebase Console > Authentication > Settings > Authorized Domains.`;
    if (err.code === 'permission-denied') return "Database Permission Error: Unable to save user profile.";
    if (err.code === 'auth/user-not-found') return "No user found with this email.";
    if (err.code === 'auth/wrong-password') return "Incorrect password.";
    if (err.code === 'auth/email-already-in-use') return "Email already in use.";
    if (err.code === 'auth/weak-password') return "Password should be at least 6 characters.";
    if (err.code === 'auth/invalid-email') return "Invalid email format.";
    if (err.code === 'auth/popup-closed-by-user') return "Sign-in popup was closed.";
    if (err.code === 'auth/network-request-failed') return "Network error. Please check your connection.";
    if (err.code === 'auth/too-many-requests') return "Too many requests. Please try again later.";
    return err.message || "An unexpected error occurred.";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else if (authMode === 'register') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const assignedRole = email === 'admin@gmail.com' ? 'admin' : 'member';

        if (user) {
          await updateProfile(user, { displayName });
          try {
            await setDoc(doc(db, "users", user.uid), {
              uid: user.uid,
              displayName,
              email,
              phoneNumber,
              dateOfBirth,
              hostelName,
              role: assignedRole,
              createdAt: new Date().toISOString(),

              photoURL: photoPreview || user.photoURL || null
            });
          } catch (dbError: any) {
            console.error("Firestore Error:", dbError);
            if (dbError.code === 'permission-denied') throw dbError;
          }
        }
      } else if (authMode === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        setSuccessMsg("Password reset email sent! Please check your inbox.");
        setLoading(false);
        return; // Don't redirect or change state immediately so user sees message
      }
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      try {
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          role: user.email === 'admin@gmail.com' ? 'admin' : 'member',
          photoURL: user.photoURL,
          lastLogin: new Date().toISOString()
        }, { merge: true });
      } catch (dbError: any) {
        console.error("Firestore Error on Google Sign In:", dbError);
      }
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#050505] flex items-center justify-center p-4 relative transition-colors duration-500">

      {/* Back Button - Clean & Solid */}
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-6 left-6 z-20 flex items-center gap-2 text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white font-bold transition-colors bg-white dark:bg-gray-800 p-2.5 px-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <ChevronLeft size={18} /> Back
        </button>
      )}

      {/* Refined Background Decor */}
      <div className="fixed inset-0 z-0 bg-[#f8fafc] dark:bg-[#020617] transition-colors duration-700">
        <div className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-church-green/5 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[30vw] h-[30vw] bg-church-gold/5 rounded-full blur-[100px]"></div>
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-[1100px] grid md:grid-cols-2 gap-0 overflow-hidden bg-white/70 dark:bg-gray-950/70 backdrop-blur-2xl rounded-[2.5rem] shadow-premium border border-white/40 dark:border-white/5 mx-4">

        {/* Left Side: Brand Imagery/Message */}
        <div className="hidden md:flex flex-col justify-between p-12 bg-gradient-to-br from-church-green to-emerald-900 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-12">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
                <img src="/logo.png" className="w-6 h-6" alt="Logo" />
              </div>
              <span className="font-black text-xl text-white tracking-tighter uppercase italic">Doxa Portal</span>
            </div>

            <h2 className="text-4xl lg:text-5xl font-black text-white leading-none tracking-tighter mb-6">
              Join the <span className="text-church-gold">Sanctuary.</span>
            </h2>
            <p className="text-white/70 text-lg font-medium leading-relaxed max-w-sm">
              Access deep biblical insights, real-time fellowship, and a community of faith that grows together.
            </p>
          </div>

          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-4 p-4 rounded-3xl bg-white/10 backdrop-blur-md border border-white/10">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white"><Shield size={24} /></div>
              <div>
                <p className="text-xs font-black text-white uppercase tracking-widest leading-none mb-1">Secure & Private</p>
                <p className="text-[10px] text-white/50 font-bold">Your spiritual journey is protected.</p>
              </div>
            </div>
            <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.3em]">&copy; 2025 Doxa Digital Systems</p>
          </div>
        </div>

        {/* Right Side: Auth Forms */}
        <div className="p-8 md:p-14 relative flex flex-col">
          {/* Back & Theme Actions */}
          <div className="flex items-center justify-between mb-12">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-gray-500 hover:text-church-green transition-colors font-black text-[10px] uppercase tracking-widest"
              >
                <ArrowLeft size={16} /> Close Portal
              </button>
            )}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-400 hover:text-church-green transition-all"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          <div className="mb-10 text-center md:text-left">
            <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-none tracking-tighter mb-3 uppercase">
              {authMode === 'login' && "Welcome Back"}
              {authMode === 'register' && "Create Sanctuary"}
              {authMode === 'forgot' && "Reset Passage"}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">
              {authMode === 'login' && "Continue your spiritual growth."}
              {authMode === 'register' && "Begin your journey with the community."}
              {authMode === 'forgot' && "We'll send you a divine reset link."}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          {authMode !== 'forgot' && (
            <div className="flex gap-4 mb-8">
              <button
                onClick={() => { setAuthMode('login'); setError(null); }}
                className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 ${authMode === 'login'
                  ? 'border-church-green text-church-green'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setAuthMode('register'); setError(null); }}
                className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 ${authMode === 'register'
                  ? 'border-church-green text-church-green'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
              >
                Register
              </button>
            </div>
          )}

          {authMode === 'forgot' && (
            <button
              onClick={() => { setAuthMode('login'); setError(null); setSuccessMsg(null); }}
              className="mb-8 flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-church-green transition-colors"
            >
              <ArrowLeft size={16} /> Return to Log In
            </button>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 flex-1 overflow-y-auto pr-2 hide-scrollbar">
            {authMode === 'register' && (
              <div className="space-y-5 animate-fade-in">
                <div className="flex flex-col items-center mb-6">
                  <div className="relative group cursor-pointer w-20 h-20">
                    <div className="absolute inset-0 bg-church-green/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all"></div>
                    <div className="relative w-20 h-20 rounded-3xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center overflow-hidden transition-all group-hover:scale-105 active:scale-95">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="text-gray-400" size={24} />
                      )}
                    </div>
                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 rounded-3xl transition-opacity cursor-pointer">
                      <Upload size={16} />
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    </label>
                  </div>
                  <p className="text-[9px] text-church-gold font-black mt-3 uppercase tracking-widest">Identify Yourself</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative group col-span-2">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-church-green transition-colors" size={16} />
                    <input
                      type="text"
                      placeholder="Display Name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:border-church-green/50 focus:ring-4 focus:ring-church-green/5 outline-none transition-all text-gray-900 dark:text-white font-medium"
                    />
                  </div>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-church-green transition-colors" size={16} />
                    <input
                      type="tel"
                      placeholder="Phone"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:border-church-green/50 focus:ring-4 focus:ring-church-green/5 outline-none transition-all text-gray-900 dark:text-white font-medium"
                    />
                  </div>
                  <div className="relative group">
                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl py-3.5 px-4 text-sm focus:border-church-green/50 focus:ring-4 focus:ring-church-green/5 outline-none transition-all text-gray-900 dark:text-white font-medium"
                    />
                  </div>
                  <div className="relative group col-span-2">
                    <Home className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-church-green transition-colors" size={16} />
                    <input
                      type="text"
                      placeholder="Establishment / Hostel"
                      value={hostelName}
                      onChange={(e) => setHostelName(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:border-church-green/50 focus:ring-4 focus:ring-church-green/5 outline-none transition-all text-gray-900 dark:text-white font-medium"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-church-green transition-colors" size={16} />
              <input
                type="email"
                placeholder="Spiritual Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:border-church-green/50 focus:ring-4 focus:ring-church-green/5 outline-none transition-all text-gray-900 dark:text-white font-medium"
              />
            </div>

            {authMode !== 'forgot' && (
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-church-green transition-colors" size={16} />
                <input
                  type="password"
                  placeholder="Master Key"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:border-church-green/50 focus:ring-4 focus:ring-church-green/5 outline-none transition-all text-gray-900 dark:text-white font-medium"
                />
              </div>
            )}

            {authMode === 'register' && (
              <div className="relative group animate-fade-in">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-church-green transition-colors" size={16} />
                <input
                  type="password"
                  placeholder="Verify Key"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:border-church-green/50 focus:ring-4 focus:ring-church-green/5 outline-none transition-all text-gray-900 dark:text-white font-medium"
                />
              </div>
            )}

            {authMode === 'login' && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setAuthMode('forgot')}
                  className="text-[10px] font-black text-gray-400 hover:text-church-gold uppercase tracking-widest transition-colors"
                >
                  Lost your passage?
                </button>
              </div>
            )}

            {error && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-start gap-3 animate-shake">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span className="font-bold">{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-4 rounded-2xl bg-church-green/10 border border-church-green/20 text-church-green text-xs flex items-start gap-3 animate-fade-in">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                <span className="font-bold">{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-[54px] bg-church-green hover:bg-emerald-700 text-white rounded-2xl shadow-xl shadow-church-green/20 hover:scale-[1.02] active:scale-95 transition-all duration-300 flex items-center justify-center gap-3 overflow-hidden relative group"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <span className="font-black text-xs uppercase tracking-[0.3em] relative z-10">
                    {authMode === 'login' && "Access Portal"}
                    {authMode === 'register' && "Establish Sanctuary"}
                    {authMode === 'forgot' && "Send Reset Link"}
                  </span>
                  <ArrowRight size={18} className="relative z-10 group-hover:translate-x-1 transition-transform" />
                </>
              )}
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out"></div>
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-gray-100 dark:border-white/5">
            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100 dark:border-white/5"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-white dark:bg-gray-950 text-[10px] text-gray-400 font-black uppercase tracking-[0.3em]">Alternate Entry</span>
              </div>
            </div>

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full h-[54px] bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-white font-black rounded-2xl transition-all duration-300 flex items-center justify-center gap-4 text-xs uppercase tracking-widest border border-gray-200 dark:border-white/10"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google Authority
            </button>
          </div>
        </div>
      </div>

      <p className="absolute bottom-8 text-center text-gray-400 dark:text-gray-600 text-[10px] font-black uppercase tracking-[0.5em] animate-fade-in">
        Doxa Digital Systems &copy; {new Date().getFullYear()}
      </p>
    </div>
  );
};

export default AuthPage;
