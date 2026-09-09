import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Users, LayoutDashboard, LogIn, LogOut, UploadCloud, Moon, Sun, Menu, X, Settings as SettingsIcon, Home } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import AuthModal from './AuthModal';

const Navbar = () => {
  const { isDark, toggleTheme } = useTheme();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, signOut } = useAuth();


  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <nav style={styles.navbar}>
      <div style={styles.brand}>
        <Link to="/" style={styles.brandLink} onClick={closeMobileMenu}>
          <img src="/logo.svg" alt="UpGrades Logo" style={{ height: '40px' }} />
          <span style={styles.brandText}>UpGrades</span>
        </Link>
      </div>
      
      {/* Desktop Links */}
      <div className="desktop-only" style={{...styles.links, gap: 'var(--wb-spacing-x-large)'}}>
        <Link to="/" style={styles.navLink}>
          <Home size={20} />
          Home
        </Link>
        <Link to="/upload" style={styles.navLink}>
          <UploadCloud size={20} />
          Upload Syllabus
        </Link>
        <Link to="/dashboard" style={styles.navLink}>
          <LayoutDashboard size={20} />
          Dashboard
        </Link>
        <Link to="/group" style={styles.navLink}>
          <Users size={20} />
          Study Group
        </Link>
        <Link to="/settings" style={styles.navLink}>
          <SettingsIcon size={20} />
          Settings
        </Link>
      </div>

      {/* Desktop Actions */}
      <div className="desktop-only" style={{...styles.actions, gap: 'var(--wb-spacing-small)', alignItems: 'center'}}>
        <button 
          onClick={toggleTheme} 
          style={styles.themeToggle}
          title="Toggle Night Mode"
        >
          {isDark ? <Sun size={20} color="var(--wb-gold)" /> : <Moon size={20} color="var(--wb-offBlack64)" />}
        </button>

        {isAuthenticated ? (
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <span style={{fontSize: '14px', color: 'var(--wb-offBlack64)', fontWeight: '700'}}>
              {user?.email?.split('@')[0] || 'Student'}
            </span>
            <button 
              className="btn-secondary" 
              style={styles.loginBtn}
              onClick={handleSignOut}
            >
              <LogOut size={18} style={{marginRight: '6px'}}/> Log out
            </button>
          </div>
        ) : (
          <>
            <button 
              className="btn-secondary" 
              style={styles.loginBtn}
              onClick={() => setIsAuthOpen(true)}
            >
              <LogIn size={18} style={{marginRight: '6px'}}/> Log in
            </button>
            <button className="btn-primary" onClick={() => setIsAuthOpen(true)}>Sign up</button>
          </>
        )}
      </div>

      {/* Mobile Toggle Button */}
      <div className="mobile-only" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
        <button 
          onClick={toggleTheme} 
          style={{...styles.themeToggle, margin: 0}}
        >
          {isDark ? <Sun size={20} color="var(--wb-gold)" /> : <Moon size={20} color="var(--wb-offBlack64)" />}
        </button>
        <button 
          style={{background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: 'var(--wb-offBlack)'}}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      <div className={`mobile-menu-dropdown ${isMobileMenuOpen ? 'open' : ''}`}>
        <Link to="/" style={styles.navLink} onClick={closeMobileMenu}>
          <Home size={20} /> Home
        </Link>
        <Link to="/upload" style={styles.navLink} onClick={closeMobileMenu}>
          <UploadCloud size={20} /> Upload Syllabus
        </Link>
        <Link to="/dashboard" style={styles.navLink} onClick={closeMobileMenu}>
          <LayoutDashboard size={20} /> Dashboard
        </Link>
        <Link to="/group" style={styles.navLink} onClick={closeMobileMenu}>
          <Users size={20} /> Study Group
        </Link>
        <Link to="/settings" style={styles.navLink} onClick={closeMobileMenu}>
          <SettingsIcon size={20} /> Settings
        </Link>
        <div style={{height: '1px', backgroundColor: 'var(--wb-offBlack16)', margin: '8px 0'}}></div>
        
        {isAuthenticated ? (
          <button 
            className="btn-secondary" 
            style={{...styles.loginBtn, justifyContent: 'center', width: '100%'}}
            onClick={() => { handleSignOut(); closeMobileMenu(); }}
          >
            <LogOut size={18} style={{marginRight: '6px'}}/> Log out
          </button>
        ) : (
          <>
            <button 
              className="btn-secondary" 
              style={{...styles.loginBtn, justifyContent: 'center', width: '100%'}}
              onClick={() => { setIsAuthOpen(true); closeMobileMenu(); }}
            >
              <LogIn size={18} style={{marginRight: '6px'}}/> Log in
            </button>
            <button className="btn-primary" style={{width: '100%'}} onClick={() => { setIsAuthOpen(true); closeMobileMenu(); }}>Sign up</button>
          </>
        )}
      </div>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </nav>
  );
};

const styles = {
  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'var(--wb-spacing-medium) var(--wb-spacing-x-large)',
    backgroundColor: 'var(--wb-white)',
    borderBottom: '1px solid var(--wb-offBlack16)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
  },
  brandLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--wb-spacing-small)',
    textDecoration: 'none',
  },
  brandText: {
    fontSize: '22px',
    fontWeight: '900',
    color: 'var(--wb-green)',
    letterSpacing: '-0.5px'
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--wb-spacing-x-small)',
    color: 'var(--wb-offBlack64)',
    fontWeight: '700',
    fontSize: '16px',
    transition: 'color 0.2s',
  },
  loginBtn: {
    display: 'flex',
    alignItems: 'center'
  },
  themeToggle: {
    background: 'none',
    border: 'none',
    padding: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    marginRight: '8px',
    transition: 'background-color 0.2s',
  }
};

export default Navbar;
