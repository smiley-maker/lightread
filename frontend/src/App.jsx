import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';
import logo from './assets/LightReadLogo.svg';
import coneImage from './assets/lightread hero img.png';
import demoImage from './assets/context menu example.png';
import { Menu, X } from 'lucide-react';
import FeatureCard from './components/FeatureCard/FeatureCard';
import ScrollAnimation from './components/ScrollAnimation';
import AuthForm from './components/AuthForm/AuthForm';
import PlanSelection from './components/PlanSelection/PlanSelection';
import SetupGuide from './components/SetupGuide/SetupGuide';
import { useAuth } from './contexts/AuthContext';
import BookmarkIcon from './assets/bookmark.svg';
import ClipboardCopyIcon from './assets/copy paste.svg';
import SettingsIcon from './assets/customizable.svg';
import OpenBookIcon from './assets/open book.svg';
import BoxIcon from './assets/box.png';
import NoDataIcon from './assets/no data.png';
import ShieldIcon from './assets/shield.svg';
import { supabase } from './lib/supabase';

const App = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, loading } = useAuth();
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [showPlanSelection, setShowPlanSelection] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const navigate = useNavigate();

  // Check if user has completed onboarding
  useEffect(() => {
    if (user) {
      // Check if user has a subscription (indicating they completed onboarding)
      const checkOnboardingStatus = async () => {
        try {
          const { data: subscription, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .single();
          
          if (error && error.code !== 'PGRST116') {
            // Log only if it's not the "no rows returned" error
            console.error('Error checking subscription:', error);
          }
          
          setHasCompletedOnboarding(!!subscription);
        } catch (error) {
          console.error('Error checking onboarding status:', error);
          setHasCompletedOnboarding(false);
        }
      };
      
      checkOnboardingStatus();
    }
  }, [user]);

  useEffect(() => {
    // Handle scroll for navbar
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    
    // Toggle body scroll lock
    if (!isMobileMenuOpen) {
      document.body.classList.add('menu-open');
    } else {
      document.body.classList.remove('menu-open');
    }
  };
  
  const handleNavLinkClick = () => {
    // Close mobile menu if open
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
      document.body.classList.remove('menu-open');
    }
  };

  const handleAuthButtonClick = () => {
    setShowAuthForm(true);
    setShowPlanSelection(false);
    setShowSetupGuide(false);
    setSelectedPlan(null);
    setHasCompletedOnboarding(false);
  };

  const handleAuthSuccess = (data) => {
    if (data?.user) {
      setShowAuthForm(false);
      setShowPlanSelection(true); // Show plan selection after successful auth
    } else {
      console.error('Auth successful but user data is missing');
      // Still hide the form but don't show plan selection
      setShowAuthForm(false);
    }
  };

  const handlePlanSelectionComplete = (planType) => {
    setSelectedPlan(planType);
    setShowPlanSelection(false);
    // Redirect to onboarding route
    navigate('/onboarding');
  };

  const handleCloseSetupGuide = () => {
    setShowSetupGuide(false);
  };

  const handleDashboardClick = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-logo">
          <img src={logo} alt="LightRead logo" />
        </div>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (showAuthForm) {
    return <AuthForm onSuccess={handleAuthSuccess} />;
  }

  if (user && !hasCompletedOnboarding) {
    if (showPlanSelection) {
      return <PlanSelection user={user} onComplete={handlePlanSelectionComplete} />;
    }
    // If user is logged in but hasn't completed onboarding, show plan selection
    return <PlanSelection user={user} onComplete={handlePlanSelectionComplete} />;
  }

  return (
    <div className="app">
      {/* Navbar */}
      <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
        <div className="navbar-container">
          <div className="navbar-content">
            <div className="logo">
              <img src={logo} alt="LightRead logo" />
            </div>
            <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div className={`nav-links ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
              <a href="#features" onClick={handleNavLinkClick}>features</a>
              <a href="#privacy" onClick={handleNavLinkClick}>privacy</a>
              <a href="#pricing" onClick={handleNavLinkClick}>pricing</a>
              {user ? (
                <button className="btn btn-dashboard" onClick={handleDashboardClick}>dashboard</button>
              ) : (
                <button className="btn btn-chrome" onClick={handleAuthButtonClick}>add to chrome</button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title large-h1">
              Get to the<br />point - <span className="highlight">fast</span>.
            </h1>
            <p className="hero-description">
              LightRead is a Chrome extension powered by AI
              that instantly summarizes any text you highlight
              online. Whether you're browsing news, diving into
              research, or exploring a lengthy blog post,
              LightRead helps you quickly grasp the key points.
            </p>
            <button className="btn btn-chrome" onClick={handleAuthButtonClick}>add to chrome</button>
          </div>
          <img src={coneImage} alt="Text summarization illustration" className="hero-image" />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="section features">
        <div className="container features-container">
          <ScrollAnimation animationClass="animate-fadeIn">
            <h1 className="section-title">powerful features at<br />the push of a button</h1>
            <p className="section-subtitle">Right-click to access the summarization feature<br />directly from the context menu.</p>
          </ScrollAnimation>
          
          <div className="features-grid">
            {/* Top Left */}
            <div className="feature-card-wrapper top-left">
              <ScrollAnimation animationClass="animate-fadeIn" delay={100}>
                <FeatureCard
                  title="summary saving"
                  description="save your summaries to a personal dashboard to read again later!"
                  icon={<img src={BookmarkIcon} alt="Bookmark" />}
                />
              </ScrollAnimation>
            </div>

            {/* Top Right */}
            <div className="feature-card-wrapper top-right">
              <ScrollAnimation animationClass="animate-fadeIn" delay={200}>
                <FeatureCard
                  title="copy paste"
                  description="easily copy summaries to use elsewhere"
                  icon={<img src={ClipboardCopyIcon} alt="Copy Paste" />}
                />
              </ScrollAnimation>
            </div>

            {/* Center Demo */}
            <div className="feature-demo">
              <ScrollAnimation animationClass="animate-fadeIn" delay={300}>
                <img src={demoImage} alt="LightRead demo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </ScrollAnimation>
            </div>

            {/* Bottom Left */}
            <div className="feature-card-wrapper bottom-left">
              <ScrollAnimation animationClass="animate-fadeIn" delay={400}>
                <FeatureCard
                  title="customizable"
                  description="variety of tunable parameters to get your summaries just right"
                  icon={<img src={SettingsIcon} alt="Customizable" />}
                />
              </ScrollAnimation>
            </div>

            {/* Bottom Right */}
            <div className="feature-card-wrapper bottom-right">
              <ScrollAnimation animationClass="animate-fadeIn" delay={500}>
                <FeatureCard
                  title="text summarization"
                  description="select any text on a webpage and get a summary using AI"
                  icon={<img src={OpenBookIcon} alt="Open Book" />}
                />
              </ScrollAnimation>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy Section */}
      <section className="section privacy">
        <div className="container">
          <ScrollAnimation animationClass="animate-fadeIn">
            <h2 className="section-title">we never store your personal data</h2>
          </ScrollAnimation>
          <div className="privacy-grid">
            <ScrollAnimation animationClass="animate-fadeIn" delay={100}>
              <div className="privacy-card">
                <div className="privacy-icon">
                  <img src={ShieldIcon} alt="Shield" />
                </div>
                <h3>secure processing</h3>
                <p>Your selected text is processed securely and never stored</p>
              </div>
            </ScrollAnimation>

            <ScrollAnimation animationClass="animate-fadeIn" delay={200}>
              <div className="privacy-card">
                <div className="privacy-icon">
                  <img src={NoDataIcon} alt="No Data" />
                </div>
                <h3>no data collection</h3>
                <p>We don't track your browsing or collect personal data</p>
              </div>
            </ScrollAnimation>

            <ScrollAnimation animationClass="animate-fadeIn" delay={300}>
              <div className="privacy-card">
                <div className="privacy-icon">
                  <img src={BoxIcon} alt="Box" />
                </div>
                <h3>transparent</h3>
                <p>Open about how we handle your information</p>
              </div>
            </ScrollAnimation>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="section pricing">
        <div className="container">
          <ScrollAnimation animationClass="animate-fadeIn">
            <h2 className="section-title">choose your plan!</h2>
          </ScrollAnimation>
          <div className="pricing-grid">
            <ScrollAnimation animationClass="animate-fadeInLeft" delay={100}>
              <div className="pricing-card">
                <div className="plan-name">Free</div>
                <div className="plan-price">
                  <span className="price">$0</span>
                  <span className="period">/month</span>
                </div>
                <ul className="plan-features">
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Text summarization of highlighted text.
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Up to 10 summaries/day.
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Popup display for easy viewing.
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Copy to clipboard.
                  </li>
                </ul>
                <button className="btn btn-chrome" onClick={handleAuthButtonClick}>add to chrome</button>
              </div>
            </ScrollAnimation>

            <ScrollAnimation animationClass="animate-fadeInRight" delay={200}>
              <div className="pricing-card pro">
                <div className="best-value">best value</div>
                <div className="plan-name">Pro</div>
                <div className="plan-price">
                  <span className="price">$5</span>
                  <span className="period">/month</span>
                </div>
                <ul className="plan-features">
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Unlimited summaries.
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Summary history.
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Adjustable lengths.
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Tone, style, & difficulty options.
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Priority support.
                  </li>
                </ul>
                <button className="btn btn-chrome" onClick={handleAuthButtonClick}>add to chrome</button>
              </div>
            </ScrollAnimation>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section cta">
        <div className="container">
          <ScrollAnimation animationClass="animate-fadeIn">
            <h2 className="section-title">ready to lighten your reading?</h2>
            <p className="section-subtitle">
              join thousands of users who are reading smarter with LightRead!
            </p>
            <div className="cta-button-container">
              <button className="btn btn-chrome animate-pulse" onClick={handleAuthButtonClick}>add to chrome</button>
            </div>
          </ScrollAnimation>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="navbar-container">
          <div className="footer-content">
            <div className="logo">
              <img src={logo} alt="LightRead logo" />
            </div>
            <div className="footer-links">
              <a href="#features" onClick={handleNavLinkClick}>features</a>
              <a href="#privacy" onClick={handleNavLinkClick}>privacy</a>
              <a href="#pricing" onClick={handleNavLinkClick}>pricing</a>
              <a href="#">terms of use & privacy policy</a>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2025 LightRead. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
