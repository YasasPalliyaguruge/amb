import { type MouseEvent, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import { LogOut, Menu, User as UserIcon, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { homepageSectionMeta } from '../siteSettings/siteSettings';

interface NavbarProps {
  onLoginClick: () => void;
}

export default function Navbar({ onLoginClick }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, role, profile, logout } = useAuth();
  const { siteSettings } = useSiteSettings();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navLinks = siteSettings.homepage.sectionOrder
    .filter((sectionId) => siteSettings.homepage.visibility[sectionId])
    .map((sectionId) => ({
      name: siteSettings.homepage.labels[sectionId] || homepageSectionMeta[sectionId].label,
      href: homepageSectionMeta[sectionId].href,
    }));
  const displayName = profile?.name || user?.displayName || siteSettings.branding.userFallbackLabel;
  const displayContact = profile?.email || user?.email || profile?.phone || user?.phoneNumber || '';
  const displayFirstName = displayName.split(' ')[0] || siteSettings.branding.userFallbackLabel;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const scrollToSectionContent = (href: string) => {
    if (!href.startsWith('/#')) {
      return false;
    }

    const hash = href.slice(1);

    if (hash === '#home') {
      window.history.pushState(null, '', href);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return true;
    }

    const section = document.querySelector<HTMLElement>(hash);

    if (!section) {
      return false;
    }

    const contentTarget =
      section.querySelector<HTMLElement>('.section-frame') ||
      section.querySelector<HTMLElement>('.booking-shell') ||
      section;
    const getTargetTop = () => {
      const navHeight = document.querySelector('nav')?.getBoundingClientRect().height ?? 84;
      const visualGap = window.innerWidth < 640 ? 10 : 10;

      return contentTarget.getBoundingClientRect().top + window.scrollY - navHeight - visualGap;
    };

    window.history.pushState(null, '', href);
    window.scrollTo({ top: Math.max(0, getTargetTop()), behavior: 'smooth' });
    [700, 1100].forEach((delay) => {
      window.setTimeout(() => {
        window.scrollTo({ top: Math.max(0, getTargetTop()), behavior: 'auto' });
      }, delay);
    });
    return true;
  };

  const handleNavLinkClick = (event?: MouseEvent<HTMLElement>, href?: string) => {
    if (event && href && scrollToSectionContent(href)) {
      event.preventDefault();
    }

    setMobileMenuOpen(false);
    setShowDropdown(false);
  };

  useEffect(() => {
    if (!window.location.hash || window.location.hash === '#home') {
      return;
    }

    const timeoutIds = [250, 900, 1600].map((delay) =>
      window.setTimeout(() => {
        scrollToSectionContent(`/${window.location.hash}`);
      }, delay)
    );

    return () => timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -90 }}
        animate={{ y: 0 }}
        className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
          scrolled
            ? 'py-3 bg-[rgb(var(--theme-surface-strong-rgb)/0.96)] shadow-[0_16px_46px_rgb(var(--theme-text-rgb)/0.12)] backdrop-blur-xl border-b border-[rgb(var(--theme-line-rgb)/0.12)]'
            : 'py-4 bg-[linear-gradient(180deg,rgb(var(--theme-surface-strong-rgb)/0.9),rgb(var(--theme-surface-rgb)/0.72))] backdrop-blur-xl border-b border-[rgb(var(--theme-line-rgb)/0.08)]'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <a
            href="/#home"
            onClick={(event) => handleNavLinkClick(event, '/#home')}
            className="public-nav-brand flex min-w-0 flex-col leading-none text-[rgb(var(--theme-text-rgb))]"
          >
            <span className="font-heading text-3xl font-semibold">{siteSettings.branding.wordmark}</span>
            <span className="public-nav-strapline mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.34em] text-[rgb(var(--theme-muted-rgb))]">
              {siteSettings.branding.strapline}
            </span>
          </a>

          <div className={`hidden items-center gap-1 px-3 py-2 lg:flex ${scrolled ? 'theme-panel-soft' : 'rounded-full border border-[rgb(var(--theme-line-rgb)/0.18)] bg-[rgb(var(--theme-surface-strong-rgb)/0.76)] shadow-[0_12px_30px_rgb(var(--theme-text-rgb)/0.08)] backdrop-blur-xl'}`}>
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(event) => handleNavLinkClick(event, link.href)}
                className="rounded-full px-4 py-2.5 text-sm font-semibold text-[rgb(var(--theme-text-rgb)/0.9)] transition hover:bg-[rgb(var(--theme-primary-rgb)/0.1)] hover:text-[rgb(var(--theme-primary-rgb))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--theme-primary-rgb)/0.28)]"
              >
                {link.name}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown((value) => !value)}
                  aria-expanded={showDropdown}
                  aria-haspopup="true"
                  aria-label={siteSettings.branding.userMenuAriaLabel}
                  className="theme-panel-soft flex items-center gap-2 py-1.5 pl-2 pr-4"
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={displayName}
                      className="h-8 w-8 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgb(var(--theme-primary-rgb)/0.12)] text-[rgb(var(--theme-primary-rgb))]">
                      <UserIcon className="h-4 w-4" />
                    </div>
                  )}
                  <span className="hidden text-sm font-semibold text-[rgb(var(--theme-text-rgb))] md:block">
                    {displayFirstName}
                  </span>
                </button>

                <AnimatePresence>
                  {showDropdown && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96, y: -8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96, y: -8 }}
                      transition={{ duration: 0.16 }}
                      className="theme-panel absolute right-0 mt-3 w-60 overflow-hidden"
                    >
                      <div className="border-b border-[rgb(var(--theme-line-rgb)/0.2)] px-5 py-4">
                        <p className="truncate text-sm font-semibold text-[rgb(var(--theme-text-rgb))]">{displayName}</p>
                        {displayContact && <p className="truncate text-xs text-[rgb(var(--theme-muted-rgb))]">{displayContact}</p>}
                      </div>
                      <Link
                        to="/client-dashboard"
                        onClick={handleNavLinkClick}
                        className="block px-5 py-3 text-sm font-medium text-[rgb(var(--theme-text-rgb)/0.84)] transition hover:bg-[rgb(var(--theme-primary-rgb)/0.08)] hover:text-[rgb(var(--theme-primary-rgb))]"
                      >
                        {siteSettings.branding.patientDashboardLabel}
                      </Link>
                      {role === 'admin' && (
                        <Link
                          to="/admin-dashboard"
                          onClick={handleNavLinkClick}
                          className="block px-5 py-3 text-sm font-medium text-[rgb(var(--theme-text-rgb)/0.84)] transition hover:bg-[rgb(var(--theme-primary-rgb)/0.08)] hover:text-[rgb(var(--theme-primary-rgb))]"
                        >
                          {siteSettings.branding.adminDashboardLabel}
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          logout({
                            successMessage: siteSettings.branding.signOutSuccessToast,
                            errorMessage: siteSettings.branding.signOutErrorToast,
                          });
                          setShowDropdown(false);
                        }}
                        className="flex w-full items-center gap-2 px-5 py-3 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50/70"
                      >
                        <LogOut className="h-4 w-4" />
                        {siteSettings.branding.signOutLabel}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button onClick={onLoginClick} className="theme-button-primary whitespace-nowrap px-4 py-2.5 sm:px-5 sm:py-3">
                {siteSettings.branding.signInLabel}
              </button>
            )}

            <div className="lg:hidden">
              <button
                className="theme-panel-soft p-2"
                onClick={() => setMobileMenuOpen((value) => !value)}
                aria-label={siteSettings.branding.toggleMenuAriaLabel}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-30 bg-[rgb(var(--theme-ink-rgb)/0.28)] backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 300 }}
              className="theme-panel fixed bottom-3 right-3 top-3 z-40 flex w-[calc(100vw_-_1.5rem)] max-w-[23rem] flex-col lg:hidden"
            >
              <div className="flex items-center justify-between border-b border-[rgb(var(--theme-line-rgb)/0.24)] p-6">
                <a
                  href="/#home"
                  className="flex flex-col leading-none text-[rgb(var(--theme-text-rgb))]"
                  onClick={(event) => handleNavLinkClick(event, '/#home')}
                >
                  <span className="font-heading text-3xl font-semibold">{siteSettings.branding.wordmark}</span>
                  <span className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.34em] text-[rgb(var(--theme-muted-rgb))]">
                    {siteSettings.branding.strapline}
                  </span>
                </a>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-full p-2 transition hover:bg-[rgb(var(--theme-primary-rgb)/0.08)]"
                  aria-label={siteSettings.branding.closeMenuAriaLabel}
                >
                  <X className="h-5 w-5 text-[rgb(var(--theme-text-rgb))]" />
                </button>
              </div>

              <nav className="flex-1 space-y-2 overflow-y-auto p-6">
                {navLinks.map((link, index) => (
                  <motion.a
                    key={link.name}
                    href={link.href}
                    onClick={(event) => handleNavLinkClick(event, link.href)}
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="block rounded-[calc(var(--theme-radius-md)+0.08rem)] px-4 py-3 text-base font-semibold text-[rgb(var(--theme-text-rgb)/0.82)] transition hover:bg-[rgb(var(--theme-primary-rgb)/0.08)] hover:text-[rgb(var(--theme-primary-rgb))]"
                  >
                    {link.name}
                  </motion.a>
                ))}
              </nav>

              <div className="space-y-3 border-t border-[rgb(var(--theme-line-rgb)/0.24)] p-6">
                {user ? (
                  <>
                    <div className="rounded-[calc(var(--theme-radius-md)+0.08rem)] bg-[rgb(var(--theme-surface-rgb)/0.68)] px-4 py-4">
                      <p className="truncate text-sm font-semibold text-[rgb(var(--theme-text-rgb))]">{displayName}</p>
                      {displayContact && <p className="truncate text-xs text-[rgb(var(--theme-muted-rgb))]">{displayContact}</p>}
                    </div>
                    <Link
                      to="/client-dashboard"
                      onClick={handleNavLinkClick}
                      className="theme-button-secondary w-full"
                    >
                      {siteSettings.branding.patientDashboardLabel}
                    </Link>
                    {role === 'admin' && (
                      <Link
                        to="/admin-dashboard"
                        onClick={handleNavLinkClick}
                        className="theme-button-secondary w-full"
                      >
                        {siteSettings.branding.adminDashboardLabel}
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        logout({
                          successMessage: siteSettings.branding.signOutSuccessToast,
                          errorMessage: siteSettings.branding.signOutErrorToast,
                        });
                        setMobileMenuOpen(false);
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
                    >
                      <LogOut className="h-4 w-4" />
                      {siteSettings.branding.signOutLabel}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="rounded-[calc(var(--theme-radius-md)+0.08rem)] border border-[rgb(var(--theme-line-rgb)/0.22)] bg-[rgb(var(--theme-primary-rgb)/0.06)] p-4 text-sm leading-6 text-[rgb(var(--theme-muted-rgb))]">
                      {siteSettings.branding.mobileSignInPrompt}
                    </div>
                    <button
                      onClick={() => {
                        onLoginClick();
                        setMobileMenuOpen(false);
                      }}
                      className="theme-button-primary w-full"
                    >
                      {siteSettings.branding.signInToContinueLabel}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
