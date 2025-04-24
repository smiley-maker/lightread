import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SetupGuide.css';
import { useAuth } from '../../contexts/AuthContext';
import placeholderImg from '../../assets/LightReadLogo.svg'; // Use logo as placeholder for now

const SetupGuide = ({ user, selectedPlan = 'free', onClose }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const navigate = useNavigate();
  const { logout } = useAuth();
  
  const handleNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleBackToHome = () => {
    if (onClose) {
      onClose();
    } else {
      navigate('/');
    }
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  const isPro = selectedPlan === 'pro';

  return (
    <div className="setup-guide-container">
      <div className="setup-guide">
        <div className="setup-header">
          <h1>Welcome to LightRead!</h1>
          <p className="user-email">{user?.email}</p>
          <div className="subscription-badge" data-plan={selectedPlan}>
            {isPro ? 'Pro Plan' : 'Free Plan'}
          </div>
        </div>

        <div className="setup-progress">
          <div className="step-indicators">
            <div className={`step-indicator ${currentStep >= 1 ? 'active' : ''}`}>1</div>
            <div className="step-line"></div>
            <div className={`step-indicator ${currentStep >= 2 ? 'active' : ''}`}>2</div>
            <div className="step-line"></div>
            <div className={`step-indicator ${currentStep >= 3 ? 'active' : ''}`}>3</div>
          </div>
        </div>

        <div className="setup-content">
          {currentStep === 1 && (
            <div className="setup-step">
              <h2>Step 1: Install the Extension</h2>
              <p>Get started by installing the LightRead Chrome extension from the Chrome Web Store.</p>
              
              <div className="setup-image">
                <img src={placeholderImg} alt="Chrome Web Store" />
              </div>
              
              <a 
                href="https://chrome.google.com/webstore/detail/lightread/your-extension-id" 
                target="_blank" 
                rel="noopener noreferrer"
                className="chrome-store-link"
              >
                <button className="btn btn-chrome">Add to Chrome</button>
              </a>
            </div>
          )}

          {currentStep === 2 && (
            <div className="setup-step">
              <h2>Step 2: Sign In to the Extension</h2>
              <p>After installation, click on the LightRead extension icon in your browser toolbar and sign in with the same email and password you just used:</p>
              
              <div className="setup-credentials">
                <div className="credential-item">
                  <span>Email:</span>
                  <strong>{user?.email}</strong>
                </div>
                <div className="credential-item">
                  <span>Password:</span>
                  <strong>The password you just created</strong>
                </div>
                <div className="credential-item">
                  <span>Your Plan:</span>
                  <strong className={isPro ? 'pro-text' : ''}>{isPro ? 'Pro' : 'Free'}</strong>
                </div>
              </div>
              
              <div className="setup-image">
                <img src={placeholderImg} alt="Extension sign in" />
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="setup-step">
              <h2>Step 3: Start Using LightRead</h2>
              <p>You're all set! Now you can use LightRead to summarize text from any webpage:</p>
              
              <ol className="usage-steps">
                <li>Select text on any webpage</li>
                <li>Right-click and select "Summarize with LightRead"</li>
                <li>View your summary in the popup</li>
                <li>All your summaries will be saved automatically!</li>
              </ol>
              
              {isPro && (
                <div className="pro-features">
                  <h3>Your Pro Features Include:</h3>
                  <ul>
                    <li>Unlimited summaries (no daily limit)</li>
                    <li>Adjustable summary lengths</li>
                    <li>Customizable tone and style</li>
                    <li>Summary history across devices</li>
                    <li>Priority support</li>
                  </ul>
                </div>
              )}
              
              <div className="setup-image">
                <img src={placeholderImg} alt="LightRead in action" />
              </div>
              
              <div className="setup-complete">
                <h3>Ready to start reading smarter?</h3>
                <div className="setup-action-buttons">
                  <button onClick={handleBackToHome} className="home-link">Return to Homepage</button>
                  <button onClick={handleGoToDashboard} className="dashboard-link">Go to Dashboard</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="setup-navigation">
          {currentStep > 1 && (
            <button onClick={handlePrevStep} className="nav-button prev-button">
              Back
            </button>
          )}
          
          {currentStep < 3 ? (
            <button onClick={handleNextStep} className="nav-button next-button">
              Next
            </button>
          ) : (
            <button onClick={handleSignOut} className="nav-button signout-button">
              Sign Out
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupGuide; 