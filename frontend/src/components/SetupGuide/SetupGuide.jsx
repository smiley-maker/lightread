import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Check, Chrome, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import './SetupGuide.css';

const SetupGuide = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isExtensionInstalled, setIsExtensionInstalled] = useState(false);
  const [hasTriedSummary, setHasTriedSummary] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const demoTextRef = useRef(null);

  // Check if extension is installed (simulate)
  useEffect(() => {
    const isInstalled = localStorage.getItem('lightread_extension_installed');
    setIsExtensionInstalled(!!isInstalled);
  }, []);

  // Steps definition
  const steps = [
    {
      id: 1,
      title: 'Install the Chrome Extension',
      description: 'Add LightRead to your Chrome browser to start summarizing text instantly.',
      icon: <Chrome size={32} color="#8A66FF" />, // Higher contrast
      action: () => {
        window.open('https://chrome.google.com/webstore/detail/lightread/your-extension-id', '_blank');
        localStorage.setItem('lightread_extension_installed', 'true');
        setIsExtensionInstalled(true);
      },
      isComplete: isExtensionInstalled,
    },
    {
      id: 2,
      title: 'Sign In to the Extension',
      description: 'Click the LightRead icon in your Chrome toolbar and sign in with your account. This lets the extension save your summaries and unlocks all features.',
      icon: <Sparkles size={32} color="#8A66FF" />, // Higher contrast
      action: null, // No action needed
      isComplete: true, // Always allow to proceed
    },
    {
      id: 3,
      title: 'Try Your First Summary',
      description: 'Highlight the text below, right-click, and select "Summarize with LightRead" to see it in action!',
      icon: <Check size={32} color="#8A66FF" />, // Higher contrast
      action: null,
      isComplete: true, // Always allow to finish
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      navigate('/dashboard');
    } catch (error) {
      console.error('Error completing setup:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-select demo text on click
  const handleDemoTextClick = () => {
    if (demoTextRef.current) {
      const range = document.createRange();
      range.selectNodeContents(demoTextRef.current);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  const currentStepData = steps[currentStep - 1];

  return (
    <div className="setup-guide">
      <div className="setup-container">
        <div className="setup-header">
          <h1>Welcome to LightRead!</h1>
          <p>Let's get you set up in just a few steps.</p>
        </div>

        <div className="setup-progress">
          {steps.map((step, idx) => (
            <div
              key={step.id}
              className={`progress-step ${step.id === currentStep ? 'active' : ''} ${
                (currentStep > step.id || (step.id < currentStep && step.isComplete)) ? 'complete' : ''
              }`}
            >
              <div className="step-number">
                {(currentStep > step.id || (step.id < currentStep && step.isComplete)) ? <Check size={16} /> : step.id}
              </div>
              {idx < steps.length - 1 && <div className="step-line" />}
            </div>
          ))}
        </div>

        <div className="setup-content">
          <div className="step-content">
            <div className="step-icon high-contrast-bg">{currentStepData.icon}</div>
            <h2>{currentStepData.title}</h2>
            <div className="step-underline" />
            <p>{currentStepData.description}</p>
            {currentStep === 1 && (
              <div className="extension-install">
                <button
                  className="btn btn-primary"
                  onClick={currentStepData.action}
                >
                  Install Extension
                </button>
                {isExtensionInstalled && (
                  <p className="success-message">
                    <Check size={16} /> Great! The extension is installed.
                  </p>
                )}
              </div>
            )}
            {currentStep === 2 && (
              <div className="sign-in">
                <p className="info-message">
                  <strong>Tip:</strong> Click the LightRead icon <span role="img" aria-label="puzzle piece">🧩</span> in your Chrome toolbar and sign in with your account.<br />
                  If you don't see it, click the puzzle icon and pin LightRead for easy access!
                </p>
              </div>
            )}
            {currentStep === 3 && (
              <div className="try-summary">
                <div className="demo-text">
                  <p>Here's some sample text you can try summarizing:</p>
                  <div
                    className="selectable-text"
                    ref={demoTextRef}
                    tabIndex={0}
                    onClick={handleDemoTextClick}
                    title="Click to select all text"
                    style={{ userSelect: 'text' }}
                  >
                    LightRead is an AI-powered Chrome extension that helps you quickly understand
                    any text you find online. Simply highlight the text you want to summarize,
                    right-click, and select "Summarize with LightRead" to get an instant summary.
                  </div>
                  <div className="auto-highlight-tip">Click the box to auto-select all text!</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="setup-actions">
          {currentStep > 1 && (
            <button className="btn btn-secondary" onClick={handleBack}>
              <ChevronLeft size={16} /> Back
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={currentStep === steps.length ? handleComplete : handleNext}
            disabled={isLoading}
          >
            {currentStep === steps.length ? 'Finish Setup' : 'Next Step'}
            {currentStep < steps.length && <ChevronRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetupGuide; 