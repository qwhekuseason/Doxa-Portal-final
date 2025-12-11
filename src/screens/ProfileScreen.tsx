import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Mail, Phone, Calendar, Building2, Edit2, Save, X, Camera, Loader2 } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { auth, db } from '../firebase';

const ProfileScreen: React.FC<{ user: UserProfile, refreshUser: () => void }> = ({ user, refreshUser }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user.displayName || '',
    phoneNumber: user.phoneNumber || '',
    hostelName: user.hostelName || '',
    dateOfBirth: user.dateOfBirth || ''
  });

  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) return; // Silent fail for simplicity or add toast

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

        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
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
      const updates: any = {
        ...formData,
      };

      if (photoPreview) {
        updates.photoURL = photoPreview;
      }

      // Update Firestore
      await updateDoc(userRef, updates);

      // Update Auth Profile
      await updateProfile(auth.currentUser!, {
        displayName: formData.displayName,
        photoURL: photoPreview || user.photoURL
      });

      // Refresh App User State
      refreshUser();

      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl animate-fade-in-up space-y-8">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-church-green to-church-gold rounded-3xl p-8 text-white flex items-end gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="relative z-10">
          <img
            src={photoPreview || user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`}
            alt={user.displayName}
            className="w-32 h-32 rounded-3xl border-4 border-white shadow-xl object-cover bg-white"
          />
          {isEditing && (
            <label className="absolute bottom-2 right-0 bg-church-gold hover:bg-amber-600 text-white p-2 rounded-xl cursor-pointer shadow-lg transition-colors">
              <Camera size={20} />
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>
          )}
        </div>
        <div className="relative z-10 pb-2">
          <h1 className="text-3xl font-serif font-bold mb-2">{user.displayName}</h1>
          <p className="text-green-50 text-sm font-bold uppercase tracking-wide">{user.role}</p>
          <p className="text-green-50 text-sm mt-1">{user.email}</p>
        </div>
      </div>

      {/* Profile Info */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold font-serif dark:text-white">Personal Information</h2>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-2 px-5 py-2.5 bg-church-green hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors"
          >
            {isEditing ? (
              <>
                <X size={18} /> Cancel
              </>
            ) : (
              <>
                <Edit2 size={18} /> Edit Profile
              </>
            )}
          </button>
        </div>

        <div className="space-y-6">
          {/* Email */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
            <Mail className="text-church-green dark:text-church-green" size={24} />
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase">Email</p>
              <p className="text-gray-900 dark:text-white font-medium">{user.email}</p>
            </div>
          </div>

          {/* Display Name */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
            <div className="flex-1">
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Full Name</p>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 dark:text-white"
                />
              ) : (
                <p className="font-bold text-sm truncate dark:text-white">{user.displayName}</p>
              )}
            </div>
          </div>

          {/* Phone Number */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
            <Phone className="text-church-gold dark:text-church-gold" size={24} />
            <div className="flex-1">
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Phone</p>
              {isEditing ? (
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 dark:text-white"
                />
              ) : (
                <p className="text-gray-900 dark:text-white font-medium">{formData.phoneNumber || 'Not provided'}</p>
              )}
            </div>
          </div>

          {/* Date of Birth */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
            <Calendar className="text-emerald-600 dark:text-emerald-400" size={24} />
            <div className="flex-1">
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Date of Birth</p>
              {isEditing ? (
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 dark:text-white"
                />
              ) : (
                <p className="text-gray-900 dark:text-white font-medium">{formData.dateOfBirth || 'Not provided'}</p>
              )}
            </div>
          </div>

          {/* Hostel Name */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
            <Building2 className="text-church-green dark:text-church-green" size={24} />
            <div className="flex-1">
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Hostel/Location</p>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.hostelName}
                  onChange={(e) => setFormData({ ...formData, hostelName: e.target.value })}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 dark:text-white"
                />
              ) : (
                <p className="text-gray-900 dark:text-white font-medium">{formData.hostelName || 'Not provided'}</p>
              )}
            </div>
          </div>
        </div>

        {isEditing && (
          <button
            onClick={handleSave}
            className="mt-8 w-full flex items-center justify-center gap-2 py-3.5 bg-church-green hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors shadow-lg disabled:opacity-50"
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>

      {/* Account Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-2xl font-bold font-serif dark:text-white mb-6">Account Security</h2>
        <button className="w-full p-4 text-left bg-gray-50 dark:bg-gray-900 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-700">
          <p className="font-bold dark:text-white">Change Password</p>
          <p className="text-sm text-gray-500 mt-1">Update your password to keep your account secure</p>
        </button>
      </div>
    </div>
  );
};

export default ProfileScreen;