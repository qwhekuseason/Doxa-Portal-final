import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Sermon } from '../../types';
import { notifyNewSermon } from '../../utils/notificationService';
import { getGoogleDriveDirectLink } from '../../utils/galleryUtils';
import { initGoogleAuth, uploadFileToDrive } from '../../utils/googleDriveService';
import { AdminTable } from './AdminCommon';
import { Plus, Trash2, X, Activity, ImageIcon, Save, Loader2, CheckCircle2, Video, Link, UploadCloud } from 'lucide-react';

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

            const docRef = await addDoc(collection(db, 'sermons'), {
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
            await notifyNewSermon(docRef.id, formData.title || 'New Content');

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
