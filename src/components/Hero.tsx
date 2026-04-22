import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useSiteSettings } from '../contexts/SiteSettingsContext';

export default function Hero() {
  const { siteSettings } = useSiteSettings();

  return (
    <section id="home" className="section-shell section-shell--hero hero-cardless">
      <div className="section-frame hero-cardless-frame">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
          className="hero-cardless-content"
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
      </div>
    </section>
  );
}
