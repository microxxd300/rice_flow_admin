import { describe, expect, it } from 'vitest';
import { ROLE, allowedRoutes, canAccess, roleOf } from './permissions';

describe('roleOf', () => {
  it('maps superusers to admin and staff to agriculturist', () => {
    expect(roleOf({ is_superuser: true, is_staff: true })).toBe(ROLE.ADMIN);
    expect(roleOf({ is_superuser: false, is_staff: true })).toBe(ROLE.AGRICULTURIST);
  });

  it('returns null without a user', () => {
    expect(roleOf(null)).toBeNull();
  });
});

describe('canAccess', () => {
  it('lets admins open account management and imports', () => {
    expect(canAccess(ROLE.ADMIN, '/users')).toBe(true);
    expect(canAccess(ROLE.ADMIN, '/import')).toBe(true);
  });

  it('keeps agriculturists out of users, rules, and import', () => {
    for (const path of ['/users', '/rules', '/import']) {
      expect(canAccess(ROLE.AGRICULTURIST, path)).toBe(false);
    }
    expect(canAccess(ROLE.AGRICULTURIST, '/farms')).toBe(true);
  });

  it('denies unknown roles everything', () => {
    expect(canAccess('guest', '/')).toBe(false);
    expect(allowedRoutes(undefined)).toEqual([]);
  });
});
