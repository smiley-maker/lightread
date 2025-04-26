import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getUserSettings, updateUserSettings, getSettingsOptions, deactivateAccount, deleteAccount } from '../../lib/supabase';
import ErrorBoundary from '../../components/ErrorBoundary';
import '../../components/Dashboard/Dashboard.css';
import './Settings.css';

const Settings = () => {
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState(null);
  const [options, setOptions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const [settingsData, optionsData] = await Promise.all([
          getUserSettings(),
          getSettingsOptions()
        ]);

        if (settingsData.error) {
          throw settingsData.error;
        }

        if (optionsData.error) {
          throw optionsData.error;
        }

        if (settingsData.data) {
          setSettings({
            summary_length: settingsData.data.summary_length,
            theme_type: settingsData.data.theme_type,
            summary_tone: settingsData.data.summary_tone,
            summary_difficulty: settingsData.data.summary_difficulty,
            save_source_url: settingsData.data.save_source_url
          });
        }

        if (optionsData.data) {
          setOptions(optionsData.data);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        setMessage({
          text: 'Failed to load settings. Please try again.',
          type: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleSettingsChange = async (key, value) => {
    try {
      setSaving(true);
      const newSettings = { ...settings, [key]: value };
      const { error } = await updateUserSettings(newSettings);
      
      if (error) throw error;
      
      setSettings(newSettings);
      setMessage({
        text: 'Settings updated successfully!',
        type: 'success'
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      setMessage({
        text: 'Failed to update settings. Please try again.',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivateAccount = async () => {
    try {
      setLoading(true);
      const { error } = await deactivateAccount();
      
      if (error) throw error;
      
      setMessage({
        text: 'Your account has been deactivated. Your data will be kept for 6 months.',
        type: 'success'
      });
      
      // Logout the user after deactivation
      await logout();
    } catch (error) {
      console.error('Error deactivating account:', error);
      setMessage({
        text: 'Failed to deactivate account. Please try again.',
        type: 'error'
      });
    } finally {
      setLoading(false);
      setShowDeactivateDialog(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setLoading(true);
      const { error } = await deleteAccount();
      
      if (error) throw error;
      
      setMessage({
        text: 'Your account and all associated data have been permanently deleted.',
        type: 'success'
      });
      
      // Logout the user after deletion
      await logout();
    } catch (error) {
      console.error('Error deleting account:', error);
      setMessage({
        text: 'Failed to delete account. Please try again.',
        type: 'error'
      });
    } finally {
      setLoading(false);
      setShowDeleteDialog(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading settings...</div>;
  }

  if (!settings || !options) {
    return <div className="error">Failed to load settings. Please try again.</div>;
  }

  return (
    <ErrorBoundary>
      <div className="settings-container">
        <h2>Settings</h2>
        
        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="settings-section">
          <h3>Summary Preferences</h3>
          <div className="settings-group">
            <label>
              Summary Length
              <select
                value={settings.summary_length}
                onChange={(e) => handleSettingsChange('summary_length', e.target.value)}
                disabled={saving}
              >
                {options.summary_length.map(option => (
                  <option key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Summary Tone
              <select
                value={settings.summary_tone}
                onChange={(e) => handleSettingsChange('summary_tone', e.target.value)}
                disabled={saving}
              >
                {options.summary_tone.map(option => (
                  <option key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Summary Difficulty
              <select
                value={settings.summary_difficulty}
                onChange={(e) => handleSettingsChange('summary_difficulty', e.target.value)}
                disabled={saving}
              >
                {options.summary_difficulty.map(option => (
                  <option key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="settings-section">
          <h3>Appearance</h3>
          <div className="settings-group">
            <label>
              Theme
              <select
                value={settings.theme_type}
                onChange={(e) => handleSettingsChange('theme_type', e.target.value)}
                disabled={saving}
              >
                {options.theme_type.map(option => (
                  <option key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="settings-section">
          <h3>Privacy</h3>
          <div className="settings-group">
            <label className="toggle-label">
              <div className="toggle-header">
                <span className="toggle-title">Save Source URLs</span>
                <div className="toggle-container">
                  <input
                    type="checkbox"
                    checked={settings.save_source_url}
                    onChange={(e) => handleSettingsChange('save_source_url', e.target.checked)}
                    disabled={saving}
                  />
                  <span className="toggle-slider"></span>
                </div>
              </div>
              <p className="setting-description">
                When enabled, the source URL of each summary will be saved. Disable this if you prefer not to store the websites you visit.
              </p>
            </label>
          </div>
        </div>

        {/* Add Review Onboarding button here */}
        <div style={{ margin: '2rem 0', textAlign: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={() => window.location.href = '/onboarding'}
          >
            Review Onboarding
          </button>
        </div>

        <div className="settings-section danger-zone">
          <h3>Danger Zone</h3>
          
          <div className="danger-actions">
            <button
              className="deactivate-account"
              onClick={() => setShowDeactivateDialog(true)}
              disabled={loading}
            >
              Deactivate Account
            </button>
            
            <button
              className="delete-account"
              onClick={() => setShowDeleteDialog(true)}
              disabled={loading}
            >
              Delete Account
            </button>
          </div>
        </div>

        {/* Deactivate Account Dialog */}
        {showDeactivateDialog && (
          <div className="dialog-overlay">
            <div className="dialog">
              <h3>Deactivate Account</h3>
              <p>Are you sure you want to deactivate your account?</p>
              <ul>
                <li>Your subscription will be cancelled</li>
                <li>You will be downgraded to the free plan</li>
                <li>Your data will be kept for 6 months</li>
                <li>You can reactivate your account within this period</li>
              </ul>
              <div className="dialog-actions">
                <button onClick={() => setShowDeactivateDialog(false)}>Cancel</button>
                <button className="confirm" onClick={handleDeactivateAccount}>Deactivate Account</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Account Dialog */}
        {showDeleteDialog && (
          <div className="dialog-overlay">
            <div className="dialog">
              <h3>Delete Account</h3>
              <p>Are you absolutely sure you want to delete your account?</p>
              <p className="warning">This action cannot be undone. All your data will be permanently deleted.</p>
              <div className="verification">
                <label>
                  Type "DELETE" to confirm:
                  <input 
                    type="text" 
                    placeholder="Type DELETE to confirm"
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                  />
                </label>
              </div>
              <div className="dialog-actions">
                <button onClick={() => setShowDeleteDialog(false)}>Cancel</button>
                <button 
                  className="confirm" 
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmation !== 'DELETE'}
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default Settings; 