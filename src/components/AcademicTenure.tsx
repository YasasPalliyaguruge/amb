import { motion } from 'framer-motion';
import { BriefcaseBusiness, GraduationCap } from 'lucide-react';
import InteractivePlane from './InteractivePlane';
import { useSiteSettings } from '../contexts/SiteSettingsContext';

export default function AcademicTenure() {
  const { siteSettings } = useSiteSettings();

  return (
    <section className="section-shell section-shell--airy">
      <div id="academic-tenure" className="section-frame gap-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-120px' }}
          transition={{ duration: 0.6 }}
          className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] xl:items-end"
        >
          <div className="space-y-5">
            <span className="display-pretitle">{siteSettings.credentials.eyebrow}</span>
            <h2 className="display-title section-title-lock">{siteSettings.credentials.headline}</h2>
          </div>

          <div className="story-card story-card--profile min-h-[12rem]">
            <p className="story-body">{siteSettings.credentials.intro}</p>
          </div>
        </motion.div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] xl:items-start">
          <InteractivePlane className="group">
            <motion.aside
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-120px' }}
              transition={{ duration: 0.58 }}
              className="profile-panel"
            >
              <div className="space-y-4">
                <p className="caption-meta">{siteSettings.credentials.railEyebrow}</p>
                <h3 className="story-title profile-title-lock">{siteSettings.credentials.railHeadline}</h3>
                <p className="story-body">{siteSettings.credentials.railDescription}</p>
              </div>

              <div className="grid gap-3">
                {siteSettings.credentials.highlights.map((highlight) => (
                  <div key={highlight} className="profile-panel__fact py-4">
                    <p className="text-sm leading-7 text-[rgb(var(--theme-text-rgb)/0.88)]">{highlight}</p>
                  </div>
                ))}
              </div>
            </motion.aside>
          </InteractivePlane>

          <div className="credentials-columns">
            <div className="cards-stack cards-stack--timeline credentials-stack">
              <div className="section-rail credentials-rail">
                <div className="section-rail__icon">
                  <BriefcaseBusiness className="h-4 w-4" />
                </div>
                <div>
                  <p className="utility-label text-[rgb(var(--theme-primary-rgb))]">{siteSettings.credentials.professionalRailLabel}</p>
                  <p className="text-sm text-[rgb(var(--theme-muted-rgb))]">{siteSettings.credentials.professionalRailDescription}</p>
                </div>
              </div>

              {siteSettings.credentials.professionalRoles.map((item, index) => (
                <InteractivePlane key={`${item.title}-${item.period}`} className="group credentials-card-plane">
                  <motion.article
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-120px' }}
                    transition={{ duration: 0.42, delay: index * 0.05 }}
                    className="proof-card proof-card--tall credentials-card"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="utility-label text-[rgb(var(--theme-primary-rgb))]">{siteSettings.credentials.roleLabel}</p>
                        <span className="text-xs text-[rgb(var(--theme-muted-rgb))]">{item.period}</span>
                      </div>
                      <h3 className="timeline-card__title">{item.title}</h3>
                      <p className="text-sm font-semibold text-[rgb(var(--theme-text-rgb))]">{item.institution}</p>
                      <p className="timeline-card__body">{item.description}</p>
                    </div>
                  </motion.article>
                </InteractivePlane>
              ))}
            </div>

            <div className="cards-stack cards-stack--timeline credentials-stack">
              <div className="section-rail credentials-rail">
                <div className="section-rail__icon">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <div>
                  <p className="utility-label text-[rgb(var(--theme-primary-rgb))]">{siteSettings.credentials.educationRailLabel}</p>
                  <p className="text-sm text-[rgb(var(--theme-muted-rgb))]">{siteSettings.credentials.educationRailDescription}</p>
                </div>
              </div>

              {siteSettings.credentials.educationTimeline.map((item, index) => (
                <InteractivePlane key={`${item.title}-${item.period}`} className="group credentials-card-plane">
                  <motion.article
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-120px' }}
                    transition={{ duration: 0.42, delay: index * 0.05 }}
                    className="proof-card proof-card--tall credentials-card"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="utility-label text-[rgb(var(--theme-primary-rgb))]">{siteSettings.credentials.studyLabel}</p>
                        <span className="text-xs text-[rgb(var(--theme-muted-rgb))]">{item.period}</span>
                      </div>
                      <h3 className="timeline-card__title">{item.title}</h3>
                      <p className="text-sm font-semibold text-[rgb(var(--theme-text-rgb))]">{item.institution}</p>
                      <p className="timeline-card__body">{item.description}</p>
                    </div>
                  </motion.article>
                </InteractivePlane>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
