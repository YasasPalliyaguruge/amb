import { motion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Mail, MapPin, Phone } from 'lucide-react';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import { homepageSectionMeta } from '../siteSettings/siteSettings';

export default function Footer() {
  const { siteSettings } = useSiteSettings();
  const year = new Date().getFullYear();
  const exploreLinks = siteSettings.homepage.sectionOrder
    .filter((sectionId) => siteSettings.homepage.visibility[sectionId])
    .map((sectionId) => ({
      label: siteSettings.homepage.labels[sectionId] || homepageSectionMeta[sectionId].label,
      href: homepageSectionMeta[sectionId].href,
    }));

  const footerLinks = [
    {
      title: siteSettings.footer.exploreColumnTitle,
      links: exploreLinks,
    },
    {
      title: siteSettings.footer.visitColumnTitle,
      links: [
        { label: siteSettings.footer.instagramLabel, href: siteSettings.footer.instagramUrl, external: true },
        {
          label: siteSettings.footer.organizationLabel,
          href: siteSettings.footer.organizationUrl,
          external: true,
        },
        {
          label: siteSettings.branding.contactEmail,
          href: `mailto:${siteSettings.branding.contactEmail}`,
          external: true,
        },
      ],
    },
  ]
    .map((column) => ({
      ...column,
      links: column.links.filter((link) => link.href.trim().length > 0),
    }))
    .filter((column) => column.links.length > 0);
  const affiliationLines = siteSettings.footer.affiliationLine
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const contactItems = [
    {
      icon: <Mail className="h-4 w-4" />,
      label: siteSettings.branding.contactEmail,
      href: `mailto:${siteSettings.branding.contactEmail}`,
    },
    {
      icon: <Phone className="h-4 w-4" />,
      label: siteSettings.branding.contactPhone,
      href: `tel:${siteSettings.branding.contactPhone}`,
    },
    {
      icon: <MapPin className="h-4 w-4" />,
      label: siteSettings.branding.location,
    },
  ].filter((item) => item.label.trim().length > 0);

  return (
    <footer className="section-shell section-shell--footer">
      <div className="footer-backdrop" />
      <div className="section-frame footer-shell">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.68 }}
          className="footer-cta-shell"
        >
          <div className="footer-cta-copy">
            <p className="footer-kicker">{siteSettings.footer.ctaEyebrow}</p>
            <h2 className="footer-heading">{siteSettings.footer.ctaHeadline}</h2>
            <p className="footer-copy">{siteSettings.footer.ctaDescription}</p>
          </div>

          <div className="footer-actions">
            <a href={siteSettings.footer.bookingCtaHref} className="theme-button-primary">
              {siteSettings.footer.bookingCtaLabel}
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href={siteSettings.footer.artCtaHref}
              target="_blank"
              rel="noreferrer"
              className="theme-button-secondary"
            >
              {siteSettings.footer.artCtaLabel}
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.68, delay: 0.05 }}
          className="footer-grid"
        >
          <div className="footer-card footer-card--brand">
            <div className="space-y-4">
              <span className="display-pretitle shadow-none">{siteSettings.branding.wordmark}</span>
              <p className="footer-summary">{siteSettings.footer.summary}</p>
              <div className="space-y-2">
                {affiliationLines.map((line) => (
                  <p key={line} className="footer-note">
                    {line}
                  </p>
                ))}
              </div>
            </div>

            <div className="footer-contact-list">
              {contactItems.map((item) => (
                item.href ? (
                  <a key={item.label} href={item.href} className="footer-contact-item">
                    <span className="footer-contact-icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </a>
                ) : (
                  <div key={item.label} className="footer-contact-item">
                    <span className="footer-contact-icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                )
              ))}
            </div>
          </div>

          {footerLinks.map((column) => (
            <div key={column.title} className="footer-card">
              <div className="space-y-5">
                <h4 className="footer-column-title">{column.title}</h4>
                <ul className="footer-link-list">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target={link.external ? '_blank' : undefined}
                      rel={link.external ? 'noreferrer' : undefined}
                      className="footer-link"
                    >
                      <span>{link.label}</span>
                      {link.external ? <ArrowUpRight className="h-3.5 w-3.5" /> : null}
                    </a>
                  </li>
                ))}
                </ul>
              </div>
            </div>
          ))}
        </motion.div>

        <div className="footer-meta">
          <p>{siteSettings.footer.copyrightPrefix} {year} {siteSettings.footer.copyrightName}. {siteSettings.footer.copyrightSuffix}</p>
          <p>{siteSettings.footer.closingLine}</p>
          <p>{siteSettings.footer.ethicsLine}</p>
        </div>
      </div>
    </footer>
  );
}
