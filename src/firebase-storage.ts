import { getStorage } from 'firebase/storage';
import { app } from './firebase-app';

export const storage = getStorage(app);
