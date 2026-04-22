import { motion } from 'framer-motion';
import InteractivePlane from './InteractivePlane';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import { getSiteIcon } from '../utils/siteIcons';

export default function ConsultationExperience() {
  const { siteSettings } = useSiteSettings();
  const featureImage = siteSettings.media.consultationFeatureUrl;

  return (
    <section className="section-shell section-shell--airy">
      <div id="consultation-experience" className="section-frame gap-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-120px' }}
          transition={{ duration: 0.6 }}
          className="consultation-experience__intro"
        >
          <div className="space-y-5">
            <span className="display-pretitle">{siteSettings.consultationExperience.eyebrow}</span>
            <h2 className="display-title section-title-lock">{siteSettings.consultationExperience.headline}</h2>
          </div>

          <div className="story-card story-card--profile consultation-experience__summary">
            <p className="story-body">{siteSettings.consultationExperience.description}</p>
          </div>
        </motion.div>

        <div className="consultation-experience__body">
          <InteractivePlane className="group h-full">
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-120px' }}
              transition={{ duration: 0.58 }}
              className="profile-panel profile-panel--dark consultation-experience__feature"
            >
              {featureImage ? (
                <div className="overflow-hidden rounded-[calc(var(--theme-radius-xl)-0.3rem)] border border-white/10">
                  <img
                    src={featureImage}
                    alt={siteSettings.consultationExperience.featureAlt}
                    width={960}
                    height={600}
                    className="aspect-[16/10] w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              ) : null}
              <div className="space-y-4">
                <p className="caption-meta text-white/50">{siteSettings.consultationExperience.outcomeLabel}</p>
                <h3 className="story-title profile-title-lock text-white">{siteSettings.consultationExperience.outcomeHeadline}</h3>
                <p className="story-body text-white/72">{siteSettings.consultationExperience.outcomeDescription}</p>
              </div>

              <div className="grid gap-3">
                {siteSettings.consultationExperience.factCards.map((fact) => (
                  <div key={fact} className="profile-panel__fact border-white/10 bg-white/7 text-white/74">
                    <p className="text-sm leading-7">{fact}</p>
                  </div>
                ))}
              </div>
            </motion.article>
          </InteractivePlane>

          <div className="consultation-experience__steps">
            {siteSettings.consultationExperience.steps.map((step, index) => {
              const Icon = getSiteIcon(step.icon);

              return (
                <InteractivePlane key={step.title} className="group h-full">
                  <motion.article
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-120px' }}
                    transition={{ duration: 0.42, delay: index * 0.05 }}
                    className="proof-card consultation-experience__step-card"
                  >
                    <div className="feature-card__icon">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-2">
                      <p className="utility-label">
                        {siteSettings.consultationExperience.stepLabelPrefix} {String(index + 1).padStart(2, '0')}
                      </p>
                      <h3 className="feature-card__title">{step.title}</h3>
                      <p className="feature-card__body">{step.description}</p>
                    </div>
                  </motion.article>
                </InteractivePlane>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
