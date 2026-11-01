import { describe, expect, it } from 'vitest';
import { ROLE, allowedRoutes, canAccess, isAdmin, roleOf } from './permissions';

describe('roleOf', () => {
  it('maps superusers to admin and staff to validator', () => {
    expect(roleOf({ is_superuser: true, is_staff: true })).toBe(ROLE.ADMIN);
    expect(roleOf({ is_superuser: false, is_staff: true })).toBe(ROLE.VALIDATOR);
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

  it('keeps validators out of users and import', () => {
    for (const path of ['/users', '/import']) {
      expect(canAccess(ROLE.VALIDATOR, path)).toBe(false);
    }
  });

  it('lets validators view the agronomic pages, rules included', () => {
    for (const path of ['/', '/map', '/farms', '/datasets', '/rules']) {
      expect(canAccess(ROLE.VALIDATOR, path)).toBe(true);
    }
  });

  it('has no AI knowledge page any more', () => {
    expect(canAccess(ROLE.ADMIN, '/knowledge')).toBe(false);
  });

  it('only the admin gets admin-only actions', () => {
    expect(isAdmin(ROLE.ADMIN)).toBe(true);
    expect(isAdmin(ROLE.VALIDATOR)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });

  it('denies unknown roles everything', () => {
    expect(canAccess('guest', '/')).toBe(false);
    expect(allowedRoutes(undefined)).toEqual([]);
  });
});
