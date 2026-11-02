/*
  Role definitions for the admin console.

  Roles are derived from the Django flags already on the user — no new model
  field or migration is involved:

      is_superuser  -> 'admin'      full access (the developers)
      is_staff      -> 'validator'  the agriculturist engineer: views the
                                    agronomic data and corrects varieties

  IMPORTANT: this file controls what the UI *shows*. It is not a security
  boundary. Every endpoint still has to enforce the same rules server-side,
  because hiding a nav item does not stop anyone calling the API directly.
  See the note in the README / hand-off before relying on this for anything
  sensitive.
*/

export const ROLE = {
  ADMIN:     'admin',
  VALIDATOR: 'validator',
};

export const ROLE_LABEL = {
  [ROLE.ADMIN]:     'Administrator',
  [ROLE.VALIDATOR]: 'Validator',
};

/** Map a user object from the API onto a role. */
export function roleOf(user) {
  if (!user) return null;
  return user.is_superuser ? ROLE.ADMIN : ROLE.VALIDATOR;
}

/** Only the admin manages accounts, deletes records, imports data and changes
    the suitability rules. The backend enforces the same split. */
export function isAdmin(role) {
  return role === ROLE.ADMIN;
}

/*
  Routes each role may open. The validator sees everything agronomic — the
  dashboard, farms, crop cycles, varieties and the suitability rules (view only,
  so the validated RSI model is checked but not changed) — but not account
  management, bulk data import, or the change log of what was edited.
*/
const ROUTES = {
  [ROLE.ADMIN]: [
    '/', '/map', '/farms', '/users', '/datasets', '/rules', '/import', '/changes',
  ],
  [ROLE.VALIDATOR]: [
    '/', '/map', '/farms', '/datasets', '/rules',
  ],
};

/** Can this role open this path? */
export function canAccess(role, path) {
  return (ROUTES[role] ?? []).includes(path);
}

/** Where to send someone who lands somewhere they may not go. */
export const HOME_PATH = '/';

export function allowedRoutes(role) {
  return ROUTES[role] ?? [];
}
