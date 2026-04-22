import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import InteractivePlane from './InteractivePlane';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import { frameSequenceManifest } from '../theme/frameSequenceManifest';
import { getSiteIcon } from '../utils/siteIcons';

function uniqueMediaSequence(primaryItems: string[], fallbackItems: string[], excludedItems: string[], limit: number) {
  const excluded = new Set(excludedItems.filter(Boolean));
  const seen = new Set<string>();
  const orderedItems = [...primaryItems, ...fallbackItems];

  return orderedItems.filter((item) => {
    if (!item || excluded.has(item) || seen.has(item)) {
      return false;
    }

    seen.add(item);
    return true;
  }).slice(0, limit);
}

export default function Hero() {
  const { siteSettings } = useSiteSettings();
  const shouldReduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const scene = frameSequenceManifest[siteSettings.motion.heroSceneId] ?? frameSequenceManifest.hero;
  const heroImage = siteSettings.media.heroPrimaryUrl || scene.fallback;
  const supportingFrames = uniqueMediaSequence(
    siteSettings.media.heroSupportingUrls,
    [...scene.frames].reverse(),
    [heroImage],
    3
  );
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });
  const mediaY = useTransform(scrollYProgress, [0, 1], shouldReduceMotion ? [0, 0] : [26, -20]);

  return (
    <section id="home" ref={sectionRef} className="section-shell section-shell--hero">
      <div className="section-frame gap-10">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)] xl:items-start">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-7"
          >
            <div className="space-y-5">
              <span className="display-pretitle">{siteSettings.hero.eyebrow}</span>
              <div className="space-y-3">
                <p className="caption-meta">{siteSettings.branding.practitionerName}</p>
                <h1 className="display-hero hero-display-lock">{siteSettings.hero.headline}</h1>
              </div>
              <p className="display-lead hero-copy-lock">{siteSettings.hero.description}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              {siteSettings.hero.badges.map((badge) => (
                <span key={badge} className="stats-chip">{badge}</span>
              ))}
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <a href={siteSettings.hero.secondaryCtaHref} className="theme-button-primary hero-primary-cta">
                {siteSettings.hero.secondaryCtaLabel}
                <ArrowRight className="h-4 w-4" />
              </a>
              <a href={siteSettings.hero.primaryCtaHref} className="theme-button-secondary hero-secondary-cta">
                {siteSettings.hero.primaryCtaLabel}
              </a>
            </div>
          </motion.div>

          <div className="hero-media-grid">
            <InteractivePlane className="group h-full">
              <motion.div
                style={{ y: mediaY }}
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.82, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
                className="media-frame hero-media-frame overflow-hidden p-3"
              >
                <div className="relative overflow-hidden rounded-[calc(var(--theme-radius-xl)-0.45rem)]">
                  <img
                    src={heroImage}
                    alt={siteSettings.hero.mediaAlt}
                    width={960}
                    height={980}
                    className="aspect-[4/4.95] w-full object-cover"
                    style={{ objectPosition: scene.objectPosition ?? 'center center' }}
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_30%,rgb(var(--theme-ink-rgb)/0.62)_100%)]" />
                  <div className="absolute bottom-0 left-0 right-0 grid gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                    <div className="space-y-1.5">
                      <p className="utility-label text-white/56">{siteSettings.hero.mediaEyebrow}</p>
                      <p className="font-heading text-2xl font-semibold leading-tight text-white sm:text-[2rem]">
                        {siteSettings.hero.mediaHeadline}
                      </p>
                    </div>
                    <span className="stats-chip border-white/12 bg-white/10 text-white/72">{siteSettings.hero.mediaBadge}</span>
                  </div>
                </div>
              </motion.div>
            </InteractivePlane>

            <div className="hero-supporting-grid">
              {supportingFrames.map((frame, index) => (
                <InteractivePlane key={frame} className="group h-full">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.12 + index * 0.06 }}
                    className="media-frame hero-supporting-frame overflow-hidden p-2.5"
                  >
                    <div className="relative overflow-hidden rounded-[calc(var(--theme-radius-lg)-0.38rem)]">
                      <img
                        src={frame}
                        alt={`${siteSettings.hero.supportingFrameAltPrefix} ${index + 1}`}
                        width={420}
                        height={353}
                        className="aspect-[4/4.8] w-full object-cover"
                        style={{ objectPosition: scene.objectPosition ?? 'center center' }}
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="media-frame__badge">
                        {siteSettings.hero.supportingFrameBadgePrefix} {String(index + 1).padStart(2, '0')}
                      </div>
                    </div>
                  </motion.div>
                </InteractivePlane>
              ))}
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-120px' }}
          transition={{ duration: 0.46 }}
          className="hero-assurance-row"
        >
          <p className="hero-support-note">
            {siteSettings.hero.supportNote}
          </p>

          <div className="hero-trust-grid">
            {siteSettings.hero.trustCards.map((item) => {
              const Icon = getSiteIcon(item.icon);

              return (
                <div key={item.title} className="hero-trust-card">
                  <div className="hero-trust-card__icon">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="space-y-1.5">
                    <p className="hero-trust-card__title">{item.title}</p>
                    <p className="hero-trust-card__body">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        <div className="hero-notes-grid">
          {siteSettings.hero.noteCards.map((note, index) => {
            const Icon = getSiteIcon(note.icon);

            return (
              <InteractivePlane key={note.title} className="group h-full">
                <motion.article
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-120px' }}
                  transition={{ duration: 0.45, delay: index * 0.05 }}
                  className="feature-card feature-card--surface"
                >
                  <div className="feature-card__icon">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="feature-card__title">{note.title}</h2>
                    <p className="feature-card__body">{note.description}</p>
                  </div>
                </motion.article>
              </InteractivePlane>
            );
          })}
        </div>
      </div>
    </section>
  );
}
