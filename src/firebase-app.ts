import { initializeApp, type FirebaseOptions } from 'firebase/app';
import firebaseConfig from '../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig as FirebaseOptions);
