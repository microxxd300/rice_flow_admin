import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { C } from '../theme';
import { Eye, EyeOff } from 'lucide-react';

const shadow = '0 8px 32px rgba(5,150,105,0.10), 0 1px 4px rgba(26,26,46,0.06)';

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
    width: '100%', height: 44, padding: '0 14px', fontSize: 14,
    border: `1.5px solid ${focusEl === name ? C.primary : C.border}`,
    borderRadius: 10, outline: 'none', fontFamily: 'inherit',
    color: C.text, backgroundColor: C.surface, boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  });

  return (
    <div style={{
      width: '100vw', minHeight: '100vh', backgroundColor: C.background,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '0 24px', boxSizing: 'border-box' }}>
      <div style={{ backgroundColor: C.surface, borderRadius: 16, border: `1px solid ${C.borderLight}`, boxShadow: shadow, padding: '36px 32px' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <ellipse cx="12" cy="12" rx="4.5" ry="7.5" fill="white" opacity="0.95" transform="rotate(-20 12 12)" />
              <line x1="12" y1="19" x2="10" y2="22" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.text }}>GeoRice Advisor</p>
            <p style={{ fontSize: 11, color: C.textTertiary }}>Admin Panel</p>
          </div>
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 6 }}>Sign in</h2>
        <p style={{ fontSize: 13, color: C.textSecondary, marginBottom: 28 }}>Admin access only.</p>

        {error && (
          <div style={{ marginBottom: 18, padding: '11px 14px', borderRadius: 10, backgroundColor: C.errorLight, border: `1px solid ${C.error}30`, fontSize: 13, color: C.error }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 6 }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              onFocus={() => setFocusEl('email')} onBlur={() => setFocusEl('')}
              required placeholder="admin@riceflow.ph" style={inputStyle('email')}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 6 }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocusEl('password')} onBlur={() => setFocusEl('')}
                required placeholder="••••••••" style={{ ...inputStyle('password'), paddingRight: 42 }}
              />
              <button
                type="button" onClick={() => setShowPw(v => !v)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#9CA3AF' }}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button
            type="submit" disabled={loading}
            style={{
              height: 44, borderRadius: 10, border: 'none', marginTop: 4,
              cursor: loading ? 'not-allowed' : 'pointer',
              backgroundColor: loading ? C.borderLight : C.primary,
              color: loading ? C.textTertiary : '#fff',
              fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ marginTop: 32, fontSize: 11, color: C.textTertiary }}>© 2026 GeoRice Advisor</p>
      </div>
      </div>
    </div>
  );
}
