import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import './Feedback.css';

const Feedback = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    type: 'bug',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const { error } = await supabase
        .from('feedback_messages')
        .insert({
          user_id: user.id,
          type: formData.type,
          message: formData.message
        });

      if (error) throw error;

      setSubmitStatus('success');
      setFormData({ type: 'bug', message: '' });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="feedback-page">
      <h1>Submit Feedback</h1>
      <p className="feedback-description">
        Have a bug to report, a feature to suggest, or a question? We'd love to hear from you!
      </p>

      <form onSubmit={handleSubmit} className="feedback-form">
        <div className="form-group">
          <label htmlFor="type">Type of Feedback</label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            required
          >
            <option value="bug">Bug Report</option>
            <option value="feature">Feature Request</option>
            <option value="question">Question</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="message">Message</label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            placeholder="Please provide details about your feedback..."
            required
            minLength={10}
            maxLength={1000}
          />
        </div>

        {submitStatus === 'success' && (
          <div className="alert success">
            Thank you for your feedback! We'll review it soon.
          </div>
        )}

        {submitStatus === 'error' && (
          <div className="alert error">
            There was an error submitting your feedback. Please try again.
          </div>
        )}

        <button 
          type="submit" 
          className="submit-button"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>
    </div>
  );
};

export default Feedback; 