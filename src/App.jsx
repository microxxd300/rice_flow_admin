import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import { api } from './services/api';
import { canAccess, HOME_PATH } from './permissions';
import { C } from './theme';
import './index.css';

/* Routes are split out of the main bundle so the first paint no longer waits
   on Leaflet, Recharts and all seven pages. The import functions are kept by
   name so they can also be PREFETCHED — without that, the first click on a
   route pays for its whole module graph, which is especially slow under the
   dev server where modules are served individually. */
const load = {
  dashboard:  () => import('./pages/Dashboard'),
  map:        () => import('./pages/FarmMap'),
  cycles:     () => import('./pages/FarmCycles'),
  users:      () => import('./pages/Users'),
  datasets:   () => import('./pages/Datasets'),
  imports:    () => import('./pages/Import'),
  rules:      () => import('./pages/Rules'),
};

const Dashboard  = lazy(load.dashboard);
const FarmMap    = lazy(load.map);
const FarmCycles = lazy(load.cycles);
const Users      = lazy(load.users);
const Datasets   = lazy(load.datasets);
const Import     = lazy(load.imports);
const Rules      = lazy(load.rules);

/* Once the shell is up and idle, pull every remaining route chunk and the data
   each page needs. By the time a nav item is clicked, both are already in
   memory, so switching pages renders immediately instead of loading. */
function usePrefetch(enabled) {
  useEffect(() => {
    if (!enabled) return;
    const idle = window.requestIdleCallback || (fn => setTimeout(fn, 400));
    const id = idle(() => {
      Object.values(load).forEach(fn => { fn().catch(() => {}); });
      api.warm();
    });
    return () => window.cancelIdleCallback?.(id);
  }, [enabled]);
}

/* Shown only while a route chunk is downloading — the pages render their own
   skeletons once mounted, so this stays deliberately quiet. */
function RouteFallback() {
  return <div style={{ minHeight: '100%', backgroundColor: C.background }} />;
}

/* Hiding a nav item is not enough — someone can still type the URL. Any route
   outside the role's list bounces back to the dashboard. */
function Guarded({ path, children }) {
  const { role } = useAuth();
  return canAccess(role, path) ? children : <Navigate to={HOME_PATH} replace />;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  usePrefetch(isAuthenticated);

  if (!isAuthenticated) return <Login />;

  return (
    <div style={{
      minHeight: '100vh', width: '100%', backgroundColor: '#E4E8E5',
      display: 'flex', justifyContent: 'center', padding: 20, boxSizing: 'border-box',
    }}>
      <div style={{
        width: '100%', maxWidth: 1400, height: 'calc(100vh - 40px)',
        backgroundColor: C.background, borderRadius: 26, overflow: 'hidden',
        boxShadow: '0 12px 48px rgba(26,26,46,0.10), 0 2px 8px rgba(26,26,46,0.05)',
        display: 'flex',
      }}>
        <Sidebar />
        <main style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/"         element={<Dashboard />} />
              <Route path="/map"      element={<Guarded path="/map"><FarmMap /></Guarded>} />
              <Route path="/farms"    element={<Guarded path="/farms"><FarmCycles /></Guarded>} />
              <Route path="/users"    element={<Guarded path="/users"><Users /></Guarded>} />
              <Route path="/datasets" element={<Guarded path="/datasets"><Datasets /></Guarded>} />
              <Route path="/rules"    element={<Guarded path="/rules"><Rules /></Guarded>} />
              <Route path="/import"   element={<Guarded path="/import"><Import /></Guarded>} />
              <Route path="*"         element={<Navigate to="/" />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
