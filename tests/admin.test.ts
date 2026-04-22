import { describe, expect, it } from 'vitest';
import { BOOTSTRAP_ADMIN_EMAIL, isBootstrapAdminEmail } from '../src/config/admin';

describe('admin bootstrap helpers', () => {
  it('accepts the configured bootstrap admin email when verified', () => {
    expect(isBootstrapAdminEmail(BOOTSTRAP_ADMIN_EMAIL, true)).toBe(true);
  });

  it('normalizes whitespace and casing before comparison', () => {
    expect(isBootstrapAdminEmail(`  ${BOOTSTRAP_ADMIN_EMAIL.toUpperCase()}  `, true)).toBe(true);
  });

  it('rejects unverified bootstrap admin email', () => {
    expect(isBootstrapAdminEmail(BOOTSTRAP_ADMIN_EMAIL, false)).toBe(false);
  });

  it('rejects a different email even when verified', () => {
    expect(isBootstrapAdminEmail('someone@example.com', true)).toBe(false);
  });
});
