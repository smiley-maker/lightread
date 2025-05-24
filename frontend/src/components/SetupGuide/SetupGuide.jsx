import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Check, Chrome, ChevronRight, ChevronLeft, Sparkles, Crown } from 'lucide-react';
import { createCheckoutSession } from '../../lib/stripe';
import './SetupGuide.css';

const SetupGuide = ({ onComplete }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isExtensionInstalled, setIsExtensionInstalled] = useState(false);
  const [hasTriedSummary, setHasTriedSummary] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const demoTextRef = useRef(null);

  // Stripe price ID for the Pro plan
  const STRIPE_PRICE_ID = import.meta.env.VITE_STRIPE_PRICE_ID;

  // Check if extension is installed (simulate)
  useEffect(() => {
    const isInstalled = localStorage.getItem('lightread_extension_installed');
    setIsExtensionInstalled(!!isInstalled);
  }, []);

  const handlePlanChange = async (planType) => {
    if (!user || updating || selectedPlan === planType) return;
    
    try {
      setUpdating(true);
      
      if (planType === 'pro') {
        // For upgrading to pro, use the checkout session
        localStorage.setItem('userEmail', user.email);
        try {
          await createCheckoutSession(STRIPE_PRICE_ID);
          return; // Exit early as we're redirecting
        } catch (err) {
          console.error('Error creating checkout session:', err);
          setMessage({ 
            text: 'Failed to initiate payment. Please try again.', 
            type: 'error' 
          });
          return;
        }
      }
      
      setSelectedPlan(planType);
      setMessage({ 
        text: `Successfully selected ${planType} plan!`, 
        type: 'success' 
      });
      
      setTimeout(() => {
        setMessage({ text: '', type: '' });
      }, 3000);
    } catch (err) {
      console.error('Error updating subscription:', err);
      setMessage({ 
        text: `Failed to update subscription. Please try again.`, 
        type: 'error' 
      });
    } finally {
      setUpdating(false);
    }
  };

  // Steps definition
  const steps = [
    {
      id: 1,
      title: 'Choose Your Plan',
      description: 'Select the plan that best fits your needs. You can always upgrade later.',
      icon: <Crown size={32} color="#8A66FF" />,
      action: null,
      isComplete: true,
    },
    {
      id: 2,
      title: 'Install the Chrome Extension',
      description: 'Add LightRead to your Chrome browser to start summarizing text instantly.',
      icon: <Chrome size={32} color="#8A66FF" />,
      action: () => {
        window.open('https://chrome.google.com/webstore/detail/lightread/your-extension-id', '_blank');
        localStorage.setItem('lightread_extension_installed', 'true');
        setIsExtensionInstalled(true);
      },
      isComplete: isExtensionInstalled,
    },
    {
      id: 3,
      title: 'Sign In to the Extension',
      description: 'Click the LightRead icon in your Chrome toolbar and sign in with your account. This lets the extension save your summaries and unlocks all features.',
      icon: <Sparkles size={32} color="#8A66FF" />,
      action: null,
      isComplete: true,
    },
    {
      id: 4,
      title: 'Try Your First Summary',
      description: 'Highlight the text below, right-click, and select "Summarize with LightRead" to see it in action!',
      icon: <Check size={32} color="#8A66FF" />,
      action: null,
      isComplete: true,
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
      if (onComplete) {
        onComplete();
      } else {
        navigate('/dashboard');
      }
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
              <div className="plan-selection">
                {message.text && (
                  <div className={`settings-message ${message.type}`}>
                    {message.text}
                  </div>
                )}
                <div className="plan-cards">
                  <div className={`plan-card ${selectedPlan === 'free' ? 'active' : ''}`}>
                    <h2 className="plan-title">Free</h2>
                    <div className="plan-price">
                      <span className="price">$0</span>
                      <span className="period">/month</span>
                    </div>
                    <ul className="plan-features">
                      <li style={selectedPlan === 'free' ? {color: 'white'} : {color: 'black'}}>Summarization of highlighted text</li>
                      <li style={selectedPlan === 'free' ? {color: 'white'} : {color: 'black'}}>Up to 10 summaries/day</li>
                      <li style={selectedPlan === 'free' ? {color: 'white'} : {color: 'black'}}>Popup display for easy viewing</li>
                      <li style={selectedPlan === 'free' ? {color: 'white'} : {color: 'black'}}>Copy to clipboard</li>
                    </ul>
                    <button 
                      className={`plan-button ${selectedPlan === 'free' ? 'active-plan' : 'select-plan'}`}
                      onClick={() => handlePlanChange('free')}
                      disabled={updating || selectedPlan === 'free'}
                    >
                      {selectedPlan === 'free' ? 'Selected' : 'Select Plan'}
                    </button>
                  </div>
                  
                  <div className={`plan-card pro ${selectedPlan === 'pro' ? 'active' : ''}`}>
                    <h2 className="plan-title">Pro</h2>
                    <div className="plan-price">
                      <span className="price">$5</span>
                      <span className="period">/month</span>
                    </div>
                    <ul className="plan-features">
                      <li style={selectedPlan === 'pro' ? {color: 'white'} : {color: 'black'}}>Unlimited summaries</li>
                      <li style={selectedPlan === 'pro' ? {color: 'white'} : {color: 'black'}}>Summary history</li>
                      <li style={selectedPlan === 'pro' ? {color: 'white'} : {color: 'black'}}>Adjustable lengths</li>
                      <li style={selectedPlan === 'pro' ? {color: 'white'} : {color: 'black'}}>Tone, style, & difficulty options</li>
                    </ul>
                    <button 
                      className={`plan-button ${selectedPlan === 'pro' ? 'active-plan' : 'select-plan'}`}
                      onClick={() => handlePlanChange('pro')}
                      disabled={updating || selectedPlan === 'pro'}
                    >
                      {selectedPlan === 'pro' ? 'Selected' : 'Select Plan'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
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

            {currentStep === 3 && (
              <div className="sign-in">
                <p className="info-message">
                  <strong>Tip:</strong> Click the LightRead icon <span role="img" aria-label="puzzle piece">🧩</span> in your Chrome toolbar and sign in with your account.<br />
                  If you don't see it, click the puzzle icon and pin LightRead for easy access!
                </p>
              </div>
            )}

            {currentStep === 4 && (
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