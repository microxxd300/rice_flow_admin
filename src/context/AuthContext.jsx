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

  return (
    <AuthContext.Provider value={{
      token, user, login, logout,
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
