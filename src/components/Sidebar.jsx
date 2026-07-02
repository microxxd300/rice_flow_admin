import { useState } from 'react';
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

/* One nav row — inline styles need JS hover state, so each row owns its own. */
function NavItem({ to, label, Icon }) {
  const [hover, setHover] = useState(false);

  return (
    <NavLink to={to} end={to === '/'} style={{ display: 'block', textDecoration: 'none' }}>
      {({ isActive }) => (
        <div
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            position: 'relative',
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 9,
            backgroundColor: isActive ? C.primaryLighter : hover ? C.surfaceAlt : 'transparent',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
          }}
        >
          {/* Active indicator bar */}
          <span style={{
            position: 'absolute', left: -10, top: '50%',
            transform: 'translateY(-50%)',
            width: 3, height: isActive ? 20 : 0, borderRadius: 9999,
            backgroundColor: C.primary,
            transition: 'height 0.18s ease',
          }} />
          <Icon
            size={16}
            color={isActive ? C.primary : hover ? C.textSecondary : C.textTertiary}
            strokeWidth={isActive ? 2.2 : 2}
          />
          <span style={{
            fontSize: 13,
            fontWeight: isActive ? 650 : 500,
            color: isActive ? C.primaryDark : hover ? C.text : C.textSecondary,
            transition: 'color 0.15s ease',
          }}>
            {label}
          </span>
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
      width: 240, minHeight: '100vh', flexShrink: 0,
      backgroundColor: C.surface,
      borderRight: `1px solid ${C.borderLight}`,
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 0, height: '100vh',
    }}>

      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '20px 18px', borderBottom: `1px solid ${C.borderLight}` }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: `linear-gradient(135deg, ${C.primary} 0%, ${C.primaryDark} 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 12px ${C.primary}35`,
        }}>
          <Leaf size={17} color="#fff" />
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 750, color: C.text, lineHeight: 1.2, letterSpacing: '-0.01em' }}>GeoRice Advisor</p>
          <p style={{ fontSize: 10.5, color: C.textTertiary, marginTop: 2, fontWeight: 500 }}>Admin Panel</p>
        </div>
      </div>

      {/* Nav groups */}
      <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
        {NAV_GROUPS.map(({ label, items }) => (
          <div key={label}>
            <p style={{
              fontSize: 10, fontWeight: 700, color: C.textTertiary,
              letterSpacing: '0.1em', marginBottom: 7, paddingLeft: 12,
            }}>
              {label}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {items.map(item => <NavItem key={item.to} {...item} />)}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer — user card */}
      <div style={{ padding: 14, borderTop: `1px solid ${C.borderLight}` }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 11px', borderRadius: 11,
          backgroundColor: C.surfaceAlt,
          border: `1px solid ${C.borderLight}`,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: `linear-gradient(135deg, ${C.primaryLighter} 0%, #D3EEDF 100%)`,
            border: `1.5px solid ${C.primary}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 12, fontWeight: 750, color: C.primaryDark }}>{initials}</span>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: 12.5, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name || 'Admin'}
            </p>
            <p style={{ fontSize: 10.5, color: C.textTertiary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email || ''}
            </p>
          </div>
          <button
            onClick={logout}
            title="Logout"
            aria-label="Logout"
            onMouseEnter={() => setLogoutHover(true)}
            onMouseLeave={() => setLogoutHover(false)}
            style={{
              background: logoutHover ? C.errorLight : 'none',
              border: 'none', padding: 6, borderRadius: 7,
              display: 'flex', alignItems: 'center',
            }}
          >
            <LogOut size={14} color={logoutHover ? C.error : C.textTertiary} />
          </button>
        </div>
      </div>
    </aside>
  );
}
