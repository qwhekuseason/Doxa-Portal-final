import React, { useState, useEffect } from 'react';
import {
    collection,
    addDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../../firebase';
import { EBook } from '../../types';
import { AdminTable } from '../AdminViews';
import {
    Plus,
    Trash2,
    X,
    Upload,
    Loader2,
    BookOpen,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';

export const LibraryManager: React.FC = () => {
    const [books, setBooks] = useState<EBook[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form states
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [fileUrl, setFileUrl] = useState('');
    const [coverUrl, setCoverUrl] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    // Image processing helper
    const processImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const MAX_WIDTH = 400; // Book covers can be small
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                };
                img.onerror = reject;
            };
            reader.onerror = reject;
        });
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        setError(null);
        try {
            const base64 = await processImage(file);
            setImagePreview(base64);
            setCoverUrl(base64);
        } catch (err) {
            console.error("Image processing error:", err);
            setError("Failed to process image.");
        } finally {
            setUploading(false);
        }
    };

    useEffect(() => {
        const q = query(collection(db, 'e_books'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setBooks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EBook)));
            setLoading(false);
        }, (error) => {
            console.error("Library load error:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fileUrl || !title || !author) {
            setError("Title, Author, and Book Link are required.");
            return;
        }

        setUploading(true);
        setError(null);

        try {
            await addDoc(collection(db, 'e_books'), {
                title,
                author,
                category,
                description,
                fileUrl,
                coverUrl: coverUrl || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=300&h=450&fit=crop',
                fileSize: 0,
                uploadedBy: 'Admin',
                createdAt: serverTimestamp()
            });

            setIsModalOpen(false);
            resetForm();
        } catch (err: any) {
            console.error("Upload error:", err);
            setError(err.message || "Failed to add eBook.");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (book: EBook) => {
        if (!confirm(`Are you sure you want to delete "${book.title}"?`)) return;

        try {
            await deleteDoc(doc(db, 'e_books', book.id));
        } catch (err) {
            console.error("Delete error:", err);
            alert("Error deleting book records.");
        }
    };

    const resetForm = () => {
        setTitle('');
        setAuthor('');
        setCategory('');
        setDescription('');
        setFileUrl('');
        setCoverUrl('');
        setImagePreview(null);
        setError(null);
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-church-gold/10 rounded-2xl flex items-center justify-center text-church-gold">
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black dark:text-white uppercase tracking-tight">E-Book Library</h3>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Manage Digital Resources</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-church-gold hover:bg-amber-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-church-gold/20 transition-all active:scale-95"
                >
                    <Plus size={18} /> Add New Book
                </button>
            </div>

            {loading ? (
                <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-church-gold" size={40} /></div>
            ) : books.length === 0 ? (
                <div className="py-20 text-center bg-gray-50 dark:bg-white/5 rounded-[2.5rem] border border-dashed border-gray-200 dark:border-white/10">
                    <BookOpen size={48} className="mx-auto text-gray-300 mb-4 opacity-50" />
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Your library is empty.</p>
                </div>
            ) : (
                <AdminTable headers={['Book Info', 'Category', 'Size', 'Date Authored', 'Actions']}>
                    {books.map(book => (
                        <tr key={book.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-all group">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-4">
                                    <img src={book.coverUrl} className="w-10 h-14 rounded-lg object-cover shadow-sm bg-gray-100" />
                                    <div>
                                        <p className="font-black text-gray-900 dark:text-white uppercase text-xs tracking-tight">{book.title}</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">By {book.author}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className="px-3 py-1 bg-church-gold/10 text-church-gold text-[9px] font-black uppercase tracking-widest rounded-full">
                                    {book.category || 'General'}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase">
                                {book.fileSize > 0 ? `${(book.fileSize / (1024 * 1024)).toFixed(2)} MB` : 'Unknown'}
                            </td>
                            <td className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                {book.createdAt?.toDate ? new Date(book.createdAt.toDate()).toLocaleDateString() : 'Recent'}
                            </td>
                            <td className="px-6 py-4 text-right">
                                <button
                                    onClick={() => handleDelete(book)}
                                    className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </AdminTable>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#0a0a0a] w-full max-w-2xl max-h-[85vh] md:max-h-[90vh] rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-white/5 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 my-auto relative">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
                            <div>
                                <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Add to Library</h3>
                                <p className="text-[10px] font-black text-church-gold tracking-[0.2em] uppercase mt-1">Resource Management</p>
                            </div>
                            <button
                                onClick={() => !uploading && setIsModalOpen(false)}
                                className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-white/5 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all active:scale-95"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 md:p-8">
                            {error && (
                                <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl flex items-center gap-3 text-red-600">
                                    <AlertCircle size={20} />
                                    <span className="text-xs font-bold uppercase tracking-tight">{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleUpload} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Book Title</label>
                                        <input
                                            placeholder="e.g. Purpose Driven Life"
                                            className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border-none focus:ring-2 focus:ring-church-gold/20 dark:text-white outline-none font-bold text-xs"
                                            value={title}
                                            onChange={e => setTitle(e.target.value)}
                                            required
                                            disabled={uploading}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Author Name</label>
                                        <input
                                            placeholder="e.g. Rick Warren"
                                            className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border-none focus:ring-2 focus:ring-church-gold/20 dark:text-white outline-none font-bold text-xs"
                                            value={author}
                                            onChange={e => setAuthor(e.target.value)}
                                            required
                                            disabled={uploading}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category / Topic</label>
                                    <input
                                        placeholder="e.g. Leadership, Devotional, Youth"
                                        className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border-none focus:ring-2 focus:ring-church-gold/20 dark:text-white outline-none font-bold text-xs"
                                        value={category}
                                        onChange={e => setCategory(e.target.value)}
                                        disabled={uploading}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Brief Description</label>
                                    <textarea
                                        placeholder="What is this book about?"
                                        className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border-none focus:ring-2 focus:ring-church-gold/20 dark:text-white outline-none font-bold text-xs h-24 resize-none"
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        disabled={uploading}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Book URL (Link)</label>
                                        <input
                                            placeholder="https://drive.google.com/..."
                                            className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border-none focus:ring-2 focus:ring-church-gold/20 dark:text-white outline-none font-bold text-xs"
                                            value={fileUrl}
                                            onChange={e => setFileUrl(e.target.value)}
                                            required
                                            disabled={uploading}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cover Image</label>
                                        <div className="relative group/cover">
                                            {imagePreview ? (
                                                <div className="relative rounded-2xl overflow-hidden aspect-[3/4] border-2 border-church-gold/30">
                                                    <img src={imagePreview} className="w-full h-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => { setImagePreview(null); setCoverUrl(''); }}
                                                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-xl shadow-lg opacity-0 group-hover/cover:opacity-100 transition-opacity"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <label className="flex flex-col items-center justify-center p-8 rounded-2xl bg-gray-50 dark:bg-white/5 border-2 border-dashed border-gray-200 dark:border-white/10 hover:border-church-gold/50 cursor-pointer transition-all gap-2 h-full min-h-[160px]">
                                                    <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} disabled={uploading} />
                                                    <Upload size={24} className="text-gray-400" />
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Upload Cover</span>
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={uploading || !fileUrl || !title}
                                    className="w-full bg-church-gold hover:bg-amber-600 text-white font-black py-5 rounded-3xl shadow-xl shadow-church-gold/20 active:scale-95 transition-all text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {uploading ? (
                                        <>
                                            <Loader2 className="animate-spin" size={20} />
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 size={20} />
                                            <span>Register Resource</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
