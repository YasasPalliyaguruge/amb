import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Smartphone, ArrowRight, ShieldCheck } from 'lucide-react';
import type { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import { useSiteSettings } from '../contexts/SiteSettingsContext';

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
  }
}

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMethod = 'select' | 'phone_start' | 'phone_verify';

function formatPhoneForFirebase(phoneNumber: string) {
  const compactPhone = phoneNumber.trim().replace(/[\s().-]/g, '');

  if (compactPhone.startsWith('+940')) {
    return `+94${compactPhone.substring(4)}`;
  }

  if (compactPhone.startsWith('0')) {
    return `+94${compactPhone.substring(1)}`;
  }

  if (compactPhone.startsWith('940')) {
    return `+94${compactPhone.substring(3)}`;
  }

  if (!compactPhone.startsWith('+')) {
    return `+${compactPhone}`;
  }

  return compactPhone;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { signInWithGoogle } = useAuth();
  const { siteSettings } = useSiteSettings();
  const copy = siteSettings.loginModal;
  const [method, setMethod] = useState<AuthMethod>('select');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useModalFocusTrap({
    isOpen,
    modalRef: dialogRef,
    initialFocusRef: closeButtonRef,
    onEscape: onClose,
  });

  useEffect(() => {
    if (isOpen) {
      setMethod('select');
      setPhoneNumber('');
      setOtp('');
      setConfirmationResult(null);
    }
  }, [isOpen]);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      if (method === 'phone_start' && !window.recaptchaVerifier) {
        try {
          const [{ RecaptchaVerifier }, { auth }] = await Promise.all([
            import('firebase/auth'),
            import('../firebase-auth'),
          ]);

          if (!isMounted || window.recaptchaVerifier) {
            return;
          }

          window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            size: 'invisible',
            callback: () => undefined,
          });
        } catch (err) {
          console.error('Recaptcha init failed', err);
        }
      }
    })();

    return () => {
      isMounted = false;
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = undefined;
      }
    };
  }, [method, isOpen]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle({
        successMessage: copy.googleSuccessToast,
        errorMessage: copy.googleFailureFallback,
      });
      onClose();
    } catch {
      // Context already handles toast messaging.
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!phoneNumber) return toast.error(copy.phoneRequiredError);

    const formattedPhone = formatPhoneForFirebase(phoneNumber);

    setLoading(true);
    try {
      const appVerifier = window.recaptchaVerifier;
      if (!appVerifier) throw new Error(copy.recaptchaError);

      const [{ signInWithPhoneNumber }, { auth }] = await Promise.all([
        import('firebase/auth'),
        import('../firebase-auth'),
      ]);

      const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(result);
      setMethod('phone_verify');
      toast.success(copy.verificationSentToast);
    } catch (err: any) {
      console.error('SMS Send Error:', err);
      toast.error(err.message || copy.smsFailureFallback);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!otp || !confirmationResult) return toast.error(copy.otpRequiredError);

    setLoading(true);
    try {
      await confirmationResult.confirm(otp);
      toast.success(copy.otpSuccessToast);
      onClose();
    } catch (err: any) {
      console.error('OTP Verify Error:', err);
      toast.error(copy.invalidOtpError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-[rgb(var(--theme-ink-rgb)/0.36)] backdrop-blur-sm"
          />

          <motion.div
            ref={dialogRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 p-4 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-modal-title"
            aria-describedby="login-modal-description"
            tabIndex={-1}
          >
            <div className="theme-panel relative max-h-[88vh] overflow-y-auto px-7 py-8 sm:px-8">
              <div className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,rgb(var(--theme-primary-rgb)),rgb(var(--theme-secondary-rgb)),rgb(var(--theme-accent-rgb)))]" />

              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  onClose();
                }}
                className="absolute right-5 top-5 rounded-full border border-[rgb(var(--theme-line-rgb)/0.25)] bg-[rgb(var(--theme-surface-rgb)/0.84)] p-2 text-[rgb(var(--theme-text-rgb)/0.84)] transition hover:text-[rgb(var(--theme-text-rgb))]"
                aria-label={copy.closeAriaLabel}
              >
                <X className="h-4 w-4" />
              </button>

              <div className="mb-8 mt-2 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[rgb(var(--theme-primary-rgb)/0.12)] text-[rgb(var(--theme-primary-rgb))]">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <h2 id="login-modal-title" className="font-heading text-3xl font-semibold text-[rgb(var(--theme-text-rgb))]">{copy.title}</h2>
                <p id="login-modal-description" className="mt-2 text-sm text-[rgb(var(--theme-muted-rgb))]">
                  {method === 'select' && copy.selectDescription}
                  {method === 'phone_start' && copy.phoneStartDescription}
                  {method === 'phone_verify' && copy.phoneVerifyDescription}
                </p>
              </div>

              <div id="recaptcha-container" />

              {method === 'select' && (
                <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="theme-button-secondary w-full rounded-[calc(var(--theme-radius-md)+0.1rem)] py-3.5"
                  >
                  <img
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                    alt=""
                    width={20}
                    height={20}
                    aria-hidden="true"
                    className="h-5 w-5"
                  />
                    {copy.googleCtaLabel}
                  </button>

                  <div className="relative flex items-center py-3">
                    <div className="flex-grow border-t border-[rgb(var(--theme-line-rgb)/0.3)]" />
                    <span className="mx-4 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[rgb(var(--theme-muted-rgb))]">{copy.dividerLabel}</span>
                    <div className="flex-grow border-t border-[rgb(var(--theme-line-rgb)/0.3)]" />
                  </div>

                  <button
                    onClick={() => setMethod('phone_start')}
                    disabled={loading}
                    className="theme-button-primary w-full rounded-[calc(var(--theme-radius-md)+0.1rem)] py-3.5"
                  >
                    <Smartphone className="h-5 w-5" />
                    {copy.phoneCtaLabel}
                  </button>
                </motion.div>
              )}

              {method === 'phone_start' && (
                <motion.form
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  onSubmit={handleSendOtp}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <label htmlFor="login-phone-number" className="text-xs font-semibold uppercase tracking-[0.22em] text-[rgb(var(--theme-muted-rgb))]">{copy.phoneNumberLabel}</label>
                    <input
                      id="login-phone-number"
                      name="phone"
                      type="tel"
                      value={phoneNumber}
                      onChange={(event) => setPhoneNumber(event.target.value)}
                      placeholder={copy.phonePlaceholder}
                      autoComplete="tel"
                      autoFocus
                      className="theme-input"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || phoneNumber.length < 9}
                    className="theme-button-primary w-full rounded-[calc(var(--theme-radius-md)+0.1rem)] py-3.5 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? copy.sendingLabel : copy.sendCodeLabel}
                    {!loading && <ArrowRight className="h-4 w-4" />}
                  </button>

                  <button type="button" onClick={() => setMethod('select')} className="theme-button-ghost mx-auto">
                    {copy.backOptionsLabel}
                  </button>
                </motion.form>
              )}

              {method === 'phone_verify' && (
                <motion.form
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  onSubmit={handleVerifyOtp}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <label htmlFor="login-verification-code" className="text-xs font-semibold uppercase tracking-[0.22em] text-[rgb(var(--theme-muted-rgb))]">{copy.otpLabel}</label>
                    <input
                      id="login-verification-code"
                      name="one-time-code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={otp}
                      onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
                      placeholder={copy.otpPlaceholder}
                      autoComplete="one-time-code"
                      autoFocus
                      className="theme-input text-center text-xl font-bold tracking-[0.45em]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="theme-button-primary w-full rounded-[calc(var(--theme-radius-md)+0.1rem)] py-3.5 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? copy.verifyingLabel : copy.verifyCtaLabel}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMethod('phone_start');
                      setOtp('');
                    }}
                    className="theme-button-ghost mx-auto"
                  >
                    {copy.wrongNumberLabel}
                  </button>
                </motion.form>
              )}

              <div className="mt-6 border-t border-[rgb(var(--theme-line-rgb)/0.2)] pt-4 text-center">
                <p className="text-xs text-[rgb(var(--theme-muted-rgb))]">
                  {copy.portalAgreement}
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
