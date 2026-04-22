import { motion } from 'framer-motion';
import { BookMarked, LockKeyhole, Route, ShieldCheck } from 'lucide-react';
import InteractivePlane from './InteractivePlane';
import { useSiteSettings } from '../contexts/SiteSettingsContext';

export default function Ethos() {
  const { siteSettings } = useSiteSettings();

  const proofCards = [
    {
      title: siteSettings.ethos.trustTitle,
      description: siteSettings.ethos.trustDescription,
      icon: LockKeyhole,
    },
    {
      title: siteSettings.ethos.privacyTitle,
      description: siteSettings.ethos.privacyDescription,
      icon: ShieldCheck,
    },
    {
      title: siteSettings.ethos.progressTitle,
      description: siteSettings.ethos.progressDescription,
      icon: Route,
    },
  ];

  return (
    <section className="section-shell section-shell--airy">
      <div className="section-divider" />
      <div id="profile" className="section-frame gap-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-120px' }}
          transition={{ duration: 0.6 }}
          className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] xl:items-start"
        >
          <div className="space-y-5">
            <span className="display-pretitle">{siteSettings.ethos.eyebrow}</span>
            <h2 className="display-title section-title-lock">{siteSettings.ethos.headline}</h2>
          </div>

          <div className="story-card story-card--profile min-h-[12rem]">
            <p className="story-body">{siteSettings.ethos.intro}</p>
          </div>
        </motion.div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] xl:items-start">
          <InteractivePlane className="group">
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-120px' }}
              transition={{ duration: 0.58 }}
              className="profile-panel"
            >
              <div className="space-y-4">
                <p className="caption-meta">{siteSettings.ethos.panelEyebrow}</p>
                <h3 className="story-title profile-title-lock">{siteSettings.ethos.panelHeadline}</h3>
                <p className="story-body">{siteSettings.ethos.panelDescription}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="profile-panel__fact">
                  <p className="utility-label">{siteSettings.ethos.settingLabel}</p>
                  <p className="mt-3 font-heading text-[1.6rem] font-semibold leading-tight text-[rgb(var(--theme-text-rgb))]">
                    {siteSettings.ethos.settingValue}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-[rgb(var(--theme-muted-rgb))]">
                    {siteSettings.ethos.settingDescription}
                  </p>
                </div>

                <div className="profile-panel__fact">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgb(var(--theme-primary-rgb)/0.12)] text-[rgb(var(--theme-primary-rgb))]">
                    <BookMarked className="h-5 w-5" />
                  </div>
                  <p className="utility-label">{siteSettings.ethos.approachLabel}</p>
                  <p className="mt-3 font-heading text-[1.6rem] font-semibold leading-tight text-[rgb(var(--theme-text-rgb))]">
                    {siteSettings.ethos.approachValue}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-[rgb(var(--theme-muted-rgb))]">
                    {siteSettings.ethos.approachDescription}
                  </p>
                </div>
              </div>
            </motion.article>
          </InteractivePlane>

          <div className="grid gap-4">
            {proofCards.map((item, index) => {
              const Icon = item.icon;

              return (
                <InteractivePlane key={item.title} className="group h-full">
                  <motion.article
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-120px' }}
                    transition={{ duration: 0.44, delay: index * 0.05 }}
                    className="proof-card h-full"
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
