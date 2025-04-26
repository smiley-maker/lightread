import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getUserSummaries } from '../../lib/supabase';
import '../../components/Dashboard/Dashboard.css';

const Summaries = () => {
  const { user } = useAuth();
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState(null);
  
  const observer = useRef();
  const lastSummaryElementRef = useCallback(node => {
    if (loading || loadingMore) return;
    
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreSummaries();
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);

  const loadMoreSummaries = async () => {
    if (!user || loadingMore || !hasMore) return;
    
    try {
      setLoadingMore(true);
      const { data, error, hasMore: moreAvailable, nextCursor } = await getUserSummaries(user.id, {
        cursor,
        pageSize: 10
      });
      
      if (error) {
        throw error;
      }
      
      setSummaries(prev => [...prev, ...(data || [])]);
      setHasMore(moreAvailable);
      setCursor(nextCursor);
    } catch (err) {
      console.error('Error loading more summaries:', err);
      setError('Failed to load more summaries. Please try again later.');
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const fetchInitialSummaries = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const { data, error, hasMore: moreAvailable, nextCursor } = await getUserSummaries(user.id, {
          pageSize: 10
        });
        
        if (error) {
          throw error;
        }
        
        setSummaries(data || []);
        setHasMore(moreAvailable);
        setCursor(nextCursor);
      } catch (err) {
        console.error('Error fetching summaries:', err);
        setError('Failed to load summaries. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchInitialSummaries();
  }, [user]);

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    
    // Reset the copied status after 2 seconds
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  return (
    <div className="dashboard-page">
      <h1 className="dashboard-title">summaries</h1>
      
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your summaries...</p>
        </div>
      ) : error && summaries.length === 0 ? (
        <div className="summaries-error">
          <p>{error}</p>
        </div>
      ) : summaries.length === 0 ? (
        <div className="summaries-empty">
          <p>You don't have any saved summaries yet.</p>
          <p>All your summaries from the Chrome extension will appear here.</p>
        </div>
      ) : (
        <>
          <div className="summaries-grid">
            {summaries.map((summary, index) => (
              <div 
                key={summary.id} 
                ref={index === summaries.length - 1 ? lastSummaryElementRef : null}
                className="summary-card"
              >
                <div className="summary-content">
                  <p>{summary.summary}</p>
                </div>
                <div className="summary-footer">
                  <span className="summary-date">Created: {formatDate(summary.created_at)}</span>
                  <div className="summary-actions">
                    {summary.source_url && (
                      <a
                        href={summary.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="source-link"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                          <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                        </svg>
                        Source
                      </a>
                    )}
                    <button 
                      className={`copy-button ${copiedId === summary.id ? 'copied' : ''}`}
                      onClick={() => handleCopy(summary.id, summary.summary)}
                    >
                      {copiedId === summary.id ? 'Copied!' : 'copy'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {loadingMore && (
            <div className="loading-more">
              <div className="loading-spinner"></div>
              <p>Loading more summaries...</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Summaries; 