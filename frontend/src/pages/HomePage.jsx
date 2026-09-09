import React from 'react';
import { Link } from 'react-router-dom';
import { UploadCloud, LayoutDashboard, Users, Settings, BookOpen, Moon, Sun } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import './HomePage.css';

const HomePage = () => {
  const { isAuthenticated, user } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="home-container">
      {/* Absolute Logo */}
      <Link to="/" className="home-logo">
        <img src="/logo.svg" alt="UpGrades Logo" style={{ height: '32px' }} /> UpGrades
      </Link>

      {/* Absolute Theme Toggle */}
      <button 
        onClick={toggleTheme} 
        style={{
          position: 'absolute',
          top: '24px',
          right: '24px',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: 'white',
          padding: '10px',
          borderRadius: '50%',
          cursor: 'pointer',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.2s'
        }}
        title="Toggle Night Mode"
      >
        {isDark ? <Sun size={20} color="var(--wb-gold)" /> : <Moon size={20} />}
      </button>

      {/* Background Image Layer */}
      <div className="home-bg">
        <img src="/hero-bg.jpg" alt="" className="home-bg-img" />
      </div>

      {/* Main Content */}
      <div className="home-content">
        <div className="home-header">
          {isAuthenticated ? (
            <>
              <h1 className="home-headline">Welcome back{user?.name ? `, ${user.name}` : ''} 👋</h1>
              <p className="home-subheadline">Ready to continue studying? Pick up where you left off or create a new plan.</p>
            </>
          ) : (
            <>
              <h1 className="home-headline">For every student,<br/>a perfect study plan.</h1>
              <p className="home-subheadline">
                Upload your syllabus. Our AI analyzes it and curates the best video lectures, articles, and interactive quizzes tailored exactly to what you need to know.
              </p>
            </>
          )}
        </div>

        <div className="nav-cards-grid">
          <Link to="/upload" className="card-glass">
            <div className="card-glass-icon">
              <UploadCloud size={24} />
            </div>
            <h3>Upload Syllabus</h3>
            <p>Upload & get your AI plan</p>
          </Link>

          <Link to="/dashboard" className="card-glass">
            <div className="card-glass-icon">
              <LayoutDashboard size={24} />
            </div>
            <h3>Dashboard</h3>
            <p>Track progress & tasks</p>
          </Link>

          <Link to="/group" className="card-glass">
            <div className="card-glass-icon">
              <Users size={24} />
            </div>
            <h3>Study Groups</h3>
            <p>Study with friends</p>
          </Link>

          <Link to="/settings" className="card-glass">
            <div className="card-glass-icon">
              <Settings size={24} />
            </div>
            <h3>Settings</h3>
            <p>Customize your profile</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
