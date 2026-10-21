import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import { roleOf } from '../permissions';

const AuthContext = createContext(null);

function clearStoredSession() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_refresh');
  localStorage.removeItem('admin_user');
  api.invalidate();
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('admin_token'));
  const [user,  setUser]  = useState(() => {
    try { return JSON.parse(localStorage.getItem('admin_user') || 'null'); } catch { return null; }
  });
  // A saved session is only trusted after the server confirms it (see the effect below)
  const [checking, setChecking] = useState(() => !!localStorage.getItem('admin_token'));

  const login = async (email, password) => {
    const data = await api.login(email, password);
    if (!data.user?.is_staff) throw new Error('Admin access only.');
    localStorage.setItem('admin_token',   data.access_token);
    localStorage.setItem('admin_refresh', data.refresh_token);
    localStorage.setItem('admin_user',    JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
  };

  const logout = () => {
    // Revoke the refresh token server-side; don't make the user wait for it
    const refresh = localStorage.getItem('admin_refresh');
    if (refresh) api.logout(refresh).catch(() => {});
    clearStoredSession();
    setToken(null);
    setUser(null);
  };

  // The API client fires this when a refresh fails (session expired or revoked)
  useEffect(() => {
    const onExpired = () => {
      clearStoredSession();
      setToken(null);
      setUser(null);
    };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  // On startup, confirm the saved session with the server. The API client renews an
  // expired access token on its own; if the session can't be renewed it fires
  // 'auth:expired' and the login page shows. A network error keeps the session, so a
  // backend that is still starting doesn't log anyone out.
  useEffect(() => {
    if (!localStorage.getItem('admin_token')) return;
    let cancelled = false;
    api.profile()
      .then(profile => {
        if (cancelled) return;
        if (!profile?.is_staff) {
          clearStoredSession();
          setToken(null);
          setUser(null);
          return;
        }
        localStorage.setItem('admin_user', JSON.stringify(profile));
        setToken(localStorage.getItem('admin_token'));
        setUser(profile);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <AuthContext.Provider value={{
      token, user, login, logout, checking,
      isAuthenticated: !!token,
      role: roleOf(user),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- the hook belongs with its provider
export function useAuth() {
  return useContext(AuthContext);
}
