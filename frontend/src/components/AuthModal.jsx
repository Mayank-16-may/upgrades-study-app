import React, { useState } from 'react';
import { X, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const AuthModal = ({ isOpen, onClose }) => {
  const { signInWithGoogle, signInWithGithub, signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setEmail(''); setPassword(''); setError(''); setSuccess(''); setLoading(false);
    onClose();
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { setError('Please fill in all fields.'); return; }
    setError(''); setSuccess(''); setLoading(true);
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
        handleClose();
      } else {
        await signUpWithEmail(email, password);
        setSuccess('Account created! Check your email to confirm, then log in.');
        setMode('login');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try { setError(''); setLoading(true); await signInWithGoogle(); }
    catch (err) { setError(err.message || 'Google sign-in failed.'); setLoading(false); }
  };

  const handleGithub = async () => {
    try { setError(''); setLoading(true); await signInWithGithub(); }
    catch (err) { setError(err.message || 'GitHub sign-in failed.'); setLoading(false); }
  };

  return (
    <div style={styles.overlay}>
      <div className="card" style={styles.modal}>
        <button style={styles.closeBtn} onClick={handleClose}><X size={24} /></button>

        <h2 style={styles.title}>{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
        <p style={styles.subtitle}>
          {mode === 'login' ? "Log in to save and access your study plans." : "Sign up to get your AI-powered study plan."}
        </p>

        {error && <div style={styles.errorBox}>{error}</div>}
        {success && <div style={styles.successBox}>{success}</div>}

        {/* Email / Password Form */}
        <form onSubmit={handleEmailAuth} style={styles.form}>
          <div style={styles.inputGroup}>
            <Mail size={18} style={styles.inputIcon} />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />
          </div>
          <div style={styles.inputGroup}>
            <Lock size={18} style={styles.inputIcon} />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{...styles.input, paddingRight: '44px'}}
              required
            />
            <button type="button" style={styles.eyeBtn} onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
            </button>
          </div>
          <button
            type="submit"
            className="btn-primary"
            style={{width: '100%', padding: '13px', fontSize: '16px', opacity: loading ? 0.7 : 1}}
            disabled={loading}
          >
            {loading ? 'Please wait...' : (mode === 'login' ? 'Log in' : 'Create account')}
          </button>
        </form>

        {/* Toggle login/signup */}
        <p style={styles.toggleText}>
          {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
          <button style={styles.toggleBtn} onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess(''); }}>
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </p>

        <div style={styles.divider}><span style={styles.dividerText}>or continue with</span></div>

        {/* OAuth Buttons */}
        <div style={{display: 'flex', gap: '12px'}}>
          <button style={styles.oauthBtn} onClick={handleGoogle} disabled={loading}>
            <svg style={{width: '20px', height: '20px', flexShrink: 0}} viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google
          </button>
          <button style={styles.oauthBtn} onClick={handleGithub} disabled={loading}>
            <svg style={{width: '20px', height: '20px', flexShrink: 0}} viewBox="0 0 24 24">
              <path fill="currentColor" d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub
          </button>
        </div>

        <p style={styles.footerText}>By continuing, you agree to our Terms of Service.</p>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'var(--wb-white)',
    padding: '40px',
    width: '100%',
    maxWidth: '420px',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute', top: '16px', right: '16px',
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--wb-offBlack64)',
  },
  title: { fontSize: '24px', fontWeight: '900', color: 'var(--wb-offBlack)', marginBottom: '6px' },
  subtitle: { fontSize: '15px', color: 'var(--wb-offBlack64)', marginBottom: '24px' },
  errorBox: {
    backgroundColor: 'rgba(217,41,22,0.08)', color: 'var(--wb-red)',
    padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: '700',
    marginBottom: '16px',
  },
  successBox: {
    backgroundColor: 'rgba(22,163,74,0.08)', color: '#16a34a',
    padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: '700',
    marginBottom: '16px',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' },
  inputGroup: { position: 'relative', display: 'flex', alignItems: 'center' },
  inputIcon: { position: 'absolute', left: '12px', color: 'var(--wb-offBlack50)', pointerEvents: 'none' },
  input: {
    width: '100%', padding: '13px 12px 13px 42px',
    fontSize: '16px', fontFamily: 'inherit',
    border: '1px solid var(--wb-offBlack32)', borderRadius: '6px',
    color: 'var(--wb-offBlack)', backgroundColor: 'var(--wb-white)',
    outline: 'none',
  },
  eyeBtn: {
    position: 'absolute', right: '12px', background: 'none', border: 'none',
    cursor: 'pointer', color: 'var(--wb-offBlack50)', padding: '4px',
  },
  toggleText: { fontSize: '14px', color: 'var(--wb-offBlack64)', textAlign: 'center', margin: '4px 0 16px' },
  toggleBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--wb-blue)', fontWeight: '700', fontSize: '14px',
  },
  divider: {
    display: 'flex', alignItems: 'center', gap: '12px',
    marginBottom: '16px',
  },
  dividerText: {
    fontSize: '13px', color: 'var(--wb-offBlack50)',
    whiteSpace: 'nowrap', flex: '0 0 auto',
    borderTop: '1px solid var(--wb-offBlack16)',
    width: '100%', textAlign: 'center', paddingTop: '16px',
  },
  oauthBtn: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '8px', padding: '11px',
    fontSize: '15px', fontWeight: '700', color: 'var(--wb-offBlack)',
    backgroundColor: 'var(--wb-white)',
    border: '1px solid var(--wb-offBlack32)', borderRadius: '6px',
    cursor: 'pointer',
  },
  footerText: { fontSize: '12px', color: 'var(--wb-offBlack50)', textAlign: 'center', marginTop: '16px' },
};

export default AuthModal;
