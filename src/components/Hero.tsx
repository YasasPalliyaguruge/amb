import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useSiteSettings } from '../contexts/SiteSettingsContext';

export default function Hero() {
  const { siteSettings } = useSiteSettings();
  const hasSupportNote = Boolean(siteSettings.hero.supportNote.trim());

  return (
    <section id="home" className="section-shell section-shell--hero hero-cardless">
      <div className="section-frame hero-cardless-frame">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
          className="hero-cardless-layout"
        >
          <div className="hero-cardless-content">
            <div className="hero-cardless-copy">
              <span className="display-pretitle">{siteSettings.hero.eyebrow}</span>
              <div className="hero-cardless-heading">
                <div className="hero-cardless-identity">
                  <p className="caption-meta hero-cardless-name">{siteSettings.branding.practitionerName}</p>
                  <span aria-hidden="true" />
                </div>
                <h1 className="display-hero hero-display-lock">{siteSettings.hero.headline}</h1>
              </div>
              <p className="display-lead hero-copy-lock">{siteSettings.hero.description}</p>
            </div>

            <div className="hero-cardless-actions">
              <a href={siteSettings.hero.secondaryCtaHref} className="theme-button-primary hero-primary-cta">
                {siteSettings.hero.secondaryCtaLabel}
                <ArrowRight className="h-4 w-4" />
              </a>
              <a href={siteSettings.hero.primaryCtaHref} className="theme-button-secondary hero-secondary-cta">
                {siteSettings.hero.primaryCtaLabel}
              </a>
            </div>

            {siteSettings.hero.badges.length > 0 && (
              <div className="hero-cardless-proof-strip">
                {siteSettings.hero.badges.map((badge, index) => (
                  <span key={`${badge}-${index}`} className="hero-cardless-proof-item">{badge}</span>
                ))}
              </div>
            )}

            {hasSupportNote && (
              <p className="hero-cardless-support-note">{siteSettings.hero.supportNote}</p>
            )}
          </div>

          <div className="hero-cardless-visual-anchor" aria-hidden="true">
            <span className="hero-cardless-guide hero-cardless-guide--vertical" />
            <span className="hero-cardless-guide hero-cardless-guide--baseline" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
