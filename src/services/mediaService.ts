import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase-db';

export interface MediaAssetRecord {
  id: string;
  name: string;
  label: string;
  category: string;
  url: string;
  storagePath: string;
  contentType: string;
  size: number;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export async function uploadMediaAsset(
  file: File,
  {
    label,
    category,
  }: {
    label: string;
    category: string;
  }
) {
  const [{ getDownloadURL, ref, uploadBytes }, { storage }] = await Promise.all([
    import('firebase/storage'),
    import('../firebase-storage'),
  ]);
  const timestamp = Date.now();
  const fileSlug = slugify(file.name.replace(/\.[^/.]+$/, '')) || 'asset';
  const extension = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
  const storagePath = `site-assets/${timestamp}-${fileSlug}.${extension}`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, file, {
    contentType: file.type || 'application/octet-stream',
  });

  const url = await getDownloadURL(storageRef);
  const metadata = {
    name: file.name,
    label: label.trim() || file.name,
    category: category.trim() || 'general',
    url,
    storagePath,
    contentType: file.type || 'application/octet-stream',
    size: file.size,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const assetRef = await addDoc(collection(db, 'mediaAssets'), metadata);

  return {
    id: assetRef.id,
    ...metadata,
  };
}

export async function updateMediaAssetMetadata(
  assetId: string,
  payload: {
    label: string;
    category: string;
  }
) {
  await updateDoc(doc(db, 'mediaAssets', assetId), {
    label: payload.label.trim(),
    category: payload.category.trim(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteMediaAsset(asset: Pick<MediaAssetRecord, 'id' | 'storagePath'>) {
  const [{ deleteObject, ref }, { storage }] = await Promise.all([
    import('firebase/storage'),
    import('../firebase-storage'),
  ]);

  await deleteObject(ref(storage, asset.storagePath));
  await deleteDoc(doc(db, 'mediaAssets', asset.id));
}
