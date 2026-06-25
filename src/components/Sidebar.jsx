import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Map, Tractor, Users, Database, Upload, SlidersHorizontal, Leaf, LogOut } from 'lucide-react';
import { C } from '../theme';
import { useAuth } from '../context/AuthContext';

const NAV_GROUPS = [
  {
    label: 'GENERAL',
    items: [
      { to: '/',     label: 'Dashboard',  Icon: LayoutDashboard },
      { to: '/map',  label: 'Farm Map',   Icon: Map             },
      { to: '/farms',label: 'Farm Cycles',Icon: Tractor         },
    ],
  },
  {
    label: 'MANAGEMENT',
    items: [
      { to: '/users',    label: 'Users',             Icon: Users              },
      { to: '/datasets', label: 'Rice Varieties',    Icon: Database           },
      { to: '/rules',    label: 'Suitability Rules', Icon: SlidersHorizontal  },
    ],
  },
  {
    label: 'DATA',
    items: [
      { to: '/import',   label: 'Import Varieties',  Icon: Upload             },
    ],
  },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'A';

  return (
    <aside style={{
      width: 220, minHeight: '100vh', flexShrink: 0,
      backgroundColor: C.surface,
      borderRight: `1px solid ${C.borderLight}`,
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 0, height: '100vh',
    }}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 18px', borderBottom: `1px solid ${C.borderLight}` }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          backgroundColor: C.primary,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 3px 10px ${C.primary}40`,
        }}>
          <Leaf size={16} color="#fff" />
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>GeoRice Advisor</p>
          <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>Admin Panel</p>
        </div>
      </div>

      {/* Nav groups */}
      <nav style={{ flex: 1, padding: '14px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {NAV_GROUPS.map(({ label, items }) => (
          <div key={label}>
            <p style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.09em', marginBottom: 6, paddingLeft: 8 }}>{label}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {items.map(({ to, label: itemLabel, Icon }) => (
                <NavLink key={to} to={to} end={to === '/'} style={{ display: 'block', textDecoration: 'none' }}>
                  {({ isActive }) => (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 9,
                      padding: '8px 10px', borderRadius: 8,
                      backgroundColor: isActive ? C.primaryLighter : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.12s',
                    }}>
                      <Icon size={15} color={isActive ? C.primary : '#9CA3AF'} />
                      <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? C.primary : '#6B7280' }}>
                        {itemLabel}
                      </span>
                    </div>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '14px', borderTop: `1px solid ${C.borderLight}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 10px', borderRadius: 10, backgroundColor: C.surfaceAlt }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
            backgroundColor: C.primaryLighter,
            border: `1.5px solid ${C.primary}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.primary }}>{initials}</span>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{user?.name || 'Admin'}</p>
            <p style={{ fontSize: 10, color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email || ''}</p>
          </div>
          <button
            onClick={logout}
            title="Logout"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}
          >
            <LogOut size={14} color="#9CA3AF" />
          </button>
        </div>
      </div>
    </aside>
  );
}
