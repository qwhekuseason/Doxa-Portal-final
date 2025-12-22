import React, { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  getDocs,
  where,
  limit,
  getDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { HfInference } from "@huggingface/inference";
import { db, storage } from '../firebase';
import { notifyTestimonyApproved, notifyNewSermon, notifyNewGalleryImage, notifyNewQuiz } from '../utils/notificationService';
import { UserProfile, Sermon, GalleryImage, Quiz, QuizQuestion, Testimony, AppNotification, SiteSettings, GivingStats } from '../types';
import { getGoogleDriveDirectLink } from '../utils/galleryUtils';
import { GalleryCard } from './GalleryCard';
import {
  Plus,
  Trash2,
  X,
  UploadCloud,
  ImageIcon,
  Save,
  Loader2,
  Wand2,
  Activity,
  Heart,
  BookOpen,
  Trophy,
  CheckCircle,
  MessageCircle,
  Bell,
  Video,
  Link,
  Eye,
  Phone,
  Building2,
  Calendar,
  ExternalLink,
  Settings
} from 'lucide-react';

// --- Reusable Admin Table ---
export const AdminTable: React.FC<{
  headers: string[];
  children: React.ReactNode;
}> = ({ headers, children }) => (
  <div className="overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-700 shadow-lg bg-white dark:bg-gray-800">
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
        <thead className="bg-gray-50/80 dark:bg-gray-900/50 backdrop-blur-sm text-xs uppercase font-bold text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-6 py-5 tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {children}
        </tbody>
      </table>
    </div>
  </div>
);

// --- Activity Feed ---
export const RecentActivityFeed: React.FC = () => {
  const [activities, setActivities] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        // We'll use notifications as a proxy for system activity for now
        const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(5));
        const snapshot = await getDocs(q);
        setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as AppNotification)));
      } catch (e) {
        console.error("Failed to fetch activity feed", e);
      } finally {
        setLoading(false);
      }
    };
    fetchActivities();
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm h-full">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2 font-serif">
        <Activity size={20} className="text-church-green" /> Recent Activity
      </h3>
      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="animate-spin text-gray-400" /></div>
        ) : activities.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No recent activity recorded.</p>
        ) : (
          activities.map((act) => (
            <div key={act.id} className="flex gap-4 relative group">
              <div className="absolute top-2 bottom-[-24px] left-[15px] w-px bg-gray-100 dark:bg-gray-700 -z-10 last:hidden group-last:hidden"></div>
              <div className={`w-8 h-8 rounded-full ${act.type === 'success' ? 'bg-green-500' : act.type === 'warning' ? 'bg-orange-500' : 'bg-church-green'} text-white flex items-center justify-center shrink-0 shadow-md ring-4 ring-white dark:ring-gray-800 z-10`}>
                <Bell size={14} />
              </div>
              <div className="pb-1">
                <p className="text-sm text-gray-900 dark:text-white font-medium line-clamp-2">
                  {act.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{new Date(act.createdAt).toLocaleDateString()} • {act.message}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// --- Testimony Manager ---
export const AdminTestimonyManager: React.FC = () => {
  const [testimonies, setTestimonies] = useState<Testimony[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTestimonies = async () => {
    setLoading(true);
    try {
      // Fetch ONLY pending testimonies for moderation
      const q = query(collection(db, 'testimonies'), where('approved', '==', false), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      setTestimonies(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Testimony)));
    } catch (e) {
      console.error("Error fetching testimonies:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTestimonies(); }, []);

  const handleApprove = async (id: string) => {
    try {
      const testimony = testimonies.find(t => t.id === id);
      await updateDoc(doc(db, 'testimonies', id), { approved: true });
      // Send notification
      if (testimony) {
        await notifyTestimonyApproved(testimony.authorName);
      }
      fetchTestimonies();
    } catch (e) { console.error(e); alert("Failed to approve."); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this testimony?")) return;
    try {
      await deleteDoc(doc(db, 'testimonies', id));
      fetchTestimonies();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <h3 className="text-xl font-bold dark:text-white font-serif">Pending Testimonies</h3>
      {loading ? <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div> :
        testimonies.length === 0 ? (
          <div className="p-10 text-center bg-gray-50 dark:bg-gray-800 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 text-gray-500">
            No pending testimonies to review.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {testimonies.map(t => (
              <div key={t.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col md:flex-row justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold dark:text-white">{t.authorName}</span>
                    <span className="text-xs text-gray-500">• {new Date(t.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 italic">"{t.content}"</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => handleApprove(t.id)} className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-xl font-bold text-sm hover:bg-green-200 transition-colors">
                    <CheckCircle size={16} /> Approve
                  </button>
                  <button onClick={() => handleDelete(t.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
};



// --- Sermon Manager ---
export const AdminSermonManager: React.FC = () => {
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Sermon> & { originalAudioLink: string, originalCoverLink: string, duration: string }>({
    title: '', preacher: '', series: '', description: '', originalAudioLink: '', originalCoverLink: '', duration: ''
  });

  const fetchSermons = async () => {
    const q = query(collection(db, 'sermons'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    setSermons(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Sermon)));
  };

  useEffect(() => { fetchSermons(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // transform links
      const audioUrl = getGoogleDriveDirectLink(formData.originalAudioLink);
      const coverUrl = getGoogleDriveDirectLink(formData.originalCoverLink) || 'https://source.unsplash.com/random/800x600?church';

      await addDoc(collection(db, 'sermons'), {
        title: formData.title,
        preacher: formData.preacher,
        series: formData.series,
        description: formData.description,
        audioUrl,
        downloadUrl: formData.originalAudioLink, // Save original for downloading
        coverUrl,
        duration: formData.duration || '45:00',
        date: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });
      // Send notification
      await notifyNewSermon(formData.title || 'New Sermon');
      setIsModalOpen(false);
      fetchSermons();
      setFormData({ title: '', preacher: '', series: '', description: '', originalAudioLink: '', originalCoverLink: '', duration: '' });
    } catch (error) {
      console.error(error);
      alert("Error saving sermon");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this sermon?")) return;
    await deleteDoc(doc(db, 'sermons', id));
    fetchSermons();
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold dark:text-white font-serif">Manage Sermons</h3>
        <button onClick={() => setIsModalOpen(true)} className="bg-church-green hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-church-green/30 hover:shadow-church-green/50 transition-all active:scale-95">
          <Plus size={18} /> Add Sermon
        </button>
      </div>

      <AdminTable headers={['Title', 'Preacher', 'Series', 'Date', 'Actions']}>
        {sermons.map(s => (
          <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
            <td className="px-6 py-4 font-bold text-gray-800 dark:text-gray-100">{s.title}</td>
            <td className="px-6 py-4">{s.preacher}</td>
            <td className="px-6 py-4"><span className="bg-church-muted text-church-green dark:bg-church-green/20 dark:text-church-gold text-xs px-2.5 py-1 rounded-full font-bold">{s.series}</span></td>
            <td className="px-6 py-4 text-xs font-mono text-gray-500">{new Date(s.date).toLocaleDateString()}</td>
            <td className="px-6 py-4">
              <button onClick={() => handleDelete(s.id)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors"><Trash2 size={16} /></button>
            </td>
          </tr>
        ))}
      </AdminTable>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-lg p-8 shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold dark:text-white font-serif">Add New Sermon</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"><X className="text-gray-500" /></button>
            </div>

            <div className="p-4 mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl">
              <p className="text-xs text-blue-700 dark:text-blue-300 font-medium flex items-start gap-2">
                <Video size={14} className="mt-0.5 shrink-0" />
                <span><strong>How to use Drive:</strong> Upload your file to Google Drive, right-click "Share", select "Anyone with the link", and paste that link below.</span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                placeholder="Title"
                className="w-full p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-church-green/50 transition-all"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  placeholder="Preacher"
                  className="w-full p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-church-green/50 transition-all"
                  value={formData.preacher}
                  onChange={e => setFormData({ ...formData, preacher: e.target.value })}
                  required
                />
                <input
                  placeholder="Series"
                  className="w-full p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-church-green/50 transition-all"
                  value={formData.series}
                  onChange={e => setFormData({ ...formData, series: e.target.value })}
                />
              </div>

              <input
                placeholder="Duration (e.g. 45:00)"
                className="w-full p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-church-green/50 transition-all font-mono"
                value={formData.duration}
                onChange={e => setFormData({ ...formData, duration: e.target.value })}
              />
              <textarea
                placeholder="Description"
                className="w-full p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 dark:text-white h-24 outline-none focus:ring-2 focus:ring-church-green/50 transition-all resize-none"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />

              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Audio Link (Google Drive)</label>
                  <div className="relative">
                    <Link size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                    <input
                      placeholder="https://drive.google.com/file/d/..."
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-church-green/50 font-mono text-sm"
                      value={formData.originalAudioLink}
                      onChange={e => setFormData({ ...formData, originalAudioLink: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Cover Image Link</label>
                  <div className="relative">
                    <ImageIcon size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                    <input
                      placeholder="https://drive.google.com/file/d/... or Direct URL"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-church-green/50 font-mono text-sm"
                      value={formData.originalCoverLink}
                      onChange={e => setFormData({ ...formData, originalCoverLink: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <button disabled={loading} className="w-full bg-church-green hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg mt-4 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed">
                {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                Save Sermon
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- User Manager ---
export const AdminUserManager: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const fetchUsers = async () => {
    const q = query(collection(db, 'users'));
    const snapshot = await getDocs(q);
    setUsers(snapshot.docs.map(doc => ({ ...(doc.data() as any) } as UserProfile)));
  };

  useEffect(() => { fetchUsers(); }, []);

  const toggleRole = async (uid: string, currentRole?: string) => {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    if (!confirm(`Change role to ${newRole}?`)) return;
    await updateDoc(doc(db, 'users', uid), { role: newRole });
    fetchUsers();
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <h3 className="text-xl font-bold dark:text-white font-serif">User Management</h3>
      <AdminTable headers={['User', 'Email', 'Role', 'Actions']}>
        {users.map(u => (
          <tr key={u.uid} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
            <td className="px-6 py-4 flex items-center gap-3">
              <img src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`} className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-700 shadow-sm" alt="" />
              <span className="font-bold text-gray-900 dark:text-white">{u.displayName}</span>
            </td>
            <td className="px-6 py-4 text-sm text-gray-500">{u.email}</td>
            <td className="px-6 py-4">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${u.role === 'admin' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                {u.role}
              </span>
            </td>
            <td className="px-6 py-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedUser(u)}
                  className="p-2 text-church-green hover:bg-church-green/10 rounded-lg transition-colors"
                  title="View Details"
                >
                  <Eye size={18} />
                </button>
                <button onClick={() => toggleRole(u.uid, u.role)} className="text-blue-600 hover:text-blue-700 text-xs font-bold hover:underline">
                  Switch Role
                </button>
              </div>
            </td>
          </tr>
        ))}
      </AdminTable>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-200">
            {/* Modal Header/Hero */}
            <div className="relative h-32 bg-gradient-to-r from-church-green to-emerald-900">
              <button
                onClick={() => setSelectedUser(null)}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-10"
              >
                <X size={20} />
              </button>
            </div>

            <div className="relative px-8 pb-10">
              {/* Avatar Overlap */}
              <div className="absolute -top-12 left-8">
                <img
                  src={selectedUser.photoURL || `https://ui-avatars.com/api/?name=${selectedUser.displayName}`}
                  className="w-24 h-24 rounded-3xl border-4 border-white dark:border-gray-900 shadow-xl object-cover"
                  alt=""
                />
              </div>

              <div className="pt-16">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">{selectedUser.displayName}</h2>
                    <p className="text-gray-500 font-medium">{selectedUser.email}</p>
                  </div>
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${selectedUser.role === 'admin' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-church-green/10 text-church-green border-church-green/20'}`}>
                    {selectedUser.role}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 dark:border-gray-800 pb-2">Biographical</h4>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                        <Phone size={16} className="text-church-green" />
                        <span className="text-sm font-bold">{selectedUser.phoneNumber || 'No phone added'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                        <Building2 size={16} className="text-church-gold" />
                        <span className="text-sm font-bold">{selectedUser.hostelName || 'No residence added'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                        <Calendar size={16} className="text-blue-500" />
                        <span className="text-sm font-bold">{selectedUser.dateOfBirth ? new Date(selectedUser.dateOfBirth).toLocaleDateString() : 'No birth date'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 dark:border-gray-800 pb-2">Spiritual Stats</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl">
                        <p className="text-lg font-black text-gray-900 dark:text-white">{selectedUser.stats?.sermonsHeard || 0}</p>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Sermons</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl">
                        <p className="text-lg font-black text-gray-900 dark:text-white">{selectedUser.stats?.quizzesTaken || 0}</p>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Quizzes</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl">
                        <p className="text-lg font-black text-gray-900 dark:text-white">{selectedUser.stats?.versesHighlighted || 0}</p>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Highlights</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl">
                        <p className="text-lg font-black text-gray-900 dark:text-white">{selectedUser.stats?.quizPoints || 0}</p>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">XP Points</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Gallery Manager ---
export const AdminGalleryManager: React.FC = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageLink, setImageLink] = useState('');
  const [caption, setCaption] = useState('');
  const [externalLink, setExternalLink] = useState('');

  const fetchImages = async () => {
    const q = query(collection(db, 'gallery'), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    setImages(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as GalleryImage)));
  };

  useEffect(() => { fetchImages(); }, []);

  const handleAddImage = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // If they gave an external link but no cover, use a high-quality default
      let finalImageUrl = imageLink;
      if (!finalImageUrl && externalLink) {
        finalImageUrl = 'https://images.unsplash.com/photo-1510133539744-11d206f9abe2?auto=format&fit=crop&q=80&w=1000';
      }

      // If they pasted a Pixieset link in the image box by mistake, move it
      let finalExternalUrl = externalLink;
      if (imageLink.includes('pixieset.com') || imageLink.includes('gallery.')) {
        finalExternalUrl = imageLink;
        if (!imageLink.match(/\.(jpeg|jpg|gif|png)$/) && !imageLink.includes('lh3.googleusercontent.com')) {
          finalImageUrl = 'https://images.unsplash.com/photo-1510133539744-11d206f9abe2?auto=format&fit=crop&q=80&w=1000';
        }
      }

      if (!finalImageUrl && !finalExternalUrl) {
        alert("Please provide either a cover image or an album link.");
        setLoading(false);
        return;
      }

      const directUrl = getGoogleDriveDirectLink(finalImageUrl || 'https://images.unsplash.com/photo-1510133539744-11d206f9abe2?auto=format&fit=crop&q=80&w=1000');

      await addDoc(collection(db, 'gallery'), {
        url: directUrl,
        caption: caption || 'New Album',
        externalLink: finalExternalUrl || null,
        date: new Date().toISOString()
      });

      await notifyNewGalleryImage(caption || 'New Album');
      fetchImages();
      setImageLink('');
      setCaption('');
      setExternalLink('');
      alert("Album added successfully!");
    } catch (e) {
      console.error(e);
      alert("Failed to add image");
    } finally {
      setLoading(false);
    }
  };

  const deleteImage = async (id: string) => {
    if (!confirm("Remove image?")) return;
    await deleteDoc(doc(db, 'gallery', id));
    fetchImages();
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Add Album Form */}
        <div className="md:col-span-1">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 sticky top-4">
            <h3 className="text-lg font-bold dark:text-white mb-4">Add Album</h3>

            <div className="p-3 mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl">
              <p className="text-xs text-blue-700 dark:text-blue-300 font-bold">
                Enter your Pixieset link and a cover photo.
              </p>
            </div>
            <form onSubmit={handleAddImage} className="space-y-4">

              <div className="space-y-1">
                <input
                  placeholder="Album Link (Pixieset/External)"
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-church-green"
                  value={externalLink}
                  onChange={e => setExternalLink(e.target.value)}
                  required
                />
                <p className="text-[9px] text-blue-500/60 ml-1 italic font-bold uppercase tracking-tighter">Required: The gallery link (e.g. doxamedia.pixieset.com)</p>
              </div>
              <div className="space-y-1">
                <input
                  placeholder="Cover Image URL (Optional)"
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-church-green text-xs"
                  value={imageLink}
                  onChange={e => setImageLink(e.target.value)}
                />
                <p className="text-[9px] text-gray-400 ml-1 italic font-bold uppercase tracking-tighter">If left blank, a default cover will be used.</p>
              </div>
              <div>
                <input
                  placeholder="Caption (Optional)"
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-church-green"
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                />
              </div>
              <button disabled={loading} className="w-full bg-church-green text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors flex justify-center">
                {loading ? <Loader2 className="animate-spin" /> : 'Add to Gallery'}
              </button>
            </form>
          </div>
        </div>

        {/* Grid */}
        <div className="md:col-span-2">
          <h3 className="text-xl font-bold dark:text-white font-serif mb-4">Gallery Grid</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((img, idx) => (
              <GalleryCard
                key={img.id}
                img={img}
                index={idx}
                isAdmin={true}
                onDelete={() => deleteImage(img.id)}
                onClick={() => { }}
              />
            ))}
            {images.length === 0 && (
              <div className="col-span-full py-12 text-center text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-300">
                No images yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div >
  );
};

// --- Quiz Manager ---
export const AdminQuizManager: React.FC = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<'manual' | 'ai'>('manual');
  const [generating, setGenerating] = useState(false);

  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [questions, setQuestions] = useState<QuizQuestion[]>([{ question: '', options: ['', '', '', ''], correctIndex: 0 }]);

  const fetchQuizzes = async () => {
    const q = query(collection(db, 'bible_quizzes'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    setQuizzes(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Quiz)));
  };

  useEffect(() => { fetchQuizzes(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this quiz?")) return;
    await deleteDoc(doc(db, 'bible_quizzes', id));
    fetchQuizzes();
  };

  const handleCreate = async () => {
    if (mode === 'ai') {
      setGenerating(true);
      try {
        const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
        const prompt = `Generate a Bible quiz about "${topic || 'General Bible'}" with difficulty "${difficulty}". 
Return EXACTLY 5 questions in a JSON array format. 
Each object MUST have:
- "question": string
- "options": array of 4 strings
- "correctIndex": integer (0 to 3)

Example format:
[
  {
    "question": "Who was the first man?",
    "options": ["Noah", "Adam", "Moses", "Abraham"],
    "correctIndex": 1
  }
]
Only return the JSON array, no other text.`;

        const response = await hf.chatCompletion({
          model: 'HuggingFaceH4/zephyr-7b-beta',
          messages: [
            { role: 'user', content: prompt }
          ],
          max_tokens: 1200,
        });

        const generatedText = response.choices[0].message.content || '';
        // Extract JSON if there is extra text
        const jsonMatch = generatedText.match(/\[\s*\{.*\}\s*\]/s);
        const jsonText = jsonMatch ? jsonMatch[0] : generatedText;

        const quizQuestions = JSON.parse(jsonText);

        if (Array.isArray(quizQuestions)) {
          const quizTopic = topic || `AI Generated: ${difficulty}`;
          await addDoc(collection(db, 'bible_quizzes'), {
            topic: quizTopic,
            difficulty,
            questions: quizQuestions,
            createdAt: new Date().toISOString()
          });
          // Send notification
          await notifyNewQuiz(quizTopic, difficulty);
          setIsModalOpen(false);
          fetchQuizzes();
          setTopic('');
        } else {
          alert("AI response structure was invalid.");
        }
      } catch (e) {
        console.error(e);
        alert("Failed to generate quiz with AI. Please try again or use manual mode.");
      } finally {
        setGenerating(false);
      }
    } else {
      await addDoc(collection(db, 'bible_quizzes'), { topic, difficulty, questions, createdAt: new Date().toISOString() });
      // Send notification
      await notifyNewQuiz(topic, difficulty);
      setIsModalOpen(false); fetchQuizzes(); setTopic(''); setQuestions([{ question: '', options: ['', '', '', ''], correctIndex: 0 }]);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold dark:text-white font-serif">Quiz Manager</h3>
        <button onClick={() => setIsModalOpen(true)} className="bg-church-gold hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-church-gold/30 hover:shadow-church-gold/50 transition-all active:scale-95">
          <Plus size={18} /> Create Quiz
        </button>
      </div>

      <AdminTable headers={['Topic', 'Difficulty', 'Questions', 'Date', 'Actions']}>
        {quizzes.map(q => (
          <tr key={q.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
            <td className="px-6 py-4 font-bold dark:text-white">{q.topic}</td>
            <td className="px-6 py-4"><span className={`uppercase text-xs font-bold px-2 py-1 rounded-full border ${q.difficulty === 'easy' ? 'bg-green-100 text-green-700 border-green-200' : q.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-red-100 text-red-700 border-red-200'}`}>{q.difficulty}</span></td>
            <td className="px-6 py-4 font-mono">{q.questions.length}</td>
            <td className="px-6 py-4 text-xs text-gray-500">{new Date(q.createdAt).toLocaleDateString()}</td>
            <td className="px-6 py-4">
              <button onClick={() => handleDelete(q.id)} className="text-gray-400 hover:text-red-500 p-2 rounded-lg transition-colors"><Trash2 size={16} /></button>
            </td>
          </tr>
        ))}
      </AdminTable>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-2xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold dark:text-white font-serif">Create New Quiz</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><X className="text-gray-500" /></button>
            </div>

            <div className="flex gap-4 mb-6 p-1 bg-gray-100 dark:bg-gray-700 rounded-xl">
              <button onClick={() => setMode('manual')} className={`flex-1 py-3 rounded-lg font-bold transition-all ${mode === 'manual' ? 'bg-white dark:bg-gray-600 shadow-md text-church-green dark:text-white' : 'text-gray-500'}`}>Manual</button>
              <button onClick={() => setMode('ai')} className={`flex-1 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${mode === 'ai' ? 'bg-white dark:bg-gray-600 shadow-md text-church-gold dark:text-white' : 'text-gray-500'}`}><Wand2 size={18} /> AI Generate</button>
            </div>
            <div className="space-y-4">
              <input placeholder="Quiz Topic" className="w-full p-4 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-church-gold" value={topic} onChange={e => setTopic(e.target.value)} />
              <select className="w-full p-4 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-church-gold" value={difficulty} onChange={e => setDifficulty(e.target.value as any)}>
                <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
              </select>
              {mode === 'ai' && (
                <div className="p-8 text-center bg-church-gold/10 dark:bg-church-gold/10 rounded-2xl border border-church-gold/20 dark:border-church-gold/20 border-dashed">
                  <Wand2 size={48} className="mx-auto text-church-gold mb-4 animate-bounce" />
                  <h4 className="font-bold text-gray-900 dark:text-white">AI Quiz Generator</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Generating questions for "{topic || 'Bible'}" ({difficulty}).</p>
                </div>
              )}

              <button onClick={handleCreate} disabled={generating} className="w-full bg-gradient-to-r from-church-green to-church-gold hover:from-emerald-700 hover:to-amber-500 text-white font-bold py-4 rounded-xl shadow-lg mt-6 flex items-center justify-center gap-2 transition-all active:scale-95">
                {generating ? <Loader2 className="animate-spin" /> : (mode === 'ai' ? 'Generate with AI' : 'Save Quiz')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Settings Manager ---
export const AdminSettingsManager: React.FC = () => {
  const [settings, setSettings] = useState<SiteSettings>({
    momoNumber: '', momoName: '', telecelNumber: '', telecelName: '', contactEmail: '',
    bankInfo: { bankName: '', accountName: '', accountNumber: '', branch: '' }
  });
  const [stats, setStats] = useState<GivingStats>({ weeklyGoal: 10000, currentProgress: 0, lastResetDate: new Date().toISOString() });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const settingsSnap = await getDoc(doc(db, 'site_settings', 'global'));
        if (settingsSnap.exists()) setSettings(settingsSnap.data() as SiteSettings);

        const statsSnap = await getDoc(doc(db, 'giving_stats', 'weekly'));
        if (statsSnap.exists()) setStats(statsSnap.data() as GivingStats);
      } catch (e) {
        console.error("Error fetching settings:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'site_settings', 'global'), { ...settings });
      alert("Site settings updated!");
    } catch (e) {
      // If doc doesn't exist, set it
      try {
        await addDoc(collection(db, 'site_settings'), { ...settings, id: 'global' }); // This is wrong for setDoc but good for addDoc. Better use setDoc.
      } catch (err) {
        console.error(err);
      }
    } finally {
      setSaving(false);
    }
  };

  // Refined save using setDoc for absolute control
  const saveGlobalSettings = async () => {
    setSaving(true);
    try {
      // Import setDoc for this
      const { setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'site_settings', 'global'), settings);
      await setDoc(doc(db, 'giving_stats', 'weekly'), stats);
      alert("All settings and stats synchronized!");
    } catch (e) {
      console.error(e);
      alert("Sync failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-church-green" size={40} /></div>;

  return (
    <div className="space-y-12 animate-fade-in pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

        {/* Payment & Contact Settings */}
        <div className="space-y-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-church-green/10 text-church-green flex items-center justify-center">
              <Settings size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black dark:text-white tracking-tighter uppercase">Site Constants</h3>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Global Payment & Contact Info</p>
            </div>
          </div>

          <div className="glass-card p-8 rounded-[2.5rem] space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">MTN MoMo Number</label>
                <input
                  value={settings.momoNumber}
                  onChange={e => setSettings({ ...settings, momoNumber: e.target.value })}
                  className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl focus:border-church-green outline-none font-bold"
                  placeholder="024 XXX XXXX"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">MTN Account Name</label>
                <input
                  value={settings.momoName}
                  onChange={e => setSettings({ ...settings, momoName: e.target.value })}
                  className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl focus:border-church-green outline-none font-bold"
                  placeholder="Doxa Portal"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Telecel Number</label>
                <input
                  value={settings.telecelNumber}
                  onChange={e => setSettings({ ...settings, telecelNumber: e.target.value })}
                  className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl focus:border-church-green outline-none font-bold"
                  placeholder="020 XXX XXXX"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Telecel Name</label>
                <input
                  value={settings.telecelName}
                  onChange={e => setSettings({ ...settings, telecelName: e.target.value })}
                  className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl focus:border-church-green outline-none font-bold"
                  placeholder="Doxa Portal"
                />
              </div>
            </div>

            <div className="h-px bg-gray-100 dark:bg-white/5 my-4"></div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-church-gold uppercase tracking-[0.2em] ml-2">Bank Details</h4>
              <input
                value={settings.bankInfo?.bankName}
                onChange={e => setSettings({ ...settings, bankInfo: { ...settings.bankInfo!, bankName: e.target.value } })}
                className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl focus:border-church-gold outline-none font-bold"
                placeholder="Bank Name (e.g. Ecobank)"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  value={settings.bankInfo?.accountNumber}
                  onChange={e => setSettings({ ...settings, bankInfo: { ...settings.bankInfo!, accountNumber: e.target.value } })}
                  className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl focus:border-church-gold outline-none font-bold font-mono"
                  placeholder="Account Number"
                />
                <input
                  value={settings.bankInfo?.branch}
                  onChange={e => setSettings({ ...settings, bankInfo: { ...settings.bankInfo!, branch: e.target.value } })}
                  className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl focus:border-church-gold outline-none font-bold"
                  placeholder="Branch"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Giving Stats Manager */}
        <div className="space-y-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-church-gold/10 text-church-gold flex items-center justify-center">
              <Heart size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black dark:text-white tracking-tighter uppercase">Generosity Stats</h3>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Real-time Goal Tracking</p>
            </div>
          </div>

          <div className="glass-card p-8 rounded-[2.5rem] space-y-8">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Weekly Goal (GH₵)</label>
              <div className="relative">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-church-gold">GH₵</span>
                <input
                  type="number"
                  value={stats.weeklyGoal}
                  onChange={e => setStats({ ...stats, weeklyGoal: Number(e.target.value) })}
                  className="w-full pl-16 pr-6 py-6 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-3xl focus:border-church-gold outline-none text-2xl font-black dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Current Progress (GH₵)</label>
              <div className="relative">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-church-green">GH₵</span>
                <input
                  type="number"
                  value={stats.currentProgress}
                  onChange={e => setStats({ ...stats, currentProgress: Number(e.target.value) })}
                  className="w-full pl-16 pr-6 py-6 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-3xl focus:border-church-green outline-none text-2xl font-black dark:text-white"
                />
              </div>
            </div>

            <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-3xl border border-dashed border-gray-200 dark:border-white/10">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Preview Bar</span>
                <span className="text-[10px] font-black text-church-green uppercase tracking-widest">{Math.round((stats.currentProgress / stats.weeklyGoal) * 100)}% Reached</span>
              </div>
              <div className="h-4 w-full bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-church-green transition-all duration-1000"
                  style={{ width: `${Math.min(100, (stats.currentProgress / stats.weeklyGoal) * 100)}%` }}
                ></div>
              </div>
            </div>

            <button
              onClick={() => setStats({ ...stats, currentProgress: 0, lastResetDate: new Date().toISOString() })}
              className="w-full py-4 text-[10px] font-black text-red-500 uppercase tracking-widest hover:bg-red-500/5 rounded-2xl transition-all"
            >
              Reset Weekly Progress
            </button>
          </div>
        </div>

      </div>

      <div className="flex justify-center pt-8">
        <button
          onClick={saveGlobalSettings}
          disabled={saving}
          className="px-12 py-5 bg-church-green hover:bg-emerald-700 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] shadow-premium flex items-center gap-4 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
          Synchronize Divine Data
        </button>
      </div>
    </div>
  );
};
