import { describe, expect, it } from 'vitest';
import { defaultSiteSettings } from '../src/siteSettings/siteSettings';
import { resolveArtImageUrls } from '../src/utils/artAssets';

describe('art asset resolution', () => {
  it('returns the art feature image followed by unique gallery images', () => {
    const settings = {
      ...defaultSiteSettings,
      media: {
        ...defaultSiteSettings.media,
        artFeatureUrl: '/custom/feature.png',
        artGalleryUrls: ['/custom/feature.png', '/custom/gallery-1.png', '/custom/gallery-1.png', '/custom/gallery-2.png'],
      },
    };

    const urls = resolveArtImageUrls(settings);

    expect(urls.featureImage).toBe('/custom/feature.png');
    expect(urls.galleryImages.slice(0, 2)).toEqual(['/custom/gallery-1.png', '/custom/gallery-2.png']);
    expect(urls.allImages[0]).toBe('/custom/feature.png');
    expect(new Set(urls.allImages).size).toBe(urls.allImages.length);
  });
});
