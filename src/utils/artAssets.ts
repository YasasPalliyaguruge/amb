import { frameSequenceManifest } from '../theme/frameSequenceManifest';
import type { SiteSettings } from '../siteSettings/siteSettings';

const fallbackArtImages = [
  '123846',
  '123854',
  '123924',
  '124029',
].map((time) => `/art/Screenshot 2026-03-23 ${time}.png`);

const preloadedImages = new Map<string, Promise<boolean>>();

function uniqueGalleryImages(primaryItems: string[], fallbackItems: string[], featureImage: string, limit: number) {
  const seen = new Set<string>([featureImage].filter(Boolean));

  return [...primaryItems, ...fallbackItems].filter((item) => {
    if (!item || seen.has(item)) {
      return false;
    }

    seen.add(item);
    return true;
  }).slice(0, limit);
}

export function resolveArtImageUrls(siteSettings: SiteSettings) {
  const scene = frameSequenceManifest[siteSettings.motion.artSceneId] ?? frameSequenceManifest.studio;
  const featureImage = siteSettings.media.artFeatureUrl || scene.fallback;
  const galleryImages = uniqueGalleryImages(siteSettings.media.artGalleryUrls, fallbackArtImages, featureImage, 4);

  return {
    scene,
    featureImage,
    galleryImages,
    allImages: [featureImage, ...galleryImages],
  };
}

export function preloadImage(src: string, fetchPriority: 'high' | 'low' | 'auto' = 'low') {
  if (!src || typeof window === 'undefined') {
    return Promise.resolve(false);
  }

  const cachedPromise = preloadedImages.get(src);
  if (cachedPromise) {
    return cachedPromise;
  }

  const preloadPromise = new Promise<boolean>((resolve) => {
    const image = new Image();
    let isSettled = false;

    const finish = (didLoad: boolean) => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      resolve(didLoad);
    };

    image.decoding = 'async';
    image.loading = 'eager';
    image.fetchPriority = fetchPriority;
    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    image.src = src;

    if (image.complete && image.naturalWidth > 0) {
      finish(true);
    }
  });

  preloadedImages.set(src, preloadPromise);
  return preloadPromise;
}

export function preloadArtImages(siteSettings: SiteSettings) {
  const { allImages } = resolveArtImageUrls(siteSettings);

  allImages.forEach((src, index) => {
    void preloadImage(src, index === 0 ? 'high' : 'low');
  });
}
