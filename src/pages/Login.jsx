import { useState } from 'react';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { C } from '../theme';
import { seasonProgress } from '../season';
import panaboMap from '../assets/brand/panabo_map.svg';
import logo from '../assets/brand/logo_full.png';
import field from '../assets/brand/rice_field.jpg';

/**
 * Sign in for the two staff roles (admin and validator). The page is Panabo's own map:
 * the city and its 40 barangays drawn faintly behind a small card, with the season
 * running along the bottom. No farm or farmer data is shown before sign-in.
 */
export default function Login() {
  const { login } = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [focusEl,  setFocusEl]  = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const season = seasonProgress();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Login failed. Check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const fieldBox = (name) => ({
    display: 'flex', alignItems: 'center', gap: 10, height: 52, padding: '0 16px',
    borderRadius: 16, backgroundColor: C.background,
    border: `1.5px solid ${focusEl === name ? C.ink : 'transparent'}`,
  });
  const input = {
    flex: 1, minWidth: 0, height: '100%', border: 'none', outline: 'none', background: 'transparent',
    fontSize: 15, fontWeight: 500, color: C.text, fontFamily: 'inherit',
  };
  const label = { display: 'block', fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 8 };

  return (
    <div className="login-page">
      <style>{`
        .login-page {
          position: relative; width: 100vw; min-height: 100vh; overflow: hidden;
          background-color: ${C.background};
          display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          align-items: center;
        }
        .login-map {
          position: absolute; top: 3vh; right: 12vw; height: calc(97vh - 76px); width: auto;
          pointer-events: none; user-select: none;
        }
        .login-left  { position: relative; padding: 56px 0 120px 8vw; }
        .login-card  {
          position: relative; width: 100%; max-width: 400px; background: #fff;
          border-radius: 28px; padding: 32px; box-shadow: 0 18px 50px rgba(17,24,39,0.10);
        }
        .login-photo {
          position: absolute; right: 5vw; bottom: 96px; transform: rotate(3deg);
          width: 190px; height: 240px; border-radius: 26px; overflow: hidden;
          border: 6px solid #fff; box-shadow: 0 18px 50px rgba(17,24,39,0.16);
        }
        .login-season {
          position: absolute; left: 0; right: 0; bottom: 0; height: 64px;
          display: flex; align-items: center; gap: 16px; padding: 0 8vw;
          background: rgba(255,255,255,0.75); backdrop-filter: blur(6px);
          border-top: 1px solid ${C.borderLight};
        }
        @media (max-width: 900px) {
          .login-page { grid-template-columns: 1fr; }
          .login-left { padding: 40px 20px 110px; display: flex; justify-content: center; }
          .login-photo { display: none; }
          .login-map { right: -30vw; opacity: 0.6; }
          .login-season { padding: 0 20px; }
          .login-season-place { display: none; }
        }
      `}</style>

      {/* Panabo City and its barangays */}
      <img className="login-map" src={panaboMap} alt="" aria-hidden="true" />

      <div className="login-left">
        <div className="login-card">
          <img src={logo} alt="RiceFlow" style={{ width: 120, height: 'auto', display: 'block', marginBottom: 22 }} />
          <h1 style={{ fontSize: 28, lineHeight: '34px', fontWeight: 700, letterSpacing: '-0.6px', color: C.text }}>
            Sign in to the admin
          </h1>
          <p style={{ fontSize: 14, color: C.textSecondary, marginTop: 6, marginBottom: 24, lineHeight: '20px' }}>
            For RiceFlow administrators and the agriculturist who validates the farms.
          </p>

          {error && (
            <div role="alert" style={{
              marginBottom: 16, padding: '12px 14px', borderRadius: 14,
              backgroundColor: C.errorLight, fontSize: 13, fontWeight: 600, color: '#B91C1C',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={label} htmlFor="login-email">Email</label>
              <div style={fieldBox('email')}>
                <Mail size={18} color={focusEl === 'email' ? C.ink : C.textTertiary} />
                <input
                  id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocusEl('email')} onBlur={() => setFocusEl('')}
                  required autoComplete="username" placeholder="you@riceflow.app" style={input}
                />
              </div>
            </div>

            <div>
              <label style={label} htmlFor="login-password">Password</label>
              <div style={fieldBox('password')}>
                <Lock size={18} color={focusEl === 'password' ? C.ink : C.textTertiary} />
                <input
                  id="login-password" type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocusEl('password')} onBlur={() => setFocusEl('')}
                  required autoComplete="current-password" placeholder="Your password" style={input}
                />
                <button
                  type="button" onClick={() => setShowPw(v => !v)} aria-label={showPw ? 'Hide password' : 'Show password'}
                  style={{ background: 'none', border: 'none', padding: 4, display: 'flex', color: C.textSecondary }}
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              style={{
                height: 54, borderRadius: 18, border: 'none', marginTop: 6,
                backgroundColor: C.ink, color: '#fff', opacity: loading ? 0.6 : 1,
                fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
              }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p style={{ fontSize: 12, color: C.textSecondary, marginTop: 18, lineHeight: '18px' }}>
            Forgot your password? Ask a RiceFlow administrator to reset it.
          </p>
        </div>
      </div>

      {/* A rice field, as a small print pinned beside the map */}
      <div className="login-photo" aria-hidden="true">
        <img src={field} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 70%', display: 'block' }} />
      </div>

      {/* The season, as a strip along the bottom */}
      <div className="login-season">
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text, whiteSpace: 'nowrap' }}>{season.label}</span>
        <span style={{ fontSize: 13, color: C.textSecondary, whiteSpace: 'nowrap' }}>Week {season.week}</span>
        <div style={{ flex: 1, maxWidth: 360, height: 8, borderRadius: 4, backgroundColor: '#E4E6E4', overflow: 'hidden' }}>
          <div style={{ width: `${Math.round(season.share * 100)}%`, height: '100%', borderRadius: 4, backgroundColor: C.primary }} />
        </div>
        <span className="login-season-place" style={{ marginLeft: 'auto', fontSize: 12, color: C.textSecondary, whiteSpace: 'nowrap' }}>
          Panabo City, Davao del Norte · 40 barangays
        </span>
      </div>
    </div>
  );
}
