import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { C } from '../theme';
import { Eye, EyeOff } from 'lucide-react';
import leaf from '../assets/leaf.jpg';

/* Sampled from leaf.jpg — the natural rice-field green */
const LEAF_GREEN = '#4C8C57';

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
    width: '100%', height: 38, padding: '0 12px', fontSize: 13,
    border: `1px solid ${focusEl === name ? LEAF_GREEN : C.border}`,
    borderRadius: 6, outline: 'none', fontFamily: 'inherit',
    color: C.text, backgroundColor: C.surface, boxSizing: 'border-box',
  });

  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 6 };

  return (
    <div style={{
      width: '100vw', minHeight: '100vh', backgroundColor: C.background,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <style>{`
        .login-img-panel { flex: 1; }
        @media (max-width: 820px) { .login-img-panel { display: none; } }
      `}</style>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 800, minHeight: 520,
        backgroundColor: '#fff', borderRadius: 18,
        boxShadow: '0 10px 40px rgba(26,26,46,0.10), 0 2px 8px rgba(26,26,46,0.05)',
        display: 'flex', overflow: 'hidden',
      }}>

        {/* LEFT — form */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 40px' }}>
          <div style={{ width: '100%', maxWidth: 260 }}>

            <h1 style={{ fontSize: 21, fontWeight: 700, color: C.text, marginBottom: 28 }}>
              Welcome Back
            </h1>

            {error && (
              <div style={{ marginBottom: 16, padding: '9px 12px', borderRadius: 6, backgroundColor: C.errorLight, border: `1px solid ${C.error}30`, fontSize: 12, color: C.error }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Email address</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocusEl('email')} onBlur={() => setFocusEl('')}
                  required placeholder="Enter your email" style={inputStyle('email')}
                />
              </div>

              <div>
                <label style={labelStyle}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    onFocus={() => setFocusEl('password')} onBlur={() => setFocusEl('')}
                    required placeholder="Enter your password" style={{ ...inputStyle('password'), paddingRight: 38 }}
                  />
                  <button
                    type="button" onClick={() => setShowPw(v => !v)}
                    style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: C.textTertiary }}
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit" disabled={loading}
                style={{
                  height: 40, borderRadius: 6, border: 'none', marginTop: 10,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  backgroundColor: loading ? C.borderLight : LEAF_GREEN,
                  color: loading ? C.textTertiary : '#fff',
                  fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                }}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0 16px' }}>
              <div style={{ flex: 1, height: 1, backgroundColor: C.borderLight }} />
              <span style={{ fontSize: 11, color: C.textTertiary }}>GeoRice Advisor</span>
              <div style={{ flex: 1, height: 1, backgroundColor: C.borderLight }} />
            </div>

            <p style={{ fontSize: 11, color: C.textTertiary, textAlign: 'center' }}>
              Admin access only · © 2026
            </p>
          </div>
        </div>

        {/* RIGHT — leaf photo */}
        <div className="login-img-panel">
          <img
            src={leaf}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>

      </div>
    </div>
  );
}
