/*
  Role definitions for the admin console.

  Roles are derived from the Django flags already on the user — no new model
  field or migration is involved:

      is_superuser  -> 'admin'          full access
      is_staff      -> 'agriculturist'  agronomic work only

  IMPORTANT: this file controls what the UI *shows*. It is not a security
  boundary. Every endpoint still has to enforce the same rules server-side,
  because hiding a nav item does not stop anyone calling the API directly.
  See the note in the README / hand-off before relying on this for anything
  sensitive.
*/

export const ROLE = {
  ADMIN:         'admin',
  AGRICULTURIST: 'agriculturist',
};

export const ROLE_LABEL = {
  [ROLE.ADMIN]:         'Administrator',
  [ROLE.AGRICULTURIST]: 'Agriculturist',
};

/** Map a user object from the API onto a role. */
export function roleOf(user) {
  if (!user) return null;
  return user.is_superuser ? ROLE.ADMIN : ROLE.AGRICULTURIST;
}

/*
  Routes each role may open. The agriculturist gets everything agronomic —
  the farms, the crop cycles, the varieties and the dashboard that summarises
  them — but not account management, bulk data import, or the suitability
  rules that define the validated RSI model.
*/
const ROUTES = {
  [ROLE.ADMIN]: [
    '/', '/map', '/farms', '/users', '/datasets', '/rules', '/import',
  ],
  [ROLE.AGRICULTURIST]: [
    '/', '/map', '/farms', '/datasets',
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
