import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, MousePointer, Sparkles } from 'lucide-react';
import './Onboarding.css';

const HowItWorks = () => {
  const navigate = useNavigate();
  const demoTextRef = useRef(null);

  const handleBack = () => {
    navigate('/onboarding/plan-selection');
  };

  const handleFinish = () => {
    // Mark onboarding as complete and redirect to dashboard
    localStorage.setItem('onboarding_completed', 'true');
    navigate('/dashboard');
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

  return (
    <div className="onboarding-container">
      <div className="onboarding-content">
        <div className="onboarding-header">
          <h1>How LightRead Works</h1>
          <p>Let's try your first summary! Follow these simple steps to see LightRead in action.</p>
        </div>

        <div className="how-it-works-steps">
          <div className="step-card">
            <div className="step-icon">
              <MousePointer size={24} color="#8A66FF" />
            </div>
            <div className="step-content">
              <h3>1. Highlight Text</h3>
              <p>Select any text on a webpage that you want to summarize</p>
            </div>
          </div>

          <div className="step-card">
            <div className="step-icon">
              <div style={{ fontSize: '24px' }}>🖱️</div>
            </div>
            <div className="step-content">
              <h3>2. Right-Click</h3>
              <p>Right-click on the selected text to open the context menu</p>
            </div>
          </div>

          <div className="step-card">
            <div className="step-icon">
              <Sparkles size={24} color="#8A66FF" />
            </div>
            <div className="step-content">
              <h3>3. Get Your Summary</h3>
              <p>Click "Summarize with LightRead" and get an instant AI-powered summary</p>
            </div>
          </div>
        </div>

        <div className="demo-section">
          <h3>Try it now!</h3>
          <p>Highlight the text below, right-click, and select "Summarize with LightRead":</p>
          
          <div className="demo-text-container">
            <div
              className="demo-text"
              ref={demoTextRef}
              onClick={handleDemoTextClick}
              title="Click to auto-select all text"
              style={{ userSelect: 'text' }}
            >
              LightRead is a revolutionary Chrome extension that transforms how you consume online content. Using advanced AI technology powered by Google's Gemini model, LightRead can instantly analyze and summarize any text you select on a webpage. Whether you're reading lengthy news articles, academic papers, blog posts, or research documents, LightRead helps you quickly understand the key points without having to read everything word by word. The extension integrates seamlessly into your browsing experience through a simple right-click context menu, making it incredibly easy to use. With customizable summary lengths and advanced features for pro users like tone and difficulty adjustments, LightRead adapts to your specific reading needs and preferences.
            </div>
            <div className="demo-hint">
              👆 Click this box to auto-select the text, then right-click and choose "Summarize with LightRead"
            </div>
          </div>
        </div>

        <div className="success-tip">
          <div className="tip-icon">🎉</div>
          <div>
            <strong>Great job!</strong> You're all set up and ready to start summarizing content across the web. 
            Visit your dashboard to view saved summaries and adjust settings.
          </div>
        </div>

        <div className="onboarding-actions">
          <button className="btn btn-secondary" onClick={handleBack}>
            <ArrowLeft size={16} />
            Back
          </button>
          <button className="btn btn-primary" onClick={handleFinish}>
            Go to Dashboard
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks; 