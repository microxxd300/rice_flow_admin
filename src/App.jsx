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
import './index.css';

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Login />;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto' }}>
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
