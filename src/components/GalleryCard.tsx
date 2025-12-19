import React, { useState } from 'react';
import { Calendar, ExternalLink, Maximize2, Trash2 } from 'lucide-react';
import { GalleryImage } from '../types';
import { getGoogleDriveDirectLink, FALLBACK_IMAGE } from '../utils/galleryUtils';

interface GalleryCardProps {
    img: GalleryImage;
    index: number;
    onClick: () => void;
    isAdmin?: boolean;
    onDelete?: () => void;
}


export const GalleryCard: React.FC<GalleryCardProps> = ({ img, index, onClick, isAdmin, onDelete }) => {
    const [hasError, setHasError] = useState(false);

    // Determine the source URL
    const getSrc = () => {
        if (hasError) return FALLBACK_IMAGE;

        const url = img.url;
        // If it's a Pixieset link in the image field, it's not a direct image
        if (url.includes('pixieset.com') || url.includes('gallery.')) {
            return FALLBACK_IMAGE;
        }

        return getGoogleDriveDirectLink(url);
    };

    const isExternal = img.externalLink || img.url.includes('pixieset.com') || img.url.includes('gallery.');

    if (isAdmin) {
        return (
            <div className="relative group rounded-xl overflow-hidden aspect-square border border-gray-200 dark:border-gray-700 shadow-sm bg-gray-100 dark:bg-gray-900">
                <img
                    src={getSrc()}
                    className="w-full h-full object-cover"
                    alt={img.caption}
                    onError={() => setHasError(true)}
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4 text-center">
                    <p className="text-white text-xs font-bold line-clamp-2">{img.caption}</p>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete?.();
                        }}
                        className="p-2 bg-red-500 text-white rounded-full hover:scale-110 transition-transform shadow-lg"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            onClick={onClick}
            className="relative group rounded-[2rem] overflow-hidden cursor-pointer shadow-premium hover:shadow-premium-lg transition-all duration-700 animate-fade-in-up"
            style={{ animationDelay: `${index * 0.05}s` }}
        >
            <img
                src={getSrc()}
                className="w-full h-auto object-cover transition-transform duration-[2000ms] group-hover:scale-110"
                alt={img.caption}
                onError={() => setHasError(true)}
            />

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-8">
                <div className="flex items-center gap-2 mb-3 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                    <span className="w-8 h-[1px] bg-church-gold"></span>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-church-gold">Divine Album</span>
                </div>
                <p className="text-white font-black text-xl tracking-tight mb-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 delay-75">{img.caption}</p>
                <div className="flex items-center justify-between transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 delay-150">
                    <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                        <Calendar size={12} className="text-church-green" /> {new Date(img.date).toLocaleDateString()}
                    </span>
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white">
                        {isExternal ? <ExternalLink size={18} /> : <Maximize2 size={18} />}
                    </div>
                </div>
            </div>
        </div>
    );
};
