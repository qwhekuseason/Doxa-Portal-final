import { useEffect, useState } from 'react';
import { onSnapshot, Query, DocumentData, FirestoreError } from 'firebase/firestore';

export function useFirestoreQuery<T>(query: Query<DocumentData> | null) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    if (!query) {
        setLoading(false);
        return;
    }
    
    setLoading(true);
    const unsubscribe = onSnapshot(query, 
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        })) as T[];
        setData(docs);
        setLoading(false);
        setError(null);
      }, 
      (err) => {
        console.error(err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [query]);

  return { data, loading, error };
}