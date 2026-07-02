import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { C } from '../theme';
import { Eye, EyeOff, Leaf, MapPin, Sparkles } from 'lucide-react';

/* Floating product-preview cards on the right panel — real app content
   (variety + RSI, mapped farms), not stock illustration. */
function PreviewCards() {
  return (
    <div style={{ position: 'relative', width: 250, height: 240 }}>
      {/* RSI card */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 28,
        backgroundColor: '#FFFFFF', borderRadius: 14,
        boxShadow: '0 16px 40px rgba(6,60,40,0.28)',
        padding: '14px 16px', transform: 'rotate(-3deg)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: C.primaryLighter, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={14} color={C.primary} />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.text }}>NSIC Rc160</p>
            <p style={{ fontSize: 10.5, color: C.textTertiary }}>Top recommendation</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: C.text }} className="tnum">97.25</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#065F46', backgroundColor: '#D1FAE5', padding: '3px 8px', borderRadius: 9999 }}>
            Highly Suitable
          </span>
        </div>
      </div>

      {/* Farms card */}
      <div style={{
        position: 'absolute', bottom: 0, right: 0, left: 56,
        backgroundColor: '#FFFFFF', borderRadius: 14,
        boxShadow: '0 16px 40px rgba(6,60,40,0.28)',
        padding: '13px 15px', transform: 'rotate(2.5deg)',
        display: 'flex', alignItems: 'center', gap: 11,
      }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: '#FEF3DC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <MapPin size={14} color={C.accent} />
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Farms mapped</p>
          <p style={{ fontSize: 10.5, color: C.textTertiary }}>Panabo City, Davao del Norte</p>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const { login } = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [focusEl,  setFocusEl]  = useState('');
  const [showPw,   setShowPw]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (name) => ({
    width: '100%', height: 42, padding: '0 12px', fontSize: 13.5,
    border: `1px solid ${focusEl === name ? C.primary : C.border}`,
    borderRadius: 8, outline: 'none', fontFamily: 'inherit',
    color: C.text, backgroundColor: C.surface, boxSizing: 'border-box',
    boxShadow: focusEl === name ? `0 0 0 3px ${C.primary}14` : 'none',
  });

  return (
    <div style={{
      width: '100vw', minHeight: '100vh', backgroundColor: '#E9ECEA',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <style>{`@media (max-width: 880px) { .login-art-panel { display: none !important; } }`}</style>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 920, minHeight: 560,
        backgroundColor: '#FFFFFF', borderRadius: 24,
        boxShadow: '0 24px 60px rgba(26,26,46,0.10), 0 4px 16px rgba(26,26,46,0.05)',
        display: 'flex', overflow: 'hidden',
      }}>

        {/* ── Left: form ── */}
        <div style={{ flex: 1, padding: '36px 48px 32px', display: 'flex', flexDirection: 'column' }}>

          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 7, backgroundColor: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Leaf size={13} color="#fff" />
            </div>
            <span style={{ fontSize: 13, fontWeight: 750, color: C.text }}>GeoRice</span>
          </div>

          {/* Form block — vertically centered */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 320 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: C.text, lineHeight: 1.2, letterSpacing: '-0.02em' }}>
              Hello,<br />Welcome Back
            </h1>
            <p style={{ fontSize: 12.5, color: C.textTertiary, marginTop: 8, marginBottom: 28 }}>
              Sign in to manage GeoRice Advisor.
            </p>

            {error && (
              <div style={{
                marginBottom: 14, padding: '9px 12px', borderRadius: 8,
                backgroundColor: C.errorLight, border: `1px solid ${C.error}30`,
                fontSize: 12.5, color: C.error,
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                aria-label="Email"
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                onFocus={() => setFocusEl('email')} onBlur={() => setFocusEl('')}
                required autoComplete="email" placeholder="admin@riceflow.ph"
                style={inputStyle('email')}
              />
              <div style={{ position: 'relative' }}>
                <input
                  aria-label="Password"
                  type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocusEl('password')} onBlur={() => setFocusEl('')}
                  required autoComplete="current-password" placeholder="••••••••••"
                  style={{ ...inputStyle('password'), paddingRight: 40 }}
                />
                <button
                  type="button" onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 4, display: 'flex', color: C.textTertiary }}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              <button
                type="submit" disabled={loading}
                style={{
                  alignSelf: 'flex-start', marginTop: 10,
                  height: 40, padding: '0 28px', borderRadius: 8, border: 'none',
                  backgroundColor: loading ? C.borderLight : C.primary,
                  color: loading ? C.textTertiary : '#fff',
                  fontSize: 13.5, fontWeight: 650, fontFamily: 'inherit',
                }}
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          </div>

          {/* Footer */}
          <p style={{ fontSize: 11.5, color: C.textTertiary }}>
            Authorized administrators only
          </p>
        </div>

        {/* ── Right: inset gradient panel with product preview ── */}
        <div
          className="login-art-panel"
          style={{ flex: 1, padding: 16, display: 'flex' }}
        >
          <div style={{
            flex: 1, borderRadius: 18,
            background: `linear-gradient(160deg, #0AA173 0%, ${C.primary} 45%, ${C.primaryDark} 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Soft background shapes */}
            <div style={{ position: 'absolute', top: 30, left: 34, width: 90, height: 32, borderRadius: 9999, backgroundColor: 'rgba(255,255,255,0.16)' }} />
            <div style={{ position: 'absolute', top: 74, left: 76, width: 56, height: 22, borderRadius: 9999, backgroundColor: 'rgba(255,255,255,0.10)' }} />
            <div style={{ position: 'absolute', bottom: 44, right: 38, width: 104, height: 34, borderRadius: 9999, backgroundColor: 'rgba(255,255,255,0.12)' }} />
            <div style={{ position: 'absolute', bottom: -70, left: -70, width: 220, height: 220, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.06)' }} />

            <PreviewCards />
          </div>
        </div>

      </div>
    </div>
  );
}
