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
import { HfInference } from "@huggingface/inference";
import { db, auth } from '../firebase';
import { notifyTestimonyApproved, notifyNewSermon, notifyNewGalleryImage, notifyNewQuiz, notifyNewStudyPlan } from '../utils/notificationService';
import { UserProfile, Sermon, GalleryImage, Quiz, QuizQuestion, Testimony, AppNotification, SiteSettings, GivingStats, StudyPlan } from '../types';
import { getGoogleDriveDirectLink } from '../utils/galleryUtils';
import { compressImage } from '../utils/base64Helper';
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
  CheckCircle2,
  MessageCircle,
  Bell,
  Video,
  Link,
  Eye,
  Phone,
  Building2,
  Calendar,
  ExternalLink,
  AlertTriangle,
  Settings
} from 'lucide-react';

import { initGoogleAuth, uploadFileToDrive } from '../utils/googleDriveService';

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
      // Fetch ONLY pending stories for moderation
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



// --- Content Manager ---
export const AdminSermonManager: React.FC = () => {
  const [contents, setContents] = useState<Sermon[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Sermon> & { originalAudioLink: string, originalCoverLink: string, duration: string }>({
    title: '', speaker: '', series: '', description: '', originalAudioLink: '', originalCoverLink: '', duration: ''
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState<'idle' | 'audio' | 'cover' | 'saving' | 'done'>('idle');
  const [showSuccess, setShowSuccess] = useState(false);

  const fetchContents = async () => {
    const q = query(collection(db, 'sermons'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    setContents(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Sermon)));
  };

  useEffect(() => {
    fetchContents();
    initGoogleAuth();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setUploadProgress(0);
    try {
      let finalAudioLink = formData.originalAudioLink;
      let finalCoverUrl = formData.originalCoverLink;

      if (audioFile) {
        setUploadStep('audio');
        const driveResult = await uploadFileToDrive(audioFile, (p) => setUploadProgress(p));
        finalAudioLink = driveResult.downloadLink;
      }

      if (coverFile) {
        setUploadStep('cover');
        setUploadProgress(0);
        const coverResult = await uploadFileToDrive(coverFile, (p) => setUploadProgress(p));
        finalCoverUrl = `https://lh3.googleusercontent.com/d/${coverResult.fileId}`;
      }

      if (!finalAudioLink && !audioFile) {
        throw new Error("Please select an audio file or provide a link.");
      }

      setUploadStep('saving');
      // transform links
      const audioUrl = getGoogleDriveDirectLink(finalAudioLink);
      const coverUrl = finalCoverUrl || 'https://images.unsplash.com/photo-1510133539744-11d206f9abe2?q=80&w=800';

      await addDoc(collection(db, 'sermons'), {
        title: formData.title,
        speaker: formData.speaker,
        series: formData.series,
        description: formData.description,
        audioUrl,
        downloadUrl: finalAudioLink, // Save original for downloading
        coverUrl,
        duration: formData.duration || '45:00',
        date: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });
      // Send notification
      await notifyNewSermon(formData.title || 'New Content');

      setUploadStep('done');
      setShowSuccess(true);
      setTimeout(() => {
        setIsModalOpen(false);
        setShowSuccess(false);
        fetchContents();
        setAudioFile(null);
        setCoverFile(null);
        setCoverPreview(null);
        setFormData({ title: '', speaker: '', series: '', description: '', originalAudioLink: '', originalCoverLink: '', duration: '' });
        setUploadStep('idle');
      }, 2000);
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Error saving sermon");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this sermon?")) return;
    await deleteDoc(doc(db, 'sermons', id));
    fetchContents();
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold dark:text-white font-serif">Manage Content</h3>
        <button onClick={() => setIsModalOpen(true)} className="bg-church-green hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-church-green/30 hover:shadow-church-green/50 transition-all active:scale-95">
          <Plus size={18} /> Add Content
        </button>
      </div>

      <AdminTable headers={['Title', 'Speaker', 'Series', 'Date', 'Actions']}>
        {contents.map(s => (
          <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
            <td className="px-6 py-4 font-bold text-gray-800 dark:text-gray-100">{s.title}</td>
            <td className="px-6 py-4">{s.speaker}</td>
            <td className="px-6 py-4"><span className="bg-church-muted text-church-green dark:bg-church-green/20 dark:text-church-gold text-xs px-2.5 py-1 rounded-full font-bold">{s.series}</span></td>
            <td className="px-6 py-4 text-xs font-mono text-gray-500">{new Date(s.date).toLocaleDateString()}</td>
            <td className="px-6 py-4">
              <button onClick={() => handleDelete(s.id)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors"><Trash2 size={16} /></button>
            </td>
          </tr>
        ))}
      </AdminTable>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 md:p-8 pt-12 md:items-center md:pt-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 w-full max-w-lg max-h-[85vh] md:max-h-[90vh] rounded-[2.5rem] shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-8 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-2xl font-bold dark:text-white font-serif">Add New Content</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"><X className="text-gray-500" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 relative">
              {(loading || showSuccess) && (
                <div className="absolute inset-0 z-50 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
                  {showSuccess ? (
                    <div className="space-y-4 animate-in zoom-in duration-500">
                      <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto border-2 border-green-500">
                        <CheckCircle2 size={40} className="text-green-500 animate-bounce" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold dark:text-white font-serif">Upload Complete!</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your content is now live.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full max-w-xs space-y-6">
                      <div className="w-16 h-16 bg-church-green/10 rounded-2xl flex items-center justify-center mx-auto text-church-green animate-pulse">
                        {uploadStep === 'audio' ? <Activity size={32} /> : uploadStep === 'cover' ? <ImageIcon size={32} /> : <Save size={32} />}
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-end">
                          <div className="text-left">
                            <p className="text-[10px] font-bold text-church-green uppercase tracking-widest mb-1">
                              Step {uploadStep === 'audio' ? '1/3' : uploadStep === 'cover' ? '2/3' : '3/3'}
                            </p>
                            <h4 className="text-sm font-black dark:text-white uppercase tracking-tight">
                              {uploadStep === 'audio' ? 'Uploading Audio File' : uploadStep === 'cover' ? 'Uploading Cover' : 'Saving Details'}
                            </h4>
                          </div>
                          <span className="text-lg font-black dark:text-white tabular-nums">{uploadProgress}%</span>
                        </div>

                        <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-church-green transition-all duration-300 ease-out"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>

                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          Uploading to Google Drive...
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

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
                    placeholder="Speaker"
                    className="w-full p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-church-green/50 transition-all"
                    value={formData.speaker}
                    onChange={e => setFormData({ ...formData, speaker: e.target.value })}
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
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Audio Content (MP3/M4A)</label>
                    <div className="relative group/file">
                      {audioFile ? (
                        <div className="p-4 rounded-xl bg-church-green/5 border border-church-green/20 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-church-green/10 rounded-lg flex items-center justify-center text-church-green">
                              <Activity size={20} />
                            </div>
                            <div className="max-w-[200px]">
                              <p className="text-xs font-bold truncate dark:text-white uppercase">{audioFile.name}</p>
                              <p className="text-[10px] text-gray-400 font-mono">{(audioFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAudioFile(null)}
                            className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-all"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-dashed border-gray-200 dark:border-gray-700 hover:border-church-green/50 cursor-pointer transition-all">
                          <input type="file" accept="audio/*" className="hidden" onChange={e => e.target.files?.[0] && setAudioFile(e.target.files[0])} disabled={loading} />
                          <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center text-gray-400 border border-gray-100 dark:border-gray-700">
                            <UploadCloud size={20} />
                          </div>
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-tight">Select Audio File</span>
                        </label>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Or Paste Audio Link (Optional)</label>
                    <div className="relative">
                      <Link size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                      <input
                        placeholder="https://drive.google.com/file/d/..."
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-church-green/50 font-mono text-sm"
                        value={formData.originalAudioLink}
                        onChange={e => setFormData({ ...formData, originalAudioLink: e.target.value })}
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Cover Image (JPEG/PNG)</label>
                    <div className="relative group/cover">
                      {coverPreview ? (
                        <div className="relative rounded-xl overflow-hidden aspect-video border border-church-green/20">
                          <img src={coverPreview} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => { setCoverPreview(null); setCoverFile(null); }}
                            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg shadow-lg opacity-0 group-hover/cover:opacity-100 transition-opacity"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-dashed border-gray-200 dark:border-gray-700 hover:border-church-green/50 cursor-pointer transition-all gap-2">
                          <input type="file" accept="image/*" className="hidden" onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setCoverFile(file);
                              const reader = new FileReader();
                              reader.onload = (e) => setCoverPreview(e.target?.result as string);
                              reader.readAsDataURL(file);
                            }
                          }} disabled={loading} />
                          <ImageIcon size={24} className="text-gray-400" />
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-tight">Select Cover Image</span>
                        </label>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Or Paste Cover Link (Optional)</label>
                    <div className="relative">
                      <ImageIcon size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                      <input
                        placeholder="https://drive.google.com/file/d/... or Direct URL"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-church-green/50 font-mono text-sm"
                        value={formData.originalCoverLink}
                        onChange={e => setFormData({ ...formData, originalCoverLink: e.target.value })}
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>

                <button disabled={loading} className="w-full bg-church-green hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg mt-4 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed">
                  {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                  Save Content
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- User Manager ---
export const AdminUserManager: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, 'users'));
      const snapshot = await getDocs(q);
      setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...(doc.data() as any) } as UserProfile)));
    } catch (e: any) {
      console.error("Error fetching users:", e);
      setError(e.message || "Failed to fetch users. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const updateRole = async (targetUid: string, newRole: string) => {
    if (targetUid === auth.currentUser?.uid && newRole !== 'admin') {
      if (!confirm("Caution: You are changing your OWN role. If you proceed, you will lose admin privileges and will be logged out of this dashboard immediately. Continue?")) return;
    }

    setUpdatingUid(targetUid);
    try {
      const userRef = doc(db, 'users', targetUid);
      console.log(`Attempting to update user ${targetUid} to role ${newRole}`);

      await updateDoc(userRef, {
        role: newRole,
        updatedAt: new Date().toISOString()
      });

      alert(`Success! Account role updated to ${newRole.toUpperCase()}. The change has been committed to Firestore.`);
      await fetchUsers();
    } catch (e: any) {
      console.error("Critical Error updating role:", e);
      alert(`Update Failed!\n\nReason: ${e.message}\n\nPlease check if you are logged in with the correct Admin account.`);
    } finally {
      setUpdatingUid(null);
    }
  };

  const deleteUserRecord = async (uid: string, displayName: string) => {
    if (!confirm(`Are you sure you want to PERMANENTLY delete the account for ${displayName}? This action cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
      fetchUsers();
    } catch (e) { console.error(e); }
  };

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'publicity': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'prayer': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <h3 className="text-xl font-bold dark:text-white font-serif">User Management</h3>
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400">
          <AlertTriangle size={20} />
          <span className="font-bold text-sm">{error}</span>
          <button onClick={fetchUsers} className="ml-auto text-xs underline">Retry</button>
        </div>
      )}
      {loading ? (
        <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-church-green" size={40} /></div>
      ) : users.length === 0 ? (
        <div className="p-20 text-center bg-gray-50 dark:bg-gray-900 rounded-[2.5rem] border border-dashed border-gray-200 dark:border-gray-800">
          <p className="text-gray-400 font-bold">No active user sessions detected.</p>
        </div>
      ) : (
        <AdminTable headers={['User', 'Email', 'Role', 'Actions']}>
          {users.map(u => (
            <tr key={u.uid} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
              <td className="px-6 py-4 flex items-center gap-3">
                <img src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`} className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-700 shadow-sm" alt="" />
                <span className="font-bold text-gray-900 dark:text-white">{u.displayName}</span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">{u.email}</td>
              <td className="px-6 py-4">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${getRoleBadgeStyle(u.role)}`}>
                  {u.role}
                </span>
                {updatingUid === u.uid && <Loader2 size={12} className="inline animate-spin ml-2 text-church-green" />}
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
                  <select
                    value={u.role}
                    disabled={updatingUid === u.uid}
                    onChange={(e) => updateRole(u.uid, e.target.value)}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-lg p-2 outline-none focus:ring-2 focus:ring-church-green cursor-pointer mr-2 disabled:opacity-50"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="publicity">Publicity</option>
                    <option value="prayer">Prayer</option>
                  </select>
                  <button
                    onClick={() => deleteUserRecord(u.uid, u.displayName)}
                    disabled={updatingUid === u.uid}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                    title="Remove User Record"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </AdminTable>
      )}

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
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 dark:border-gray-800 pb-2">Platform Activity</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl">
                        <p className="text-lg font-black text-gray-900 dark:text-white">{selectedUser.stats?.sessionsViewed || 0}</p>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Sessions</p>
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
                <div className="mt-12 flex justify-end">
                  <button
                    onClick={() => deleteUserRecord(selectedUser.uid, selectedUser.displayName)}
                    className="flex items-center gap-2 px-6 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                  >
                    <Trash2 size={16} /> Remove User Record
                  </button>
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
  const [genQuestionCount, setGenQuestionCount] = useState(5);
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
        const response = await fetch('/api/generateQuiz', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topic: topic || 'General Bible Knowledge',
            difficulty,
            questionCount: genQuestionCount,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'AI generation failed.');
        }

        const data = await response.json();
        if (data.success && data.quiz) {
          const quizData = data.quiz;
          await addDoc(collection(db, 'bible_quizzes'), {
            topic: quizData.topic,
            difficulty: quizData.difficulty,
            questions: quizData.questions,
            createdAt: new Date().toISOString()
          });
          await notifyNewQuiz(quizData.topic, difficulty);
          setIsModalOpen(false);
          fetchQuizzes();
          setTopic('');
        }
      } catch (e) {
        console.error(e);
        alert("AI generation failed. Please check your topic and try again.");
      } finally {
        setGenerating(false);
      }
    } else {
      await addDoc(collection(db, 'bible_quizzes'), { topic, difficulty, questions, createdAt: new Date().toISOString() });
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
              <button onClick={() => setMode('manual')} className={`flex-1 py-3 rounded-lg font-bold transition-all ${mode === 'manual' ? 'bg-white dark:bg-gray-600 shadow-md text-church-green' : 'text-gray-500'}`}>Manual</button>
              <button onClick={() => setMode('ai')} className={`flex-1 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${mode === 'ai' ? 'bg-white dark:bg-gray-600 shadow-md text-church-gold' : 'text-gray-500'}`}><Wand2 size={18} /> AI Generate</button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Quiz Topic</label>
                <input placeholder="Ex: Miracles of Jesus, Book of Romans..." className="w-full p-4 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-church-gold dark:text-white" value={topic} onChange={e => setTopic(e.target.value)} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Difficulty</label>
                  <select className="w-full p-4 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-church-gold dark:text-white" value={difficulty} onChange={e => setDifficulty(e.target.value as any)}>
                    <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                  </select>
                </div>
                {mode === 'ai' && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Count</label>
                      <span className="text-xs font-black text-church-green">{genQuestionCount} Questions</span>
                    </div>
                    <input
                      type="range" min="1" max="10"
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-church-green mt-4"
                      value={genQuestionCount}
                      onChange={(e) => setGenQuestionCount(parseInt(e.target.value))}
                    />
                  </div>
                )}
              </div>

              {mode === 'ai' && (
                <div className="p-8 text-center bg-church-gold/5 dark:bg-church-gold/10 rounded-2xl border border-church-gold/20 border-dashed">
                  <Wand2 size={48} className={`mx-auto text-church-gold mb-4 ${generating ? 'animate-spin' : 'animate-bounce'}`} />
                  <h4 className="font-bold text-gray-900 dark:text-white">AI Prophet Generator</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">I will curate some celestial questions about "{topic || 'The Holy Word'}" for you.</p>
                </div>
              )}

              {mode === 'manual' && (
                <div className="p-4 text-center text-xs text-gray-400 font-bold uppercase tracking-widest">
                  Manual entry coming soon or use the AI for instant creation!
                </div>
              )}

              <button onClick={handleCreate} disabled={generating || (mode === 'manual' && questions[0].question === '')} className="w-full bg-gradient-to-r from-church-green to-church-gold hover:from-emerald-700 hover:to-amber-500 text-white font-bold py-4 rounded-xl shadow-lg mt-6 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                {generating ? <Loader2 className="animate-spin" /> : (mode === 'ai' ? 'Invoke AI Generator' : 'Save Manual Quiz')}
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const settingsSnap = await getDoc(doc(db, 'site_settings', 'global'));
        if (settingsSnap.exists()) setSettings(settingsSnap.data() as SiteSettings);
      } catch (e) {
        console.error("Error fetching settings:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Save settings using setDoc for absolute control
  const saveGlobalSettings = async () => {
    setSaving(true);
    try {
      // Import setDoc for this
      const { setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'site_settings', 'global'), settings);
      alert("Settings synchronized successfully!");
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
      <div className="max-w-4xl mx-auto">

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
              <input
                value={settings.bankInfo?.accountName}
                onChange={e => setSettings({ ...settings, bankInfo: { ...settings.bankInfo!, accountName: e.target.value } })}
                className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl focus:border-church-gold outline-none font-bold"
                placeholder="Account Name (e.g. Doxa Church Ghana)"
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

// --- Study Plan Manager ---
export const AdminStudyPlanManager: React.FC = () => {
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState<Partial<StudyPlan>>({
    title: '',
    description: '',
    coverUrl: '',
    duration: 7,
    category: 'weekly',
    days: []
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const base64 = await compressImage(file);
      setFormData(prev => ({ ...prev, coverUrl: base64 }));
    } catch (err) {
      console.error("Image processing failed", err);
      alert("Image processing failed.");
    } finally {
      setUploading(false);
    }
  };

  const fetchPlans = async () => {
    const q = query(collection(db, 'study_plans'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    setPlans(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as StudyPlan)));
  };

  useEffect(() => { fetchPlans(); }, []);

  const handleAddDay = () => {
    const newDay = {
      dayNumber: (formData.days?.length || 0) + 1,
      title: '',
      passage: '',
      content: ''
    };
    setFormData({ ...formData, days: [...(formData.days || []), newDay] });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'study_plans'), {
        ...formData,
        duration: formData.days?.length || 0,
        createdAt: new Date().toISOString()
      });
      await notifyNewStudyPlan(formData.title || 'New Plan', formData.category || 'General');
      setIsModalOpen(false);
      fetchPlans();
      setFormData({ title: '', description: '', coverUrl: '', duration: 7, category: 'weekly', days: [] });
    } catch (e) {
      console.error(e);
      alert("Error saving study plan");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this plan?")) return;
    await deleteDoc(doc(db, 'study_plans', id));
    fetchPlans();
  };

  if (isModalOpen) {
    return (
      <div className="animate-fade-in-up space-y-8 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-gray-100 dark:border-white/5 pb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 bg-church-green/10 text-church-green text-[9px] font-black uppercase tracking-widest rounded-lg border border-church-green/20">Divine Growth</span>
            </div>
            <h3 className="text-3xl sm:text-4xl font-black dark:text-white tracking-tighter uppercase leading-none">New Study Plan</h3>
          </div>
          <button
            onClick={() => setIsModalOpen(false)}
            className="flex items-center justify-center gap-3 px-6 py-3 bg-gray-100 dark:bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-red-500 transition-all active:scale-95"
          >
            <X size={18} /> Discard & Return
          </button>
        </div>

        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-1 space-y-8">
            <div className="glass-card rounded-[2.5rem] p-8 shadow-premium border-white/40 space-y-6">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-4">General Metadata</p>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Plan Title</label>
                <input placeholder="e.g. 7 Days of Grace" className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 dark:text-white outline-none focus:ring-4 focus:ring-church-green/10 text-base font-bold transition-all" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category</label>
                <select className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 dark:text-white outline-none focus:ring-4 focus:ring-church-green/10 text-base font-bold appearance-none transition-all" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value as any })}>
                  <option value="weekly">Weekly Plan</option>
                  <option value="monthly">Monthly Journey</option>
                  <option value="topical">Topical Deep-dive</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cover Image</label>
                <div className="relative group">
                  {formData.coverUrl ? (
                    <div className="relative h-40 rounded-2xl overflow-hidden mb-4 border border-gray-100 dark:border-white/5">
                      <img src={formData.coverUrl} className="w-full h-full object-cover" alt="Cover Preview" />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, coverUrl: '' }))}
                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-xl shadow-lg hover:scale-110 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl cursor-pointer hover:border-church-green/50 hover:bg-church-green/5 transition-all group">
                      {uploading ? (
                        <Loader2 className="animate-spin text-church-green" size={24} />
                      ) : (
                        <>
                          <UploadCloud size={24} className="text-gray-400 group-hover:text-church-green transition-colors mb-2" />
                          <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Select Plan Cover</span>
                        </>
                      )}
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                    </label>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Description</label>
                <textarea placeholder="Summarize the plan's spiritual goal..." className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 dark:text-white h-32 outline-none resize-none text-base font-medium transition-all" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} required />
              </div>

              <button disabled={loading} className="w-full bg-church-green hover:bg-emerald-700 text-white font-black text-[11px] uppercase tracking-widest py-5 rounded-2xl shadow-xl shadow-church-green/20 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-70">
                {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                {loading ? 'Publishing Plan...' : 'Finalize & Publish'}
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-xl font-black dark:text-white tracking-tighter uppercase">Plan Roadmap</h4>
              <button type="button" onClick={handleAddDay} className="px-5 py-2.5 bg-church-gold hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-church-gold/20">
                <Plus size={16} /> Append New Day
              </button>
            </div>

            <div className="space-y-4">
              {(formData.days || []).length === 0 && (
                <div className="py-20 text-center glass-card rounded-[2.5rem] border-dashed border-2 border-gray-100 dark:border-white/5">
                  <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.3em]">No modules added yet. Start your journey.</p>
                </div>
              )}

              {(formData.days || []).map((day, idx) => (
                <div key={idx} className="glass-card p-6 sm:p-8 rounded-[2rem] border-white/40 dark:border-white/5 shadow-sm space-y-6 animate-fade-in-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <div className="flex justify-between items-center border-b border-gray-100 dark:border-white/5 pb-4">
                    <span className="px-3 py-1 bg-church-green text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-lg shadow-sm shadow-church-green/20">DAY {day.dayNumber}</span>
                    <button type="button" onClick={() => {
                      const newDays = [...(formData.days || [])];
                      newDays.splice(idx, 1);
                      newDays.forEach((d, i) => d.dayNumber = i + 1);
                      setFormData({ ...formData, days: newDays });
                    }} className="w-10 h-10 flex items-center justify-center bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-90">
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Lesson Topic</label>
                      <input placeholder="Module Title" className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl outline-none dark:text-white text-base font-bold focus:border-church-green transition-all" value={day.title} onChange={e => {
                        const newDays = [...(formData.days || [])];
                        newDays[idx].title = e.target.value;
                        setFormData({ ...formData, days: newDays });
                      }} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Scripture Reference</label>
                      <input placeholder="e.g. John 3:16" className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl outline-none dark:text-white text-base font-bold focus:border-church-green transition-all" value={day.passage} onChange={e => {
                        const newDays = [...(formData.days || [])];
                        newDays[idx].passage = e.target.value;
                        setFormData({ ...formData, days: newDays });
                      }} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Spiritual Content</label>
                    <textarea
                      placeholder="Enter the reflection or study material for this day..."
                      className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl outline-none dark:text-white text-base font-medium resize-none focus:border-church-green transition-all h-32"
                      value={day.content}
                      onChange={e => {
                        const newDays = [...(formData.days || [])];
                        newDays[idx].content = e.target.value;
                        setFormData({ ...formData, days: newDays });
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black dark:text-white tracking-tighter uppercase leading-none">Curriculums</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Manage and publish spiritual growth roadmaps.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="group bg-church-green hover:bg-emerald-700 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-church-green/20 transition-all active:scale-95">
          <Plus size={20} /> Create New Plan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {plans.length === 0 ? (
          <div className="col-span-full py-24 text-center glass-card border-none rounded-[3rem]">
            <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen size={40} className="text-gray-300" />
            </div>
            <p className="text-gray-400 font-black uppercase text-xs tracking-[0.4em]">No study plans found</p>
          </div>
        ) : (
          plans.map(p => (
            <div key={p.id} className="group glass-card p-6 md:p-8 rounded-[2.5rem] border-white/40 dark:border-white/5 shadow-premium hover:-translate-y-2 transition-all duration-500 flex flex-col items-start gap-6">
              <div className="flex justify-between items-start w-full">
                <div className="w-12 h-12 rounded-2xl bg-church-green/10 text-church-green flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BookOpen size={24} />
                </div>
                <button onClick={() => handleDelete(p.id)} className="w-10 h-10 flex items-center justify-center bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-90 shadow-sm border border-red-500/10">
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="flex-1">
                <h4 className="text-2xl font-black dark:text-white tracking-tight leading-none mb-2">{p.title}</h4>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black text-church-gold uppercase tracking-widest">{p.category}</span>
                  <div className="w-1 h-1 bg-gray-300 dark:bg-white/10 rounded-full"></div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{p.duration} Modules</span>
                </div>
              </div>

              <div className="w-full pt-6 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Active Curriculum</span>
                <div className="flex -space-x-2">
                  <div className="w-7 h-7 rounded-full border-4 border-white dark:border-gray-800 bg-church-green shadow-sm"></div>
                  <div className="w-7 h-7 rounded-full border-4 border-white dark:border-gray-800 bg-church-gold shadow-sm"></div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
