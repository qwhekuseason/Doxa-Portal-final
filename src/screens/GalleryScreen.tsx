import React, { useMemo, useState } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirestoreQuery } from '../hooks';
import { GalleryImage } from '../types';
import { SkeletonCard, SectionHeader } from '../components/UIComponents';
import { GalleryCard } from '../components/GalleryCard';
import { X, ZoomIn, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const GalleryView: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const galleryQ = useMemo(() => query(collection(db, 'gallery'), orderBy('date', 'desc')), []);
  const { data: images, loading } = useFirestoreQuery<GalleryImage>(galleryQ);

  const openLightbox = (img: GalleryImage, index: number) => {
    setSelectedImage(img);
    setSelectedIndex(index);
  };

  const closeLightbox = () => {
    setSelectedImage(null);
    setSelectedIndex(-1);
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIndex < images.length - 1) {
      const nextIdx = selectedIndex + 1;
      setSelectedIndex(nextIdx);
      setSelectedImage(images[nextIdx]);
    }
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIndex > 0) {
      const prevIdx = selectedIndex - 1;
      setSelectedIndex(prevIdx);
      setSelectedImage(images[prevIdx]);
    }
  };

  // Masonry effect using columns
  const column1 = images.filter((_, i) => i % 3 === 0);
  const column2 = images.filter((_, i) => i % 3 === 1);
  const column3 = images.filter((_, i) => i % 3 === 2);

  return (
    <div className="space-y-12 animate-fade-in pb-20">
      <SectionHeader
        title="Spirit in Frames"
        subtitle="Explore our divine encounters through curated albums and community moments."
      />

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <SkeletonCard key={i} height="h-64" />)}
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-6">
          {[column1, column2, column3].map((column, colIdx) => (
            <div key={colIdx} className="flex-1 flex flex-col gap-6">
              {column.map((img, imgIdx) => {
                const globalIndex = images.findIndex(i => i.id === img.id);
                return (
                  <GalleryCard
                    key={img.id}
                    img={img}
                    index={globalIndex}
                    onClick={() => {
                      const isExternal = img.externalLink || img.url.includes('pixieset.com') || img.url.includes('gallery.');
                      if (isExternal) {
                        window.open(img.externalLink || img.url, '_blank');
                      } else {
                        openLightbox(img, globalIndex);
                      }
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-fade-in" onClick={closeLightbox}>
          <button
            onClick={closeLightbox}
            className="absolute top-8 right-8 p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all z-[310]"
          >
            <X size={28} />
          </button>

          <div className="relative w-full h-full flex flex-col items-center justify-center p-4 md:p-12 gap-8">
            <div className="relative group max-w-5xl max-h-[70vh] flex items-center justify-center">
              <img
                src={selectedImage.url}
                className="max-w-full max-h-full rounded-3xl shadow-premium object-contain animate-in zoom-in duration-500"
                alt={selectedImage.caption}
                onClick={(e) => e.stopPropagation()}
                onError={(e) => (e.currentTarget.src = 'https://images.unsplash.com/photo-1510133539744-11d206f9abe2?auto=format&fit=crop&q=80&w=1000')}
              />

              {/* Navigation Buttons */}
              <button
                onClick={prevImage}
                disabled={selectedIndex === 0}
                className="absolute left-[-20px] md:left-[-60px] top-1/2 -translate-y-1/2 p-4 bg-white/5 hover:bg-white/20 disabled:opacity-0 rounded-full text-white transition-all"
              >
                <ChevronLeft size={40} />
              </button>
              <button
                onClick={nextImage}
                disabled={selectedIndex === images.length - 1}
                className="absolute right-[-20px] md:right-[-60px] top-1/2 -translate-y-1/2 p-4 bg-white/5 hover:bg-white/20 disabled:opacity-0 rounded-full text-white transition-all"
              >
                <ChevronRight size={40} />
              </button>
            </div>

            <div className="text-center max-w-2xl animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="w-12 h-[1px] bg-church-gold"></span>
                <span className="text-xs font-black uppercase tracking-[0.3em] text-church-gold">Image Details</span>
                <span className="w-12 h-[1px] bg-church-gold"></span>
              </div>
              <h3 className="text-3xl font-black text-white tracking-tighter mb-4 uppercase">{selectedImage.caption}</h3>
              <div className="flex items-center justify-center gap-6 text-white/50">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                  <Calendar size={14} className="text-church-green" />
                  {new Date(selectedImage.date).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                  <ZoomIn size={14} className="text-church-gold" />
                  High Resolution
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryView;