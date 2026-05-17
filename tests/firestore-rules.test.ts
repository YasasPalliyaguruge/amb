import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const rules = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8');

describe('firestore rules hardening', () => {
  it('keeps rules comments and source ascii-clean', () => {
    expect(rules).not.toContain('â');
  });

  it('allows same-day client reschedules where slot count stays stable', () => {
    expect(rules).toContain('request.resource.data.slots.size() == resource.data.slots.size()');
  });

  it('keeps appointment identity fields immutable for client updates', () => {
    expect(rules).toContain('function preservesAppointmentIdentity()');
    expect(rules).toContain('request.resource.data.clientId == resource.data.clientId');
    expect(rules).toContain('request.resource.data.serviceType == resource.data.serviceType');
    expect(rules).toContain("request.resource.data.get('onlineSession', null) == resource.data.get('onlineSession', null)");
  });

  it('validates optional online session metadata on appointments', () => {
    expect(rules).toContain('function hasValidOnlineSessionFields(data)');
    expect(rules).toContain("data.provider == 'zoom'");
    expect(rules).toContain("data.provider == 'teams'");
    expect(rules).toContain("value.matches('https://.*')");
  });
});
