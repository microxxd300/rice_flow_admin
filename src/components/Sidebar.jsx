import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Map, Tractor, Users, Database, Upload, SlidersHorizontal, Leaf, LogOut } from 'lucide-react';
import { C } from '../theme';
import { useAuth } from '../context/AuthContext';
import leaf from '../assets/leaf.jpg';

const NAV_ITEMS = [
  { to: '/',         label: 'Dashboard',         Icon: LayoutDashboard   },
  { to: '/map',      label: 'Farm Map',          Icon: Map               },
  { to: '/farms',    label: 'Farm Cycles',       Icon: Tractor           },
  { to: '/users',    label: 'Users',             Icon: Users             },
  { to: '/datasets', label: 'Rice Varieties',    Icon: Database          },
  { to: '/rules',    label: 'Suitability Rules', Icon: SlidersHorizontal },
  { to: '/import',   label: 'Import Varieties',  Icon: Upload            },
];

/* Icon-only rail button. Active = white chip with green icon.
   Label appears as a floating tooltip on hover. */
function NavItem({ to, label, Icon }) {
  const [hover, setHover] = useState(false);

  return (
    <NavLink to={to} end={to === '/'} style={{ display: 'block', textDecoration: 'none' }}>
      {({ isActive }) => (
        <div
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}
        >
          <div style={{
            width: 42, height: 42, borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: isActive ? '#FFFFFF' : hover ? C.sidebarHover : 'transparent',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
          }}>
            <Icon
              size={18}
              color={isActive ? C.primary : 'rgba(255,255,255,0.72)'}
              strokeWidth={isActive ? 2.3 : 2}
            />
          </div>

          {/* Tooltip */}
          {hover && (
            <div style={{
              position: 'absolute', left: 52, top: '50%', transform: 'translateY(-50%)',
              backgroundColor: C.text, color: '#fff',
              fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
              padding: '6px 10px', borderRadius: 8, zIndex: 100,
              boxShadow: '0 4px 12px rgba(0,0,0,0.18)', pointerEvents: 'none',
            }}>
              {label}
            </div>
          )}
        </div>
      )}
    </NavLink>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [logoutHover, setLogoutHover] = useState(false);
  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'A';

  return (
    <aside style={{
      width: 76, flexShrink: 0, height: '100%',
      padding: '12px 0 12px 12px',
      boxSizing: 'border-box',
    }}>
      <div style={{
        height: '100%', borderRadius: 22,
        backgroundColor: C.sidebar,
        backgroundImage: `linear-gradient(${C.sidebar}D9, ${C.sidebar}F2), url(${leaf})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '18px 0',
      }}>

        {/* Logo */}
        <div style={{
          width: 42, height: 42, borderRadius: 14, flexShrink: 0,
          backgroundColor: '#FFFFFF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 26,
        }}>
          <Leaf size={20} color={C.primary} strokeWidth={2.4} />
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
          {NAV_ITEMS.map(item => <NavItem key={item.to} {...item} />)}
        </nav>

        {/* User + logout */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <div
            title={user?.email || ''}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.15)',
              border: '1.5px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 750, color: '#fff' }}>{initials}</span>
          </div>

          <button
            onClick={logout}
            title="Logout"
            aria-label="Logout"
            onMouseEnter={() => setLogoutHover(true)}
            onMouseLeave={() => setLogoutHover(false)}
            style={{
              width: 36, height: 36, borderRadius: 12, border: 'none', cursor: 'pointer',
              backgroundColor: logoutHover ? 'rgba(231,76,60,0.22)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background-color 0.15s ease',
            }}
          >
            <LogOut size={16} color={logoutHover ? '#FF8B7E' : 'rgba(255,255,255,0.6)'} />
          </button>
        </div>
      </div>
    </aside>
  );
}
