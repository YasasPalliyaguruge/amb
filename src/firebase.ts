import { initializeApp, FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig as FirebaseOptions);

// New project uses the default Firestore database
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
