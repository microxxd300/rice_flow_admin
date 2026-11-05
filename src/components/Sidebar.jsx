import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Map, Tractor, Users, Database, Upload,
  SlidersHorizontal, LogOut, History,
} from 'lucide-react';
import logo from '../assets/brand/logo_full.png';
import { C, radius } from '../theme';
import { useAuth } from '../context/AuthContext';
import { canAccess, ROLE, ROLE_LABEL } from '../permissions';

/* The pages, filtered by role: a validator never sees Users, Import or the
   Change Log (the server enforces the same split). */
const MENU = [
  { to: '/',         label: 'Dashboard',         Icon: LayoutDashboard   },
  { to: '/map',      label: 'Farm Map',          Icon: Map               },
  { to: '/farms',    label: 'Farm Cycles',       Icon: Tractor           },
  { to: '/users',    label: 'Users',             Icon: Users             },
  { to: '/datasets', label: 'Rice Varieties',    Icon: Database          },
  { to: '/rules',    label: 'Suitability Rules', Icon: SlidersHorizontal },
  { to: '/import',   label: 'Import Varieties',  Icon: Upload            },
  { to: '/changes',  label: 'Change Log',        Icon: History           },
];

function SectionLabel({ children }) {
  return (
    <p style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.10em',
      textTransform: 'uppercase', color: C.textTertiary,
      padding: '0 20px', margin: '18px 0 8px',
    }}>
      {children}
    </p>
  );
}

/* The current page sits in a dark pill (the app's "picked" chip), its icon green. */
function NavItem({ to, label, Icon }) {
  const [hover, setHover] = useState(false);

  return (
    <NavLink to={to} end={to === '/'} style={{ display: 'block', textDecoration: 'none' }}>
      {({ isActive }) => (
        <div
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{ position: 'relative', padding: '0 10px' }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', gap: 11,
            padding: '10px 12px', borderRadius: radius.md,
            backgroundColor: isActive ? C.sidebarActive : hover ? C.sidebarHover : 'transparent',
            transition: 'background-color 0.15s ease',
            cursor: 'pointer',
          }}>
            <Icon
              size={18}
              color={isActive ? '#34D399' : C.text}
              strokeWidth={isActive ? 2.4 : 2}
            />
            <span style={{
              fontSize: 13.5,
              fontWeight: isActive ? 700 : 600,
              color: isActive ? '#FFFFFF' : C.text,
              whiteSpace: 'nowrap',
            }}>
              {label}
            </span>
          </div>
        </div>
      )}
    </NavLink>
  );
}

function ActionItem({ label, Icon, onClick, danger }) {
  const [hover, setHover] = useState(false);
  return (
    <div style={{ padding: '0 10px' }}>
      <button
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 11,
          padding: '10px 12px', borderRadius: radius.md, border: 'none',
          backgroundColor: hover ? (danger ? C.errorLight : C.sidebarHover) : 'transparent',
          cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
          transition: 'background-color 0.15s ease',
        }}
      >
        <Icon size={18} color={danger && hover ? C.error : C.textSecondary} strokeWidth={2} />
        <span style={{
          fontSize: 13.5, fontWeight: 500,
          color: danger && hover ? C.error : C.textSecondary,
        }}>
          {label}
        </span>
      </button>
    </div>
  );
}

export default function Sidebar() {
  const { user, logout, role } = useAuth();
  // The profile has first/last name, not a single name field
  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim()
    || user?.username || ROLE_LABEL[role] || 'Admin';
  const visible = MENU.filter(item => canAccess(role, item.to));

  return (
    <aside style={{
      width: 218, flexShrink: 0, height: '100%',
      backgroundColor: C.sidebar,
      borderRight: `1px solid ${C.borderLight}`,
      display: 'flex', flexDirection: 'column',
      padding: '20px 0 16px',
      boxSizing: 'border-box',
    }}>

      {/* Brand */}
      <div style={{ padding: '0 20px' }}>
        <img src={logo} alt="RiceFlow" style={{ width: 96, height: 'auto', display: 'block' }} />
        <p style={{ fontSize: 11, fontWeight: 700, color: C.textSecondary, marginTop: 4, letterSpacing: '0.04em' }}>ADMIN · PANABO CITY</p>
      </div>

      {/* Scrollable nav */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <SectionLabel>Menu</SectionLabel>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {visible.map(item => <NavItem key={item.to} {...item} />)}
        </nav>

        <SectionLabel>Account</SectionLabel>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <ActionItem label="Log out" Icon={LogOut} onClick={logout} danger />
        </nav>
      </div>

      {/* Signed-in user */}
      {user && (
        <div style={{
          margin: '12px 14px 0', padding: '10px 12px',
          borderRadius: radius.md, backgroundColor: C.surfaceAlt,
          display: 'flex', alignItems: 'center', gap: 10, minWidth: 0,
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
            backgroundColor: C.ink,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>
              {displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{
              fontSize: 12, fontWeight: 700, color: C.text,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {displayName}
            </p>
            {/* The role, so the validator always knows what they can change */}
            <span style={{
              display: 'inline-block', marginTop: 3, padding: '2px 8px', borderRadius: 8,
              fontSize: 10, fontWeight: 700,
              color: role === ROLE.ADMIN ? '#FFFFFF' : '#047857',
              backgroundColor: role === ROLE.ADMIN ? C.ink : C.primaryLighter,
            }}>
              {ROLE_LABEL[role] || ''}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}
