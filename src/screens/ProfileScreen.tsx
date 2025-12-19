import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Mail, Phone, Calendar, Building2, Edit2, Save, X, Camera, Loader2, Shield, Bell, Moon, Sun, ChevronRight, LogOut } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { sendPasswordResetEmail, signOut, updateProfile } from 'firebase/auth';
import { SectionHeader } from '../components/UIComponents';
import { useTheme } from '../components/ThemeContext';

const ProfileScreen: React.FC<{ user: UserProfile, refreshUser: () => void }> = ({ user, refreshUser }) => {
  const { theme, toggleTheme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user.displayName || '',
    phoneNumber: user.phoneNumber || '',
    hostelName: user.hostelName || '',
    dateOfBirth: user.dateOfBirth || '',
    publicProfile: user.publicProfile !== false // Default to true
  });

  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

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
        displayName: formData.displayName,
        photoURL: photoPreview || user.photoURL
      });

      refreshUser();
      setIsEditing(false);
      alert('Profile synchronized successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user.email) return;
    if (!confirm('Send a password reset email to ' + user.email + '?')) return;

    try {
      await sendPasswordResetEmail(auth, user.email);
      alert('Password reset email sent! Please check your inbox.');
    } catch (error: any) {
      alert('Error sending reset email: ' + error.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-fade-in pb-20">

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <SectionHeader
          title="Member Profile"
          subtitle="Manage your spiritual identity and personal preferences within the Doxa community."
        />

        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95 ${isEditing ? 'bg-red-500 text-white shadow-red-500/20' : 'bg-church-green text-white shadow-church-green/20'
            }`}
        >
          {isEditing ? <><X size={18} /> Cancel Edit</> : <><Edit2 size={18} /> Edit Profile</>}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

        {/* Left Column: Avatar & Card */}
        <div className="lg:col-span-1 space-y-8">
          <div className="glass-card rounded-[3rem] p-8 pb-12 shadow-premium border-white/40 text-center relative overflow-hidden group">
            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-br from-church-green to-emerald-900 opacity-80 group-hover:scale-105 transition-transform duration-1000"></div>

            <div className="relative z-10 pt-10 flex flex-col items-center">
              <div className="relative mb-6">
                <img
                  src={photoPreview || user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`}
                  alt={user.displayName}
                  className="w-40 h-40 rounded-[2.5rem] border-8 border-white dark:border-black shadow-2xl object-cover bg-white"
                />
                {isEditing && (
                  <label className="absolute -bottom-2 -right-2 bg-church-gold hover:bg-amber-600 text-white p-3 rounded-2xl cursor-pointer shadow-xl transition-all hover:scale-110 active:scale-90 border-4 border-white dark:border-black">
                    <Camera size={20} />
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                )}
              </div>

              <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter uppercase mb-1">{user.displayName}</h2>
              <p className="text-church-green font-black text-[10px] uppercase tracking-[0.3em] mb-4">{user.role}</p>

              <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/5 rounded-full text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <Shield size={12} className="text-church-gold" /> Member Since 2024
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-12 relative z-10 px-2">
              <div className="text-center">
                <p className="text-2xl font-black text-gray-900 dark:text-white">{user?.stats?.sermonsHeard || 0}</p>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Sermons</p>
              </div>
              <div className="text-center border-l border-gray-100 dark:border-white/5">
                <p className="text-2xl font-black text-gray-900 dark:text-white">{user?.stats?.quizPoints || 0}</p>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">XP Points</p>
              </div>
            </div>
          </div>

          {/* Quick Settings */}
          <div className="glass-card rounded-[2.5rem] p-4 shadow-premium border-white/40 space-y-1">

            <button
              onClick={() => setFormData(prev => ({ ...prev, publicProfile: !prev.publicProfile }))}
              className="w-full flex items-center justify-between p-5 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Shield size={18} />
                </div>
                <div className="text-left">
                  <span className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-300 block">Public Profile</span>
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">Allow others to see your stats</span>
                </div>
              </div>
              <div className={`w-10 h-5 rounded-full relative transition-all duration-500 ${formData.publicProfile ? 'bg-church-green' : 'bg-gray-300'}`}>
                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-500 ${formData.publicProfile ? 'translate-x-5' : ''}`}></div>
              </div>
            </button>

            <div className="h-px bg-gray-100 dark:bg-white/5 my-2"></div>

            <button
              onClick={() => signOut(auth)}
              className="w-full flex items-center gap-4 p-5 rounded-2xl hover:bg-red-500/10 text-red-500 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <LogOut size={18} />
              </div>
              <span className="text-xs font-black uppercase tracking-widest">Secure Logout</span>
            </button>
          </div>
        </div>

        {/* Right Column: Detailed Info Form */}
        <div className="lg:col-span-2">
          <div className="glass-card rounded-[3rem] p-10 md:p-14 shadow-premium border-white/40">
            <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter uppercase mb-10">Account Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className={`space-y-3 transition-all ${isEditing ? 'scale-100' : 'opacity-80'}`}>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative group">
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl px-6 py-4 font-bold text-gray-900 dark:text-white focus:ring-4 focus:ring-church-green/10 focus:border-church-green/50 transition-all disabled:opacity-50"
                  />
                </div>
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
                    value={formData.phoneNumber}
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
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl pl-14 pr-6 py-4 font-bold text-gray-900 dark:text-white focus:ring-4 focus:ring-church-green/10 transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              <div className={`col-span-full space-y-3 transition-all ${isEditing ? 'scale-100' : 'opacity-80'}`}>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Residence Location</label>
                <div className="relative">
                  <Building2 size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.hostelName}
                    onChange={(e) => setFormData({ ...formData, hostelName: e.target.value })}
                    placeholder="Hostel or Location"
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl pl-14 pr-6 py-4 font-bold text-gray-900 dark:text-white focus:ring-4 focus:ring-church-green/10 transition-all disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="mt-12 pt-8 border-t border-gray-100 dark:border-white/5">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-5 bg-church-green text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-church-green/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  {loading ? 'Processing Changes...' : 'Synchronize Profile'}
                </button>
              </div>
            )}
          </div>

          {/* Security Banner */}
          <div className="mt-8 p-8 bg-gradient-to-r from-church-gold/10 to-amber-500/10 rounded-[2.5rem] border border-church-gold/20 flex flex-col md:flex-row items-center gap-8 group">
            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-black/20 flex items-center justify-center text-church-gold shadow-lg group-hover:scale-110 transition-transform">
              <Shield size={28} />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h4 className="font-black text-gray-900 dark:text-white tracking-tight uppercase">Security Vault</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">Change your password and manage active sessions to keep your divine data secure.</p>
            </div>
            <button
              onClick={handlePasswordReset}
              className="px-6 py-3 bg-white dark:bg-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest border border-gray-200 dark:border-white/5 hover:bg-church-gold hover:text-white transition-all"
            >
              Reset Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileScreen;