import React, { useMemo } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirestoreQuery } from '../hooks';
import { GalleryImage } from '../types';
import { SkeletonCard } from '../components/UIComponents';

const GalleryView: React.FC = () => {
  const galleryQ = useMemo(() => query(collection(db, 'gallery'), orderBy('date', 'desc')), []);
  const { data: images, loading } = useFirestoreQuery<GalleryImage>(galleryQ);

  return (
    <div className="space-y-8 animate-fade-in-up">
      <h2 className="text-3xl font-bold font-serif dark:text-white">Photo Gallery</h2>
      {loading ? <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <SkeletonCard key={i} height="h-64"/>)}</div> :
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map(img => (
            <div key={img.id} className="relative group rounded-2xl overflow-hidden aspect-square cursor-pointer">
              <img src={img.url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={img.caption} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                <p className="text-white font-bold">{img.caption}</p>
                <p className="text-white/70 text-xs">{new Date(img.date).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>}
    </div>
  );
};

export default GalleryView;