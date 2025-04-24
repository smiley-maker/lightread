import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getUserSettings, updateUserSettings, getSettingsOptions } from '../../lib/supabase';
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
            summary_difficulty: settingsData.data.summary_difficulty
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

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      try {
        setLoading(true);
        await logout();
      } catch (error) {
        console.error('Error deleting account:', error);
        setMessage({
          text: 'Failed to delete account. Please try again.',
          type: 'error'
        });
      } finally {
        setLoading(false);
      }
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

        <div className="settings-section danger-zone">
          <h3>Danger Zone</h3>
          <button
            className="delete-account"
            onClick={handleDeleteAccount}
            disabled={loading}
          >
            Delete Account
          </button>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Settings; 