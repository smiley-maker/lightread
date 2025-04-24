/**
 * Layout component for the dashboard area of the application.
 * Provides the common structure including header and content area.
 * Handles authentication protection for dashboard routes.
 * 
 * @component
 * @example
 * return (
 *   <DashboardLayout>
 *     <DashboardContent />
 *   </DashboardLayout>
 * )
 */
import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Header from './Header';
import { useAuth } from '../../contexts/AuthContext';
import './Dashboard.css';

const DashboardLayout = () => {
  const { user } = useAuth();
  
  // Redirect to home if not logged in
  if (!user) {
    return <Navigate to="/" />;
  }

  return (
    <div className="dashboard-container">
      <Header />
      <div className="dashboard-content full-width">
        <main className="dashboard-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout; 