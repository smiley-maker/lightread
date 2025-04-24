import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FiHome, FiBookmark, FiSettings, FiCreditCard, FiLogOut } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = ({ isOpen, user }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  
  const navItems = [
    { to: '/dashboard', icon: <FiHome size={20} />, text: 'Dashboard' },
    { to: '/dashboard/summaries', icon: <FiBookmark size={20} />, text: 'My Summaries' },
    { to: '/dashboard/subscription', icon: <FiCreditCard size={20} />, text: 'Subscription' },
    { to: '/dashboard/settings', icon: <FiSettings size={20} />, text: 'Settings' },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  
  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-content">
        <div className="user-profile">
          <div className="avatar-container">
            <div className="avatar">
              {user?.name ? user.name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
          <div className="user-info">
            <p className="user-name">{user?.name || user?.email || 'User'}</p>
            <p className="user-email">{user?.email || ''}</p>
          </div>
        </div>
        
        <nav className="sidebar-nav">
          <ul>
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink 
                  to={item.to} 
                  className={({ isActive }) => 
                    isActive ? 'nav-link active' : 'nav-link'
                  }
                  end={item.to === '/dashboard'}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-text">{item.text}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <span className="nav-icon"><FiLogOut size={20} /></span>
            <span className="nav-text">Log out</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar; 