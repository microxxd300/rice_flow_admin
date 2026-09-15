import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Map, Tractor, Users, Database, Upload,
  SlidersHorizontal, Leaf, LogOut, Settings, HelpCircle,
} from 'lucide-react';
import { C, radius } from '../theme';
import { useAuth } from '../context/AuthContext';
import { canAccess, ROLE, ROLE_LABEL } from '../permissions';

/* Grouped nav, matching the MENU / GENERAL split in the design reference.
   Items are filtered by role, so an agriculturist never sees Users, Import
   or Suitability Rules. */
const MENU = [
  { to: '/',         label: 'Dashboard',         Icon: LayoutDashboard   },
  { to: '/map',      label: 'Farm Map',          Icon: Map               },
  { to: '/farms',    label: 'Farm Cycles',       Icon: Tractor           },
  { to: '/users',    label: 'Users',             Icon: Users             },
  { to: '/datasets', label: 'Rice Varieties',    Icon: Database          },
  { to: '/rules',    label: 'Suitability Rules', Icon: SlidersHorizontal },
  { to: '/import',   label: 'Import Varieties',  Icon: Upload            },
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

/* Active = soft green chip plus a solid green bar on the panel's left edge. */
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
          {isActive && (
            <span style={{
              position: 'absolute', left: 0, top: 5, bottom: 5, width: 4,
              borderRadius: '0 4px 4px 0', backgroundColor: C.primary,
            }} />
          )}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 11,
            padding: '10px 12px', borderRadius: radius.md,
            backgroundColor: isActive ? C.sidebarActive : hover ? C.sidebarHover : 'transparent',
            transition: 'background-color 0.15s ease',
            cursor: 'pointer',
          }}>
            <Icon
              size={18}
              color={isActive ? C.primary : C.textSecondary}
              strokeWidth={isActive ? 2.4 : 2}
            />
            <span style={{
              fontSize: 13.5,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? C.primary : C.textSecondary,
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px' }}>
        <div style={{
          width: 34, height: 34, borderRadius: 11, flexShrink: 0,
          backgroundColor: C.primaryLighter,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Leaf size={18} color={C.primary} strokeWidth={2.4} />
        </div>
        <div style={{ lineHeight: 1.15 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: C.text }}>GeoRice</p>
          <p style={{ fontSize: 11, fontWeight: 600, color: C.textTertiary }}>Advisor</p>
        </div>
      </div>

      {/* Scrollable nav */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <SectionLabel>Menu</SectionLabel>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {visible.map(item => <NavItem key={item.to} {...item} />)}
        </nav>

        <SectionLabel>General</SectionLabel>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <ActionItem label="Settings" Icon={Settings}   onClick={() => {}} />
          <ActionItem label="Help"     Icon={HelpCircle} onClick={() => {}} />
          <ActionItem label="Logout"   Icon={LogOut}     onClick={logout} danger />
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
            backgroundColor: C.primary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>
              {(user.name || 'A').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{
              fontSize: 12, fontWeight: 700, color: C.text,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {user.name || 'Admin'}
            </p>
            <p style={{
              fontSize: 10, fontWeight: 700, marginTop: 1,
              color: role === ROLE.ADMIN ? C.primary : C.textTertiary,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {ROLE_LABEL[role] || ''}
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
