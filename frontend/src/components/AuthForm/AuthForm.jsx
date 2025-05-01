import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './AuthForm.css';

const AuthForm = ({ onSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, signup } = useAuth();

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
  };

  const validateForm = () => {
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return false;
    }
    
    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    
    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      let result;
      
      if (isSignUp) {
        result = await signup(email, password);
        
        if (!result.error) {
          // For signup, store the email and redirect to the dashboard with billing tab
          localStorage.setItem('userEmail', email);
          console.log('Successfully signed up, redirecting to dashboard billing tab');
          
          // Adding a small delay to ensure the user is fully created before redirecting
          setTimeout(() => {
            navigate('/dashboard?tab=billing');
          }, 500);
          
          return;
        }
      } else {
        result = await login(email, password);
      }
      
      if (result.error) {
        setError(result.error.message);
      } else {
        // For login, we redirect to the dashboard normally
        console.log('Login successful, redirecting to dashboard');
        localStorage.setItem('userEmail', email);
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError('An error occurred during authentication. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form-container">
        <h2 className="auth-title">{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
        <p className="auth-subtitle">
          {isSignUp 
            ? 'Sign up to save your summaries and unlock more features' 
            : 'Sign in to access your LightRead account'}
        </p>
        
        {error && <div className="auth-error">{error}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          
          {isSignUp && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          )}
          
          <button 
            type="submit" 
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading 
              ? 'Loading...' 
              : isSignUp 
                ? 'Create Account' 
                : 'Sign In'}
          </button>
        </form>
        
        <div className="auth-toggle">
          {isSignUp 
            ? 'Already have an account?' 
            : "Don't have an account?"} 
          <button 
            onClick={toggleMode}
            className="toggle-btn" 
            disabled={loading}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthForm; 