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
        window.open('https://chromewebstore.google.com/detail/lightread/mhkflpafikcopieaocdnkdjglgjjkbko?authuser=0&hl=en', '_blank');
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
    <div className="setup-guide onboarding-bg">
      <div className="onboarding-flex">
        {/* Vertical Stepper */}
        <div className="onboarding-stepper">
          {[1,2,3,4].map((step, idx) => (
            <div key={step} className={`onboarding-stepper-step${currentStep === step ? ' active' : ''}`}> 
              <div className="onboarding-stepper-circle">{step}</div>
              {idx < 3 && <div className="onboarding-stepper-line" />}
            </div>
          ))}
        </div>
        {/* Main Content */}
        <div className="onboarding-main">
          {currentStep === 1 && (
            <div className="plan-selection-figma">
              <h1 className="onboarding-title">Select a plan</h1>
              <p className="onboarding-desc">
                Our free plan offers a great way to get started, but if you want more advanced customizations and a higher daily summary limit, consider signing up for our pro tier!
              </p>
              <div className="plan-cards-figma">
                <div className={`plan-card-figma${selectedPlan === 'free' ? ' active' : ''}`}> 
                  <div className="plan-card-header">Free</div>
                  <div className="plan-card-price-row">
                    <span className="plan-card-price">$0</span>
                    <span className="plan-card-period">/month</span>
                  </div>
                  <ul className="plan-card-features">
                    <li><span className="plan-check">✔</span> Summarization of highlighted text.</li>
                    <li><span className="plan-check">✔</span> Up to 5 summaries/day.</li>
                    <li><span className="plan-check">✔</span> Popup display for easy viewing.</li>
                    <li><span className="plan-check">✔</span> Copy to clipboard.</li>
                  </ul>
                  <button 
                    className={`plan-card-btn${selectedPlan === 'free' ? ' selected' : ''}`}
                    onClick={() => handlePlanChange('free')}
                    disabled={updating || selectedPlan === 'free'}
                  >
                    {selectedPlan === 'free' ? 'selected' : 'select plan'}
                  </button>
                </div>
                <div className={`plan-card-figma pro${selectedPlan === 'pro' ? ' active' : ''}`}> 
                  <div className="plan-card-header pro">Pro</div>
                  <div className="plan-card-price-row">
                    <span className="plan-card-price">$5</span>
                    <span className="plan-card-period">/month</span>
                  </div>
                  <ul className="plan-card-features">
                    <li><span className="plan-check">✔</span> Unlimited summaries.</li>
                    <li><span className="plan-check">✔</span> Summary history.</li>
                    <li><span className="plan-check">✔</span> Adjustable lengths.</li>
                    <li><span className="plan-check">✔</span> Tone, style, & difficulty options.</li>
                  </ul>
                  <button 
                    className={`plan-card-btn${selectedPlan === 'pro' ? ' selected' : ''}`}
                    onClick={() => handlePlanChange('pro')}
                    disabled={updating || selectedPlan === 'pro'}
                  >
                    {selectedPlan === 'pro' ? 'selected' : 'select plan'}
                  </button>
                </div>
              </div>
            </div>
          )}
          {currentStep === 2 && (
            <div className="onboarding-step-content">
              <div className="onboarding-step-icon"><span className="onboarding-icon-chrome">{currentStepData.icon}</span></div>
              <h2 className="onboarding-step-title">Install the Chrome Extension</h2>
              <div className="onboarding-step-underline" />
              <p className="onboarding-step-desc">Add LightRead to your Chrome browser to start summarizing text instantly.</p>
              <button className="btn-primary btn" onClick={currentStepData.action}>install extension</button>
            </div>
          )}
          {currentStep === 3 && (
            <div className="onboarding-step-content">
              <div className="onboarding-step-icon"><span className="onboarding-icon-sparkles">{currentStepData.icon}</span></div>
              <h2 className="onboarding-step-title">Sign In to the Extension</h2>
              <div className="onboarding-step-underline" />
              <p className="onboarding-desc">Click the LightRead icon in your Chrome toolbar and sign in with your account. This lets the extension save your summaries and unlocks all features.</p>
              <div className="onboarding-tip-box">
                <strong>Tip:</strong> Click the LightRead icon <span role="img" aria-label="puzzle piece">🧩</span> in your Chrome toolbar and sign in with your account.<br />
                If you don't see it, click the puzzle icon and pin LightRead for easy access!
              </div>
            </div>
          )}
          {currentStep === 4 && (
            <div className="onboarding-step-content">
              <div className="onboarding-step-icon"><span className="onboarding-icon-check">{currentStepData.icon}</span></div>
              <h2 className="onboarding-step-title">Try Your First Summary</h2>
              <div className="onboarding-step-underline" />
              <div className="onboarding-summary-demo">
                <div className="onboarding-summary-box">
                  <div
                    className="onboarding-summary-text"
                    ref={demoTextRef}
                    tabIndex={0}
                    onClick={handleDemoTextClick}
                    title="Click the box to auto-select all text"
                    style={{ userSelect: 'text' }}
                  >
                    Try summarizing this text by highlighting it, right clicking, and selecting summarize with LightRead. This will display a popup right in your browser window with the summarized text, options to copy and save the summary, and if you’re on the pro plan it will show options to regenerate the summary using the same starter text but with more customizable options like summary tone and difficulty level. Try saving the summary and when you click next you will be able to see it in your dashboard.
                  </div>
                </div>
                <div className="auto-highlight-tip">Click the box to auto-select all text!</div>
              </div>
            </div>
          )}
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
    </div>
  );
};

export default SetupGuide; 