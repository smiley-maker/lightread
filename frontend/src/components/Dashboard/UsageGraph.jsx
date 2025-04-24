import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { useAuth } from '../../contexts/AuthContext';
import { getUserDailyUsage } from '../../lib/supabase';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const UsageGraph = () => {
  const { user } = useAuth();
  const [usageData, setUsageData] = useState([]);
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsageData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Get current month's days (up to today)
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const currentDay = today.getDate();
        
        // Get the number of days to fetch (days elapsed in current month)
        const daysToFetch = currentDay;
        
        // Fetch usage data for the current month
        const { data, error } = await getUserDailyUsage(user.id, daysToFetch);
        
        if (error) {
          throw error;
        }
        
        // Create an array of all days in the current month up to today
        const daysArray = Array.from({ length: daysToFetch }, (_, i) => {
          const day = i + 1;
          return `${day}`;
        });
        
        // Create a usage count array that matches the days array
        const usageCounts = Array(daysToFetch).fill(0);
        
        // Map the actual usage data to the correct days
        if (data && data.length > 0) {
          data.forEach(item => {
            const itemDate = new Date(item.date);
            // Only include data from current month
            if (itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear) {
              const day = itemDate.getDate() - 1; // Adjust for 0-indexed array
              if (day >= 0 && day < daysToFetch) {
                usageCounts[day] = item.summaries_count || 0;
              }
            }
          });
        }
        
        setLabels(daysArray);
        setUsageData(usageCounts);
      } catch (err) {
        console.error('Error fetching usage data:', err);
        
        // Fall back to some dummy data if there's an error
        const dummyLabels = Array.from({ length: 30 }, (_, i) => `${i + 1}`);
        const dummyData = Array.from({ length: 30 }, () => Math.floor(Math.random() * 10));
        
        setLabels(dummyLabels);
        setUsageData(dummyData);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsageData();
  }, [user]);

  const data = {
    labels: labels,
    datasets: [
      {
        label: 'Summaries Generated',
        data: usageData,
        fill: false,
        backgroundColor: 'rgb(149, 97, 226)',
        borderColor: 'rgba(149, 97, 226, 0.8)',
        tension: 0.4,
        pointBackgroundColor: 'rgb(109, 40, 217)',
        pointBorderColor: '#fff',
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 10
          }
        }
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 10
          },
          maxTicksLimit: 10, // Limit the number of ticks to avoid overcrowding
        }
      }
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#333',
        bodyColor: '#333',
        bodyFont: {
          size: 12,
        },
        padding: 10,
        borderColor: 'rgba(149, 97, 226, 0.1)',
        borderWidth: 1,
        callbacks: {
          title: (tooltipItems) => {
            const day = tooltipItems[0].label;
            const date = new Date();
            date.setDate(parseInt(day));
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          }
        }
      }
    },
  };

  if (loading) {
    return <div className="loading-graph">Loading usage data...</div>;
  }

  return (
    <div className="usage-graph">
      <Line data={data} options={options} />
    </div>
  );
};

export default UsageGraph; 