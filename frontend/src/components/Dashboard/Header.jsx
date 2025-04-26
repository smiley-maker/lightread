/**
 * Header component for the dashboard area.
 * Provides navigation, user information, and logout functionality.
 * 
 * @component
 */
import React, { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import logo from '../../assets/LightReadLogo.svg';

/**
 * Navigation routes configuration
 */
const ROUTES = {
  dashboard: '/dashboard',
  summaries: '/dashboard/summaries',
  settings: '/dashboard/settings',
  billing: '/dashboard/billing',
  feedback: '/dashboard/feedback'
};

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  
  /**
   * Handles navigation to a specific route
   * @param {string} route - Route path to navigate to
   */
  const handleNavigation = useCallback((route) => {
    navigate(route);
  }, [navigate]);

  /**
   * Handles user logout
   */
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  /**
   * Checks if a route is currently active
   * @param {string} path - Route path to check
   * @returns {boolean} True if the route is active
   */
  const isActive = useCallback((path) => {
    return location.pathname.includes(path);
  }, [location.pathname]);

  return (
    <header className="dashboard-header">
      <div className="header-container">
        <div className="header-left">
          <div 
            onClick={() => handleNavigation(ROUTES.dashboard)} 
            className="logo-container" 
            style={{ cursor: 'pointer' }}
          >
            <img src={logo} alt="LightRead Logo" className="logo" />
          </div>
          <nav className="header-nav">
            <button 
              className={`nav-button ${isActive('/summaries') || location.pathname === ROUTES.dashboard ? 'active' : ''}`} 
              onClick={() => handleNavigation(ROUTES.summaries)}
            >
              summaries
            </button>
            <button 
              className={`nav-button ${isActive('/settings') ? 'active' : ''}`} 
              onClick={() => handleNavigation(ROUTES.settings)}
            >
              settings
            </button>
            <button 
              className={`nav-button ${isActive('/billing') ? 'active' : ''}`} 
              onClick={() => handleNavigation(ROUTES.billing)}
            >
              billing
            </button>
            <button 
              className={`nav-button ${isActive('/feedback') ? 'active' : ''}`} 
              onClick={() => handleNavigation(ROUTES.feedback)}
            >
              feedback
            </button>
          </nav>
        </div>
        <div className="header-right">
          <span className="user-greeting">
            Hello, {user?.name || user?.email?.split('@')[0] || 'User'}
          </span>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header; 