import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Chrome, Puzzle } from 'lucide-react';
import './Onboarding.css';

const Welcome = () => {
  const navigate = useNavigate();

  const handleNext = () => {
    navigate('/onboarding/plan-selection');
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-content">
        <div className="onboarding-header">
          <h1>Welcome to LightRead!</h1>
          <p>Let's get you set up for intelligent text summarization.</p>
        </div>

        <div className="onboarding-step">
          <div className="step-icon">
            <Chrome size={48} color="#8A66FF" />
          </div>
          
          <h2>Sign in to the Extension</h2>
          <p className="step-description">
            Now that you've created your account, let's connect it to the Chrome extension.
          </p>
          
          <div className="instruction-card">
            <div className="instruction-step">
              <div className="step-number">1</div>
              <div className="step-text">
                <strong>Find the LightRead icon</strong> in your Chrome toolbar
                <div className="step-hint">
                  <Puzzle size={16} /> Look for the purple icon, or click the puzzle piece to find it
                </div>
              </div>
            </div>
            
            <div className="instruction-step">
              <div className="step-number">2</div>
              <div className="step-text">
                <strong>Click the icon</strong> to open the LightRead popup
              </div>
            </div>
            
            <div className="instruction-step">
              <div className="step-number">3</div>
              <div className="step-text">
                <strong>Sign in</strong> using the same email and password you just created
              </div>
            </div>
          </div>

          <div className="helpful-tip">
            <div className="tip-icon">💡</div>
            <div>
              <strong>Tip:</strong> If you don't see the LightRead icon, click the puzzle piece (🧩) in your toolbar and pin LightRead for easy access!
            </div>
          </div>
        </div>

        <div className="onboarding-actions">
          <button className="btn btn-primary" onClick={handleNext}>
            I've signed in to the extension
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Welcome; 