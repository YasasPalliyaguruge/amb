import { motion } from 'framer-motion';
import { ArrowUpRight, GalleryVerticalEnd } from 'lucide-react';
import InteractivePlane from './InteractivePlane';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import { frameSequenceManifest } from '../theme/frameSequenceManifest';

const artImages = [
  '123846',
  '123854',
  '123924',
  '124029',
].map((time) => `/art/Screenshot 2026-03-23 ${time}.png`);

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

export default function DoodleArt() {
  const { siteSettings } = useSiteSettings();
  const scene = frameSequenceManifest[siteSettings.motion.artSceneId] ?? frameSequenceManifest.studio;
  const featureImage = siteSettings.media.artFeatureUrl || scene.fallback;
  const galleryImages = uniqueGalleryImages(siteSettings.media.artGalleryUrls, artImages, featureImage, 4);

  return (
    <section className="section-shell section-shell--airy">
      <div id="doodle-art" className="section-frame gap-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-120px' }}
          transition={{ duration: 0.6 }}
          className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:items-end"
        >
          <div className="space-y-5">
            <span className="display-pretitle">
              <GalleryVerticalEnd className="h-3.5 w-3.5" />
              {siteSettings.artStudio.eyebrow}
            </span>
            <h2 className="display-title section-title-lock">{siteSettings.artStudio.headline}</h2>
          </div>

          <div className="story-card story-card--profile min-h-[12rem]">
            <p className="story-body">{siteSettings.artStudio.intro}</p>
          </div>
        </motion.div>

        <div className="art-feature-grid grid gap-6 xl:grid-cols-[minmax(0,1.06fr)_minmax(0,0.94fr)] xl:items-stretch">
          <InteractivePlane className="group art-feature-plane">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-120px' }}
              transition={{ duration: 0.58 }}
              className="media-frame art-feature-card overflow-hidden p-3"
            >
              <div className="relative overflow-hidden rounded-[calc(var(--theme-radius-xl)-0.45rem)]">
                <img
                  src={featureImage}
                  alt={siteSettings.artStudio.featureAlt}
                  width={1280}
                  height={880}
                  className="art-feature-image aspect-[16/11] w-full object-cover"
                  style={{ objectPosition: scene.objectPosition ?? 'center center' }}
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgb(var(--theme-ink-rgb)/0.52)_100%)]" />
                <div className="absolute bottom-0 left-0 right-0 grid gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                  <div className="space-y-1.5">
                    <p className="utility-label text-white/54">{siteSettings.artStudio.panelEyebrow}</p>
                    <p className="font-heading text-[2rem] font-semibold leading-tight text-white">
                      {siteSettings.artStudio.panelHeadline}
                    </p>
                  </div>
                  <span className="stats-chip border-white/12 bg-white/10 text-white/70">{siteSettings.artStudio.featureBadge}</span>
                </div>
              </div>
            </motion.div>
          </InteractivePlane>

          <InteractivePlane className="group art-feature-plane">
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-120px' }}
              transition={{ duration: 0.56, delay: 0.04 }}
              className="profile-panel art-feature-card"
            >
              <div className="space-y-4">
                <p className="caption-meta">{siteSettings.artStudio.panelEyebrow}</p>
                <h3 className="story-title profile-title-lock">{siteSettings.artStudio.panelHeadline}</h3>
                <p className="story-body">{siteSettings.artStudio.panelDescription}</p>
              </div>

              <a
                href={siteSettings.footer.instagramUrl}
                target="_blank"
                rel="noreferrer"
                className="theme-button-ghost"
              >
                {siteSettings.artStudio.instagramCtaLabel}
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </motion.article>
          </InteractivePlane>
        </div>

        <div className="art-gallery-grid grid gap-4 md:grid-cols-12">
          {galleryImages.map((src, index) => (
            <InteractivePlane
              key={src}
              className={`group art-gallery-plane ${index === 0 ? 'md:col-span-5' : index === 1 ? 'md:col-span-3' : index === 2 ? 'md:col-span-4' : 'md:col-span-12'}`}
            >
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-120px' }}
                transition={{ duration: 0.42, delay: index * 0.04 }}
                className={`media-frame art-gallery-card ${index === 3 ? 'art-gallery-card--wide' : ''} overflow-hidden p-2.5`}
              >
                <div className="relative overflow-hidden rounded-[calc(var(--theme-radius-lg)-0.38rem)]">
                  <img
                    src={src}
                    alt={`${siteSettings.artStudio.galleryAltPrefix} ${index + 1}`}
                    width={720}
                    height={900}
                    loading="lazy"
                    decoding="async"
                    className={`art-gallery-image w-full object-cover ${
                      index === 0 ? 'aspect-[4/5]' : index === 1 ? 'aspect-[4/4.8]' : index === 2 ? 'aspect-[4/5.3]' : 'aspect-[16/7.2]'
                    }`}
                  />
                  <div className="media-frame__badge">
                    {siteSettings.artStudio.galleryCaption} {String(index + 1).padStart(2, '0')}
                  </div>
                </div>
              </motion.div>
            </InteractivePlane>
          ))}
        </div>
      </div>
    </section>
  );
}
