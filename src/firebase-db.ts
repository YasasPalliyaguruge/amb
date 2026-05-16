import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from 'firebase/firestore';
import { app } from './firebase-app';

function createFirestore(): Firestore {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch (error) {
    console.warn('Firestore persistent cache could not be initialized. Falling back to memory cache.', error);
    return getFirestore(app);
  }
}

export const db = createFirestore();
