import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Legal.css';
import logo from '../../assets/LightReadLogo.svg';

const CancellationPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="legal-page">
      <div className="legal-header">
        <img src={logo} alt="LightRead logo" onClick={() => navigate('/')} />
      </div>
      <div className="legal-container">
        <h1>Cancellation Policy</h1>
        <p className="last-updated">Last Updated: February 11, 2026</p>

        <section>
          <h2>1. Overview</h2>
          <p>LightRead offers a simple and transparent cancellation policy. You may cancel your Pro subscription at any time through your account dashboard or by contacting our support team.</p>
          <p>You can cancel anytime; your subscription will remain active until the end of your current billing period, and you will not be charged again.</p>
        </section>

        <section>
          <h2>2. How to Cancel Your Subscription</h2>
          <p>You can cancel your LightRead Pro subscription using any of the following methods:</p>
          <ul>
            <li><strong>Through Your Account Dashboard:</strong> Log in to your LightRead account, navigate to the Billing section, and click the "Cancel Subscription" button.</li>
            <li><strong>Contact Support:</strong> Email us at jordan.sinclair@du.edu with your cancellation request.</li>
          </ul>
          <p>No additional steps or explanations are required to cancel your subscription.</p>
        </section>

        <section>
          <h2>3. What Happens When You Cancel</h2>
          <p>When you cancel your Pro subscription:</p>
          <ul>
            <li><strong>Continued Access:</strong> You will continue to have full access to all Pro features until the end of your current billing period.</li>
            <li><strong>No Further Charges:</strong> You will not be charged again after your current billing period ends.</li>
            <li><strong>Automatic Downgrade:</strong> At the end of your current billing period, your account will automatically be downgraded to the Free plan.</li>
            <li><strong>Data Retention:</strong> Your saved summaries and account data will be retained and remain accessible on the Free plan (subject to Free plan limitations).</li>
          </ul>
        </section>

        <section>
          <h2>4. Billing Period Details</h2>
          <p>LightRead Pro subscriptions are billed on a monthly basis:</p>
          <ul>
            <li><strong>Monthly Plan:</strong> LightRead Pro subscriptions are billed monthly at the price shown at checkout.</li>
            <li><strong>Billing Cycle:</strong> Your billing period starts on the date you subscribe and renews monthly on that same date.</li>
            <li><strong>Pro-rata Refunds:</strong> We do not offer pro-rata refunds for partial months. When you cancel, you retain access until the end of your paid billing period.</li>
          </ul>
        </section>

        <section>
          <h2>5. Resubscribing</h2>
          <p>You can resubscribe to LightRead Pro at any time:</p>
          <ul>
            <li>Visit the Billing section in your account dashboard.</li>
            <li>Select the Pro plan to reactivate your subscription.</li>
            <li>Your Pro features will be immediately restored upon successful payment.</li>
            <li>Your previous saved summaries and preferences will be preserved.</li>
          </ul>
        </section>

        <section>
          <h2>6. Free Plan Details</h2>
          <p>After cancellation, you will have access to the Free plan, which includes:</p>
          <ul>
            <li>Text summarization of highlighted text.</li>
            <li>Up to 5 summaries per day.</li>
            <li>Popup display for easy viewing.</li>
            <li>Copy to clipboard functionality.</li>
          </ul>
          <p>The following features are exclusive to Pro subscribers:</p>
          <ul>
            <li>Up to 30 summaries per day.</li>
            <li>Summary history and saving.</li>
            <li>Adjustable summary lengths.</li>
            <li>Tone, style, and difficulty customization options.</li>
          </ul>
        </section>

        <section>
          <h2>7. Refund Policy</h2>
          <p>Subscription fees are non-refundable and we do not provide prorated refunds. We may issue refunds at our sole discretion in cases of billing errors, unauthorized charges, or prolonged service outages.</p>
          <ul>
            <li>If you experience technical issues that prevent you from using the service, please contact jordan.sinclair@du.edu and we may work with you to resolve the issue.</li>
            <li>In cases of billing errors or unauthorized charges, we may investigate and provide appropriate remedies.</li>
            <li>We do not offer refunds for partial subscription periods.</li>
          </ul>
        </section>

        <section>
          <h2>8. Account Deletion</h2>
          <p>If you wish to completely delete your LightRead account:</p>
          <ul>
            <li>Cancel your Pro subscription first (if applicable) to avoid future charges.</li>
            <li>Contact jordan.sinclair@du.edu to request account deletion. We will delete your account within 30 days of your request.</li>
            <li>All your data, including saved summaries, will be permanently deleted within 30 days of your request.</li>
            <li>Account deletion is permanent and cannot be undone.</li>
          </ul>
        </section>

        <section>
          <h2>9. Questions or Issues</h2>
          <p>If you have questions about cancellation, billing, or need assistance with your subscription, please contact us:</p>
          <ul>
            <li><strong>Email:</strong> jordan.sinclair@du.edu.</li>
            <li><strong>Response Time:</strong> We aim to respond to all inquiries within 24-48 hours.</li>
          </ul>
        </section>

        <div className="legal-footer">
          <Link to="/terms">View Terms of Service</Link>
          {' | '}
          <Link to="/privacy">View Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
};

export default CancellationPolicy;
