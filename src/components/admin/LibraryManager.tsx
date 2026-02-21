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
    AlertCircle,
    FileText,
    ImageIcon,
    Save,
    Download
} from 'lucide-react';
import { initGoogleAuth, uploadFileToDrive } from '../../utils/googleDriveService';
import { notifyNewEBook } from '../../utils/notificationService';

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
    const [bookFile, setBookFile] = useState<File | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStep, setUploadStep] = useState<'idle' | 'files' | 'cover' | 'saving' | 'done'>('idle');
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        initGoogleAuth();
    }, []);

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
        setCoverFile(file);
        // Create a local preview
        const reader = new FileReader();
        reader.onload = (e) => setImagePreview(e.target?.result as string);
        reader.readAsDataURL(file);
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
        if (!title || !author || (!bookFile && !fileUrl)) {
            setError("Title, Author, and either a Book File or Book Link are required.");
            return;
        }

        setUploading(true);
        setError(null);
        setUploadProgress(0);

        try {
            let finalFileUrl = fileUrl;
            let finalCoverUrl = coverUrl;
            let fileSize = 0;

            if (bookFile) {
                setUploadStep('files');
                const driveResult = await uploadFileToDrive(bookFile, (p) => setUploadProgress(p));
                finalFileUrl = driveResult.downloadLink;
                fileSize = bookFile.size;
            }

            if (coverFile) {
                setUploadStep('cover');
                setUploadProgress(0);
                const coverResult = await uploadFileToDrive(coverFile, (p) => setUploadProgress(p));
                finalCoverUrl = `https://lh3.googleusercontent.com/d/${coverResult.fileId}`;
            }

            setUploadStep('saving');
            await addDoc(collection(db, 'e_books'), {
                title,
                author,
                category,
                description,
                fileUrl: finalFileUrl,
                coverUrl: finalCoverUrl || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=300&h=450&fit=crop',
                fileSize,
                uploadedBy: 'Admin',
                createdAt: serverTimestamp()
            });

            // Send notification
            await notifyNewEBook(title, author);

            setUploadStep('done');
            setShowSuccess(true);
            setTimeout(() => {
                setIsModalOpen(false);
                setShowSuccess(false);
                resetForm();
                setUploadStep('idle');
            }, 2000);
        } catch (err: any) {
            console.error("Upload error:", err);
            setError(err.message || "Failed to add eBook.");
            setUploading(false);
            setUploadStep('idle');
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
        setBookFile(null);
        setCoverFile(null);
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
                <div className="flex items-center gap-3">
                    <button
                        onClick={async () => {
                            if (books.length === 0) return;
                            const confirmExport = confirm("Choose export format:\nOK for Excel (XLSX)\nCancel for PDF Document");
                            const headers = ["Title", "Author", "Category", "Size"];
                            const excelData = books.map(b => ({
                                Title: b.title,
                                Author: b.author,
                                Category: b.category || 'General',
                                Size: b.fileSize > 0 ? `${(b.fileSize / (1024 * 1024)).toFixed(2)} MB` : 'N/A'
                            }));
                            const pdfData = books.map(b => [
                                b.title,
                                b.author,
                                b.category || 'General',
                                b.fileSize > 0 ? `${(b.fileSize / (1024 * 1024)).toFixed(2)} MB` : 'N/A'
                            ]);
                            const utils = await import('../../utils/exportUtils');
                            if (confirmExport) {
                                utils.exportToExcel(excelData, `Library_Catalog_${new Date().toISOString().slice(0, 10)}`);
                            } else {
                                utils.exportToPDF(headers, pdfData, `Library_Catalog_${new Date().toISOString().slice(0, 10)}`, "Doxa Portal - E-Book Library Catalog");
                            }
                        }}
                        className="hidden md:flex items-center gap-2 px-5 py-3 bg-white dark:bg-white/5 border border-black/5 dark:border-white/5 text-gray-600 dark:text-gray-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm"
                    >
                        <Download size={14} /> Export Catalog
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-church-gold hover:bg-amber-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-church-gold/20 transition-all active:scale-95"
                    >
                        <Plus size={18} /> Add New Book
                    </button>
                </div>
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
                <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 md:p-8 pt-12 md:items-center md:pt-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
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

                        <div className="flex-1 overflow-y-auto p-6 md:p-8 relative">
                            {(uploading || showSuccess) && (
                                <div className="absolute inset-0 z-50 bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-md flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-300">
                                    {showSuccess ? (
                                        <div className="space-y-6 animate-in zoom-in duration-500">
                                            <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto border-4 border-green-500">
                                                <CheckCircle2 size={48} className="text-green-500 animate-bounce" />
                                            </div>
                                            <div>
                                                <h4 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Done!</h4>
                                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-2">Resource successfully Added</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-full max-w-xs space-y-8">
                                            <div className="relative">
                                                <div className="w-20 h-20 bg-church-gold/10 rounded-3xl flex items-center justify-center mx-auto text-church-gold animate-pulse">
                                                    {uploadStep === 'files' ? <FileText size={40} /> : uploadStep === 'cover' ? <ImageIcon size={40} /> : <Save size={40} />}
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex justify-between items-end">
                                                    <div className="text-left">
                                                        <p className="text-[10px] font-black text-church-gold uppercase tracking-[0.2em] mb-1">
                                                            Step {uploadStep === 'files' ? '1/3' : uploadStep === 'cover' ? '2/3' : '3/3'}
                                                        </p>
                                                        <h4 className="text-lg font-black dark:text-white uppercase tracking-tight">
                                                            {uploadStep === 'files' ? 'Uploading E-Book' : uploadStep === 'cover' ? 'Uploading Cover' : 'Finalizing'}
                                                        </h4>
                                                    </div>
                                                    <span className="text-xl font-black dark:text-white tabular-nums">{uploadProgress}%</span>
                                                </div>

                                                <div className="h-3 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden border border-gray-200 dark:border-white/10">
                                                    <div
                                                        className="h-full bg-church-gold shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all duration-300 ease-out rounded-full"
                                                        style={{ width: `${uploadProgress}%` }}
                                                    />
                                                </div>

                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    Please don't close this window
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

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

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">eBook File (PDF/Epub)</label>
                                    <div className="relative group/file">
                                        {bookFile ? (
                                            <div className="p-4 rounded-2xl bg-church-gold/5 border-2 border-church-gold/30 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-church-gold/20 rounded-xl flex items-center justify-center text-church-gold">
                                                        <FileText size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black dark:text-white uppercase truncate max-w-[200px]">{bookFile.name}</p>
                                                        <p className="text-[10px] font-bold text-gray-400">{(bookFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setBookFile(null)}
                                                    className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-all"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border-2 border-dashed border-gray-200 dark:border-white/10 hover:border-church-gold/30 cursor-pointer transition-all">
                                                <input type="file" className="hidden" onChange={e => e.target.files?.[0] && setBookFile(e.target.files[0])} disabled={uploading} />
                                                <div className="w-10 h-10 bg-gray-100 dark:bg-white/10 rounded-xl flex items-center justify-center text-gray-400">
                                                    <Plus size={20} />
                                                </div>
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select eBook File</span>
                                            </label>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Or Paste Link (Optional)</label>
                                        <input
                                            placeholder="https://drive.google.com/..."
                                            className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border-none focus:ring-2 focus:ring-church-gold/20 dark:text-white outline-none font-bold text-xs"
                                            value={fileUrl}
                                            onChange={e => setFileUrl(e.target.value)}
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
                                    disabled={uploading || !title || (!bookFile && !fileUrl)}
                                    className="w-full bg-church-gold hover:bg-amber-600 text-white font-black py-5 rounded-3xl shadow-xl shadow-church-gold/20 active:scale-95 transition-all text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {uploading ? (
                                        <>
                                            <Loader2 className="animate-spin" size={20} />
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={20} />
                                            <span>Upload Resource</span>
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
