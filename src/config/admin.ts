export const BOOTSTRAP_ADMIN_EMAIL = 'yasaspalliyaguruge@gmail.com';

export function isBootstrapAdminEmail(email: string | null | undefined, emailVerified: boolean | null | undefined): boolean {
  return Boolean(emailVerified && email && email.trim().toLowerCase() === BOOTSTRAP_ADMIN_EMAIL);
}
