import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiFileText, FiCreditCard, FiSettings } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { getUserSummaries, getUserSubscription, getUserDailyUsage } from '../../lib/supabase';
import './Dashboard.css';

const DashboardHome = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    summariesCount: 0,
    recentActivity: 0,
    activeSubscription: null,
    lastActivity: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Fetch user summaries
        const { data: summaries } = await getUserSummaries(user.id);
        
        // Fetch user subscription
        const { data: subscription } = await getUserSubscription(user.id);
        
        // Fetch daily usage for the last 7 days
        const { data: dailyUsage } = await getUserDailyUsage(user.id, 7);
        
        // Calculate recent activity (last 7 days)
        const recentActivity = dailyUsage?.reduce((sum, day) => sum + (day.summaries_count || 0), 0) || 0;
        
        // Get the date of the most recent summary
        const lastActivity = summaries && summaries.length > 0 
          ? summaries[0].created_at 
          : null;
        
        setStats({
          summariesCount: summaries?.length || 0,
          recentActivity,
          activeSubscription: subscription,
          lastActivity
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Format subscription end date
  const formatEndDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  const userName = user?.name || user?.email?.split('@')[0] || 'User';
  const planType = stats.activeSubscription?.plan_type || 'Free';
  const nextBillingDate = formatEndDate(stats.activeSubscription?.end_date);

  return (
    <div>
      <div className="dashboard-header">
        <h1>Welcome back, {userName}</h1>
        <p>Here's an overview of your LightRead activity</p>
      </div>

      <div className="stats-container">
        {loading ? (
          <>
            <div className="stat-card">
              <div className="skeleton" style={{ height: '20px', width: '80px', marginBottom: '10px' }}></div>
              <div className="skeleton" style={{ height: '40px', width: '60px', marginBottom: '10px' }}></div>
              <div className="skeleton" style={{ height: '16px', width: '100px' }}></div>
            </div>
            <div className="stat-card">
              <div className="skeleton" style={{ height: '20px', width: '80px', marginBottom: '10px' }}></div>
              <div className="skeleton" style={{ height: '40px', width: '100px', marginBottom: '10px' }}></div>
              <div className="skeleton" style={{ height: '16px', width: '120px' }}></div>
            </div>
            <div className="stat-card">
              <div className="skeleton" style={{ height: '20px', width: '80px', marginBottom: '10px' }}></div>
              <div className="skeleton" style={{ height: '40px', width: '150px', marginBottom: '10px' }}></div>
              <div className="skeleton" style={{ height: '16px', width: '100px' }}></div>
            </div>
          </>
        ) : (
          <>
            <div className="stat-card">
              <h3>Summaries Total</h3>
              <p className="stat-value">{stats.summariesCount}</p>
              <p className="stat-subtext">Total summaries in your library</p>
            </div>
            <div className="stat-card">
              <h3>Recent Activity</h3>
              <p className="stat-value">{stats.recentActivity}</p>
              <p className="stat-subtext">Summaries in the last 7 days</p>
            </div>
            <div className="stat-card">
              <h3>Current Plan</h3>
              <p className="stat-value">{planType}</p>
              <p className="stat-subtext">
                {planType.toLowerCase() === 'free' 
                  ? 'Upgrade for more features' 
                  : `Next billing: ${nextBillingDate}`}
              </p>
            </div>
          </>
        )}
      </div>

      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <Link to="/dashboard/summaries" className="action-card">
            <div className="action-icon">
              <FiFileText />
            </div>
            <h3 className="action-title">View Summaries</h3>
            <p className="action-description">Browse your summary history</p>
          </Link>
          
          <Link to="/dashboard/subscription" className="action-card">
            <div className="action-icon">
              <FiCreditCard />
            </div>
            <h3 className="action-title">Manage Subscription</h3>
            <p className="action-description">Update your subscription plan</p>
          </Link>
          
          <Link to="/dashboard/settings" className="action-card">
            <div className="action-icon">
              <FiSettings />
            </div>
            <h3 className="action-title">Account Settings</h3>
            <p className="action-description">View and edit your profile</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome; 