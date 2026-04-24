import { motion } from 'framer-motion';
import InteractivePlane from './InteractivePlane';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import { getSiteIcon } from '../utils/siteIcons';

export default function ClinicalPractice() {
  const { siteSettings } = useSiteSettings();

  return (
    <section className="section-shell">
      <div id="services" className="section-frame gap-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-120px' }}
          transition={{ duration: 0.6 }}
          className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] xl:items-end"
        >
          <div className="space-y-5">
            <span className="display-pretitle">{siteSettings.services.eyebrow}</span>
            <h2 className="display-title section-title-lock">{siteSettings.services.headline}</h2>
          </div>

          <div className="story-card story-card--profile min-h-[12rem]">
            <p className="story-body">{siteSettings.services.intro}</p>
          </div>
        </motion.div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.98fr)_minmax(0,1.02fr)] xl:items-start">
          <InteractivePlane className="group">
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-120px' }}
              transition={{ duration: 0.58 }}
              className="profile-panel profile-panel--dark"
            >
              <div className="space-y-4">
                <p className="caption-meta">{siteSettings.services.featuredEyebrow}</p>
                <h3 className="story-title profile-title-lock">{siteSettings.services.featuredTitle}</h3>
                <p className="story-body">{siteSettings.services.featuredDescription}</p>
              </div>

              <div className="grid gap-3">
                {siteSettings.services.benefits.map((benefit) => (
                  <div key={benefit} className="profile-panel__fact">
                    <p className="text-sm leading-7">{benefit}</p>
                  </div>
                ))}
              </div>

              <div className="profile-panel__fact profile-panel__fact--stacked">
                <p className="utility-label">{siteSettings.services.toneEyebrow}</p>
                <h4 className="mt-3 font-heading text-[1.95rem] font-semibold leading-tight">
                  {siteSettings.services.toneHeadline}
                </h4>
                <p className="mt-3 text-sm leading-7">{siteSettings.services.toneDescription}</p>
              </div>
            </motion.article>
          </InteractivePlane>

          <div className="grid gap-4 md:grid-cols-2">
            {siteSettings.services.practiceCards.map((item, index) => {
              const Icon = getSiteIcon(item.icon);

              return (
                <InteractivePlane key={item.title} className="group h-full">
                  <motion.article
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-120px' }}
                    transition={{ duration: 0.42, delay: index * 0.05 }}
                    className="proof-card proof-card--tall h-full"
                  >
                    <div className="feature-card__icon">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="feature-card__title">{item.title}</h3>
                      <p className="feature-card__body">{item.description}</p>
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
