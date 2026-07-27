import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import FarmMap from './pages/FarmMap';
import FarmCycles from './pages/FarmCycles';
import Users from './pages/Users';
import Datasets from './pages/Datasets';
import Import from './pages/Import';
import Rules from './pages/Rules';
import Login from './pages/Login';
import { C } from './theme';
import './index.css';

function AppRoutes() {
  const { isAuthenticated } = useAuth();

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
          <Routes>
            <Route path="/"         element={<Dashboard />} />
            <Route path="/map"      element={<FarmMap />}   />
            <Route path="/farms"    element={<FarmCycles />}/>
            <Route path="/users"    element={<Users />}     />
            <Route path="/datasets" element={<Datasets />}  />
            <Route path="/rules"    element={<Rules />}     />
            <Route path="/import"   element={<Import />}    />
            <Route path="*"         element={<Navigate to="/" />} />
          </Routes>
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
