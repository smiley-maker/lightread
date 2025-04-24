import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import '../../components/Dashboard/Dashboard.css';

const Dashboard = () => {
  const { currentUser } = useAuth();
  const [summaryStats, setSummaryStats] = useState({
    total: 0,
    lastWeek: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In a real app, this would fetch summary statistics from an API
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Simulating API call with timeout
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Mock data - replace with actual API call in production
        setSummaryStats({
          total: 14,
          lastWeek: 3,
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentUser]);

  if (isLoading) {
    return (
      <div className="dashboard-page">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <h1 className="dashboard-title">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-lg font-medium text-gray-700 mb-1">Total Summaries</h3>
          <p className="text-3xl font-bold text-indigo-600">{summaryStats.total}</p>
          <p className="text-sm text-gray-500 mt-2">
            All summaries you've created with LightRead
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-lg font-medium text-gray-700 mb-1">Recent Activity</h3>
          <p className="text-3xl font-bold text-indigo-600">{summaryStats.lastWeek}</p>
          <p className="text-sm text-gray-500 mt-2">
            Summaries created in the last 7 days
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h2 className="dashboard-subtitle">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <a 
            href="/upload" 
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-100 transition-colors"
          >
            <div className="p-3 bg-indigo-100 rounded-full mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium">Upload Document</h3>
              <p className="text-sm text-gray-500">Upload a PDF or text document</p>
            </div>
          </a>
          
          <a 
            href="/paste" 
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-100 transition-colors"
          >
            <div className="p-3 bg-indigo-100 rounded-full mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium">Paste Text</h3>
              <p className="text-sm text-gray-500">Paste text to summarize</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 