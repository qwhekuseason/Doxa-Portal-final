import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { GalleryImage } from '../../types';
import { notifyNewGalleryImage } from '../../utils/notificationService';
import { getGoogleDriveDirectLink } from '../../utils/galleryUtils';
import { GalleryCard } from '../GalleryCard';
import { Loader2 } from 'lucide-react';

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
                                onClick={() => window.open(img.externalLink || img.url, '_blank')}
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
