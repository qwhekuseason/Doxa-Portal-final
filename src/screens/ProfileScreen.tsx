import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Mail, Phone, Calendar, Building2, Edit2, Save, X, Camera, Loader2, Shield, Bell, Moon, Sun, LogOut, Settings, Users, Star } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { sendPasswordResetEmail, signOut, updateProfile } from 'firebase/auth';
import { SectionHeader, StatusModal } from '../components/UIComponents';
import { useTheme } from '../components/ThemeContext';

const ProfileScreen: React.FC<{ user: UserProfile, refreshUser: () => void }> = ({ user, refreshUser }) => {
  const { theme, toggleTheme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user.displayName || '',
    phoneNumber: user.phoneNumber || '',
    hostelName: user.hostelName || '',
    dateOfBirth: user.dateOfBirth || '',
    themePreference: user.themePreference || 'light',
    notificationsEnabled: user.notificationsEnabled !== false,
    showStats: user.showStats !== false,
    showBirthdate: user.showBirthdate !== false,
    publicProfile: user.publicProfile !== false
  });

  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<{ open: boolean, type: 'success' | 'error' | 'info', title: string, message: string } | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
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

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setPhotoPreview(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const updates: any = { ...formData };

      if (photoPreview) {
        updates.photoURL = photoPreview;
      }

      await updateDoc(userRef, updates);

      await updateProfile(auth.currentUser!, {
        displayName: formData.displayName
      });

      refreshUser();
      setIsEditing(false);
      setStatus({
        open: true,
        type: 'success',
        title: 'Profile Updated',
        message: 'Your personal information has been successfully synchronized.'
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      setStatus({
        open: true,
        type: 'error',
        title: 'Update Failed',
        message: 'We could not save your changes. Please check your internet connection and try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user.email) return;

    try {
      await sendPasswordResetEmail(auth, user.email);
      setStatus({
        open: true,
        type: 'success',
        title: 'Reset link sent',
        message: `A password reset instructions have been sent to ${user.email}.`
      });
    } catch (error: any) {
      setStatus({
        open: true,
        type: 'error',
        title: 'Reset Failed',
        message: error.message
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-fade-in pb-24 px-4 md:px-0">

      {/* Header Tier */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <SectionHeader
          title="Your Profile"
          subtitle="Manage your account details and preferences."
        />

        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`w-full md:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all shadow-xl active:scale-95 ${isEditing ? 'bg-red-500 text-white shadow-red-500/20' : 'bg-church-green text-white shadow-church-green/20'
            }`}
        >
          {isEditing ? <><X size={18} /> Cancel Edit</> : <><Edit2 size={18} /> Edit Profile</>}
        </button>
      </div>

      {/* Main Split Tier: Avatar & Account Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
        {/* Left: Avatar & Stats */}
        <div className="lg:col-span-1 space-y-8">
          <div className="glass-card card-pop glass-glow rounded-[3rem] p-8 pb-12 border-white/40 text-center relative overflow-hidden group">
            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-br from-church-green to-emerald-900 opacity-80 group-hover:scale-105 transition-transform duration-1000"></div>

            <div className="relative z-10 pt-10 flex flex-col items-center">
              <div className="relative mb-6">
                <img
                  src={photoPreview || user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`}
                  alt={user.displayName}
                  className="w-40 h-40 rounded-[2.5rem] border-8 border-white dark:border-[#050505] shadow-2xl object-cover bg-white"
                />
                {isEditing && (
                  <label className="absolute -bottom-2 -right-2 bg-church-gold hover:bg-amber-600 text-white p-3 rounded-2xl cursor-pointer shadow-xl transition-all hover:scale-110 active:scale-90 border-4 border-white dark:border-[#050505]">
                    <Camera size={18} />
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                )}
              </div>

              <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter uppercase mb-1">{user.displayName}</h2>
              <p className="text-church-green font-black text-[10px] uppercase tracking-[0.3em] mb-4">{user.role}</p>

              <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/5 rounded-full text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest border border-gray-200/50 dark:border-white/5">
                <Shield size={12} className="text-church-gold" /> Member Since {
                  user.createdAt ? (
                    typeof user.createdAt === 'string'
                      ? new Date(user.createdAt).getFullYear()
                      : (user.createdAt as any).toDate ? (user.createdAt as any).toDate().getFullYear() : '2025'
                  ) : '2025'
                }
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-12 relative z-10">
              <div className="text-center p-4 rounded-3xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 card-pop">
                <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">{user?.stats?.sessionsViewed || 0}</p>
                <p className="text-[9px] font-black text-church-green uppercase tracking-[0.2em] mt-1">Sermons</p>
              </div>
              <div className="text-center p-4 rounded-3xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 card-pop">
                <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">{user?.stats?.quizPoints || 0}</p>
                <p className="text-[9px] font-black text-church-gold uppercase tracking-[0.2em] mt-1">XP Points</p>
              </div>
              <div className="text-center p-4 rounded-3xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 card-pop">
                <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">{user?.stats?.quizzesTaken || 0}</p>
                <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] mt-1">Quizzes</p>
              </div>
              <div className="text-center p-4 rounded-3xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 card-pop">
                <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">{user?.streak?.best || 0}</p>
                <p className="text-[9px] font-black text-orange-500 uppercase tracking-[0.2em] mt-1">Best Streak</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Account Details Form */}
        <div className="lg:col-span-2">
          <div className="glass-card card-pop glass-glow rounded-[3rem] p-8 md:p-12 border-white/40 h-full flex flex-col justify-between">
            <div className="space-y-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-church-green/10 text-church-green flex items-center justify-center">
                  <Users size={24} />
                </div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">Account Profile</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className={`space-y-3 transition-all ${isEditing ? 'scale-100' : 'opacity-80'}`}>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl px-6 py-4 font-bold text-gray-900 dark:text-white focus:ring-4 focus:ring-church-green/10 transition-all disabled:opacity-50"
                  />
                </div>

                <div className="space-y-3 opacity-60">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      disabled
                      value={user.email}
                      className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl pl-14 pr-6 py-4 font-bold text-gray-400 dark:text-gray-500"
                    />
                  </div>
                </div>

                <div className={`space-y-3 transition-all ${isEditing ? 'scale-100' : 'opacity-80'}`}>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      disabled={!isEditing}
                      value={formData.phoneNumber || ''}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      placeholder="Not provided"
                      className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl pl-14 pr-6 py-4 font-bold text-gray-900 dark:text-white focus:ring-4 focus:ring-church-green/10 transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className={`space-y-3 transition-all ${isEditing ? 'scale-100' : 'opacity-80'}`}>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Birth Date</label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      disabled={!isEditing}
                      value={formData.dateOfBirth || ''}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl pl-14 pr-6 py-4 font-bold text-gray-900 dark:text-white focus:ring-4 focus:ring-church-green/10 transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className={`col-span-full space-y-3 transition-all ${isEditing ? 'scale-100' : 'opacity-80'}`}>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Hostel / Location</label>
                  <div className="relative">
                    <Building2 size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={formData.hostelName || ''}
                      onChange={(e) => setFormData({ ...formData, hostelName: e.target.value })}
                      placeholder="Enter your current location"
                      className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl pl-14 pr-6 py-4 font-bold text-gray-900 dark:text-white focus:ring-4 focus:ring-church-green/10 transition-all disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="mt-12 pt-8 border-t border-gray-100 dark:border-white/5 flex gap-4">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 py-5 bg-church-green text-white rounded-[2rem] font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-church-green/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="glass-card card-pop glass-glow rounded-[4rem] p-10 md:p-16 border-white/40 space-y-12 shadow-2xl">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="w-20 h-20 rounded-[2rem] bg-church-gold/10 text-church-gold flex items-center justify-center mx-auto shadow-2xl shadow-church-gold/10">
            <Settings size={36} />
          </div>
          <h4 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">Preferences</h4>
          <p className="text-base text-gray-500 dark:text-gray-400 font-medium">Customise your app experience and manage your account settings.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
          {/* Theme Control */}
          <div className="glass-card p-10 rounded-[3rem] bg-gray-50/50 dark:bg-[#080808] border border-gray-100 dark:border-white/5 group hover:border-church-green/30 transition-all flex flex-col justify-between gap-10">
            <div className="space-y-6 text-center md:text-left">
              <div className="w-16 h-16 rounded-3xl bg-purple-500/10 text-purple-500 flex items-center justify-center mx-auto md:mx-0 group-hover:scale-110 transition-transform">
                {theme === 'dark' ? <Moon size={28} /> : <Sun size={28} />}
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 block mb-2">Interface</span>
                <h5 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</h5>
              </div>
            </div>
            <button
              onClick={() => {
                const newTheme = theme === 'light' ? 'dark' : 'light';
                toggleTheme();
                setFormData(prev => ({ ...prev, themePreference: newTheme }));
              }}
              className={`w-full py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all ${theme === 'dark' ? 'bg-church-green text-white shadow-xl shadow-church-green/20' : 'bg-gray-200 text-gray-600'}`}
            >
              Switch to {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
          </div>

          {/* Notifications */}
          <div className="glass-card p-10 rounded-[3rem] bg-gray-50/50 dark:bg-[#080808] border border-gray-100 dark:border-white/5 group hover:border-church-green/30 transition-all flex flex-col justify-between gap-10">
            <div className="space-y-6 text-center md:text-left">
              <div className="w-16 h-16 rounded-3xl bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto md:mx-0 group-hover:scale-110 transition-transform">
                <Bell size={28} />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 block mb-2">Alerts</span>
                <h5 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Notifications</h5>
              </div>
            </div>
            <button
              onClick={() => setFormData(prev => ({ ...prev, notificationsEnabled: !prev.notificationsEnabled }))}
              className={`w-full py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all ${formData.notificationsEnabled ? 'bg-church-green text-white shadow-xl shadow-church-green/20' : 'bg-gray-200 text-gray-600'}`}
            >
              {formData.notificationsEnabled ? 'Notifications On' : 'Notifications Off'}
            </button>
          </div>

          {/* Discoverability */}
          <div className="glass-card p-10 rounded-[3rem] bg-gray-50/50 dark:bg-[#080808] border border-gray-100 dark:border-white/5 group hover:border-church-green/30 transition-all flex flex-col justify-between gap-10">
            <div className="space-y-6 text-center md:text-left">
              <div className="w-16 h-16 rounded-3xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto md:mx-0 group-hover:scale-110 transition-transform">
                <Users size={28} />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 block mb-2">Visibility</span>
                <h5 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Public Profile</h5>
              </div>
            </div>
            <button
              onClick={() => setFormData(prev => ({ ...prev, publicProfile: !prev.publicProfile }))}
              className={`w-full py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all ${formData.publicProfile ? 'bg-church-green text-white shadow-xl shadow-church-green/20' : 'bg-gray-200 text-gray-600'}`}
            >
              {formData.publicProfile ? 'Visible to others' : 'Hidden'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-10 border-t border-gray-100 dark:border-white/5">
          <div className="flex items-center justify-between p-8 rounded-[2.5rem] bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 group hover:border-church-green/30 transition-all">
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-church-gold/10 text-church-gold flex items-center justify-center shadow-lg">
                <Star size={24} />
              </div>
              <div>
                <h6 className="font-black text-gray-900 dark:text-white uppercase tracking-tighter">My Stats</h6>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase mt-1">Show progress and streaks on profile</p>
              </div>
            </div>
            <button
              role="switch"
              aria-checked={formData.showStats}
              onClick={() => setFormData(prev => ({ ...prev, showStats: !prev.showStats }))}
              className={`w-14 h-8 rounded-full relative transition-all duration-300 shadow-inner flex-shrink-0 ${formData.showStats ? 'bg-church-green shadow-church-green/30' : 'bg-gray-200 dark:bg-white/10'}`}
            >
              <span className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${formData.showStats ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-8 rounded-[2.5rem] bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 group hover:border-church-green/30 transition-all">
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center shadow-lg">
                <Calendar size={24} />
              </div>
              <div>
                <h6 className="font-black text-gray-900 dark:text-white uppercase tracking-tighter">Show Birthday</h6>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase mt-1">Let others see and celebrate with you</p>
              </div>
            </div>
            <button
              role="switch"
              aria-checked={formData.showBirthdate}
              onClick={() => setFormData(prev => ({ ...prev, showBirthdate: !prev.showBirthdate }))}
              className={`w-14 h-8 rounded-full relative transition-all duration-300 shadow-inner flex-shrink-0 ${formData.showBirthdate ? 'bg-church-green shadow-church-green/30' : 'bg-gray-200 dark:bg-white/10'}`}
            >
              <span className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${formData.showBirthdate ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-6 bg-gray-900 dark:bg-white text-white dark:text-black rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-xs shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4"
          >
            {loading ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
            Save All Settings
          </button>
          <button
            onClick={() => signOut(auth)}
            className="px-10 py-6 bg-red-500/5 text-red-500 rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-xs border border-red-500/20 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-4 whitespace-nowrap active:scale-95"
          >
            <LogOut size={24} />
            Log Out
          </button>
        </div>
      </div>

      {/* Security Banner Tier */}
      <div className="p-10 md:p-16 bg-gradient-to-br from-[#0a0a0a] via-amber-900/10 to-church-green/5 rounded-[5rem] border border-white/5 flex flex-col lg:flex-row items-center gap-10 group shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-church-gold/5 blur-[100px] pointer-events-none"></div>
        <div className="w-24 h-24 rounded-[2.5rem] bg-white dark:bg-white/5 flex items-center justify-center text-church-gold shadow-2xl group-hover:rotate-12 transition-transform duration-700">
          <Shield size={40} />
        </div>
        <div className="flex-1 text-center lg:text-left space-y-3">
          <h4 className="font-black text-3xl text-gray-900 dark:text-white tracking-tighter uppercase mb-2">Account Security</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium max-w-2xl">Your data is private and encrypted. Reset your password anytime below.</p>
        </div>
        <button
          onClick={handlePasswordReset}
          className="w-full lg:w-auto px-12 py-6 bg-church-gold hover:bg-amber-600 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-church-gold/20 transition-all hover:scale-105 active:scale-95"
        >
          Reset account Password
        </button>
      </div>

      {status && (
        <StatusModal
          isOpen={status.open}
          onClose={() => setStatus(null)}
          type={status.type}
          title={status.title}
          message={status.message}
          actionLabel="Understood"
        />
      )}
    </div>
  );
};

export default ProfileScreen;