
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
  Calendar,
  Home,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  Camera,
  Upload
} from 'lucide-react';

interface AuthPageProps {
  initialMode?: 'login' | 'register';
  onBack?: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ initialMode = 'login', onBack }) => {
  const { theme, toggleTheme } = useTheme();
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-500">

      {/* Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-6 left-6 z-20 flex items-center gap-2 text-gray-500 hover:text-church-green font-bold transition-colors bg-white/80 dark:bg-black/50 p-3 rounded-full backdrop-blur-md shadow-sm"
        >
          <ChevronLeft size={20} /> Back
        </button>
      )}

      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0">
        {theme === 'dark' ? (
          <div className="absolute inset-0 bg-[#0f172a]">
            <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-church-green/20 rounded-full blur-[120px] animate-pulse-slow" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gray-50">
            <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-church-green/10 rounded-full blur-[100px] animate-pulse-slow" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-church-gold/10 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '1s' }} />
          </div>
        )}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
      </div>

      <button
        onClick={toggleTheme}
        className="fixed top-6 right-6 z-50 p-3 rounded-full bg-white/10 dark:bg-black/20 backdrop-blur-md border border-white/20 shadow-lg hover:scale-110 transition-transform text-gray-800 dark:text-white"
      >
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-2xl rounded-[2.5rem] overflow-hidden transition-all duration-500">

          <div className="p-8 md:p-10">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-church-green to-church-gold mb-2 font-serif tracking-tight drop-shadow-sm">
                Doxa Portal
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                {authMode === 'login' && "Welcome back to your spiritual home"}
                {authMode === 'register' && "Join our digital sanctuary"}
                {authMode === 'forgot' && "Recover your account access"}
              </p>
            </div>

            {/* Mode Switcher (only show for login/register) */}
            {authMode !== 'forgot' && (
              <div className="flex bg-gray-100/50 dark:bg-black/20 rounded-2xl p-1.5 mb-8 backdrop-blur-md border border-white/20 dark:border-white/5">
                <button
                  onClick={() => { setAuthMode('login'); setError(null); }}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${authMode === 'login'
                    ? 'bg-white dark:bg-gray-800 text-church-green dark:text-white shadow-md'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setAuthMode('register'); setError(null); }}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${authMode === 'register'
                    ? 'bg-white dark:bg-gray-800 text-church-gold dark:text-church-gold shadow-md'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                >
                  Register
                </button>
              </div>
            )}

            {authMode === 'forgot' && (
              <button
                onClick={() => { setAuthMode('login'); setError(null); setSuccessMsg(null); }}
                className="mb-6 flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors"
              >
                <ArrowLeft size={16} /> Back to Sign In
              </button>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {authMode === 'register' && (
                <div className="space-y-4 animate-fade-in-up">
                  <div className="flex flex-col items-center mb-6">
                    <div className="relative group cursor-pointer">
                      <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden">
                        {photoPreview ? (
                          <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <Camera className="text-gray-400" size={32} />
                        )}
                      </div>
                      <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 rounded-full transition-opacity cursor-pointer">
                        <Upload size={20} />
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Tap to upload photo</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative group col-span-2">
                      <User className="absolute left-3.5 top-3.5 text-gray-400 group-focus-within:text-church-green transition-colors" size={18} />
                      <input
                        type="text"
                        placeholder="Full Name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-gray-700/50 rounded-2xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-church-green/50 focus:border-church-green transition-all text-gray-900 dark:text-white placeholder-gray-400 font-medium"
                      />
                    </div>
                    <div className="relative group">
                      <Phone className="absolute left-3.5 top-3.5 text-gray-400 group-focus-within:text-church-green transition-colors" size={18} />
                      <input
                        type="tel"
                        placeholder="Phone"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-gray-700/50 rounded-2xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-church-green/50 focus:border-church-green transition-all text-gray-900 dark:text-white placeholder-gray-400 font-medium"
                      />
                    </div>
                    <div className="relative group">
                      <input
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="w-full bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-gray-700/50 rounded-2xl py-3 px-4 outline-none focus:ring-2 focus:ring-church-green/50 focus:border-church-green transition-all text-gray-900 dark:text-white placeholder-gray-400 font-medium text-sm"
                      />
                    </div>
                    <div className="relative group col-span-2">
                      <Home className="absolute left-3.5 top-3.5 text-gray-400 group-focus-within:text-church-green transition-colors" size={18} />
                      <input
                        type="text"
                        placeholder="Hostel Name"
                        value={hostelName}
                        onChange={(e) => setHostelName(e.target.value)}
                        className="w-full bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-gray-700/50 rounded-2xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-church-green/50 focus:border-church-green transition-all text-gray-900 dark:text-white placeholder-gray-400 font-medium"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="relative group">
                <Mail className="absolute left-3.5 top-3.5 text-gray-400 group-focus-within:text-church-green transition-colors" size={18} />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-gray-700/50 rounded-2xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-church-green/50 focus:border-church-green transition-all text-gray-900 dark:text-white placeholder-gray-400 font-medium"
                />
              </div>

              {authMode !== 'forgot' && (
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-3.5 text-gray-400 group-focus-within:text-church-green transition-colors" size={18} />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-gray-700/50 rounded-2xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-church-green/50 focus:border-church-green transition-all text-gray-900 dark:text-white placeholder-gray-400 font-medium"
                  />
                </div>
              )}

              {authMode === 'register' && (
                <div className="relative group animate-fade-in-up">
                  <Lock className="absolute left-3.5 top-3.5 text-gray-400 group-focus-within:text-church-green transition-colors" size={18} />
                  <input
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-gray-700/50 rounded-2xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-church-green/50 focus:border-church-green transition-all text-gray-900 dark:text-white placeholder-gray-400 font-medium"
                  />
                </div>
              )}

              {authMode === 'login' && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setAuthMode('forgot')}
                    className="text-xs font-bold text-church-green dark:text-church-gold hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              {error && (
                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-300 text-sm animate-pulse flex items-start gap-3">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-4 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 text-green-600 dark:text-green-300 text-sm animate-fade-in-up flex items-start gap-3">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                  <span className="font-medium">{successMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-church-green to-church-gold hover:from-emerald-700 hover:to-amber-500 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-church-green/25 hover:shadow-church-green/40 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 group"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    {authMode === 'login' && "Sign In"}
                    {authMode === 'register' && "Create Account"}
                    {authMode === 'forgot' && "Send Reset Link"}
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="px-10 pb-10 pt-2">
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white/50 dark:bg-black/40 backdrop-blur-sm text-gray-500 dark:text-gray-400 font-medium rounded-full">Or continue with</span>
              </div>
            </div>

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-700 dark:text-white font-bold py-3.5 rounded-2xl transition-all duration-200 flex items-center justify-center gap-3 group"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span>Google</span>
            </button>
          </div>
        </div>

        <p className="text-center mt-8 text-gray-500 dark:text-gray-400 text-xs font-medium">
          &copy; {new Date().getFullYear()} Doxa Portal. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
