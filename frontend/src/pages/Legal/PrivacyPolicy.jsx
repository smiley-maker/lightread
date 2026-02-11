import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Legal.css';
import logo from '../../assets/LightReadLogo.svg';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="legal-page">
      <div className="legal-header">
        <img src={logo} alt="LightRead logo" onClick={() => navigate('/')} />
      </div>
      <div className="legal-container">
        <h1>Privacy Policy</h1>
        <p className="last-updated">Last Updated: February 11, 2026</p>

        <section>
          <h2>1. Introduction</h2>
          <p>At LightRead, we take your privacy seriously. This Privacy Policy explains how we collect, use, and protect your information when you use our Chrome extension and website.</p>
        </section>

        <section>
          <h2>2. Information We Collect</h2>
          <h3>Account Information</h3>
          <ul>
            <li>Email address (for authentication)</li>
            <li>Password (encrypted)</li>
            <li>User preferences and settings</li>
          </ul>

          <h3>Usage Information</h3>
          <ul>
            <li>Number of summaries generated</li>
            <li>Character count of processed text</li>
            <li>User preferences (theme, summary length, etc.)</li>
          </ul>

          <h3>Optional Information</h3>
          <ul>
            <li>Saved summaries (only if you choose to save them)</li>
            <li>URLs of pages where summaries were generated (only if you save the summary and have enabled link saving)</li>
          </ul>
        </section>

        <section>
          <h2>3. How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul>
            <li>Provide and maintain our summarization service</li>
            <li>Track usage limits based on your subscription</li>
            <li>Improve our service and user experience</li>
            <li>Communicate important updates or changes</li>
            <li>Process payments and manage subscriptions</li>
          </ul>
        </section>

        <section>
          <h2>4. Data Processing and Storage</h2>
          <h3>Text Processing</h3>
          <p>Important information about how we handle your text:</p>
          <ul>
            <li>Text selected for summarization is sent to third-party AI APIs (currently Google's Gemini)</li>
            <li>Original text is only stored temporarily during processing</li>
            <li>Original text is automatically deleted when you close the summary popup</li>
            <li>We do not maintain logs of processed text</li>
          </ul>

          <h3>Saved Summaries</h3>
          <p>If you choose to save a summary:</p>
          <ul>
            <li>Only the generated summary is stored in our database</li>
            <li>The source URL is stored for reference if desired (only if you have enabled link saving)</li>
            <li>You can delete saved summaries at any time</li>
          </ul>
        </section>

        <section>
          <h2>5. Data Security</h2>
          <p>We implement several security measures to protect your information:</p>
          <ul>
            <li>All data is encrypted in transit and at rest</li>
            <li>We use secure cloud infrastructure providers</li>
            <li>Regular security audits and updates</li>
            <li>Limited employee access to user data</li>
          </ul>
        </section>

        <section>
          <h2>6. Third-Party Services</h2>
          <p>We use the following third-party services:</p>
          <ul>
            <li>Google Gemini API for text summarization</li>
            <li>Supabase for user authentication and data storage</li>
            <li>Stripe for payment processing</li>
          </ul>
          <p>Each service has its own privacy policy and data handling practices.</p>
        </section>

        <section>
          <h2>7. Transparency and Open Source</h2>
          <p>As part of our commitment to transparency, LightRead's source code is open source and available for public review on GitHub. This allows users and security researchers to verify our privacy practices and data handling procedures. While our code is open source, it remains subject to our licensing terms and intellectual property rights.</p>
        </section>

        <section>
          <h2>8. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal information</li>
            <li>Delete your account and associated data</li>
            <li>Export your saved summaries</li>
            <li>Opt-out of marketing communications</li>
          </ul>
        </section>

        <section>
          <h2>9. Data Retention</h2>
          <p>We retain your information as follows:</p>
          <ul>
            <li>Account information: Until you delete your account</li>
            <li>Saved summaries: Until you delete them or your account</li>
            <li>Usage statistics: Up to 2 months</li>
            <li>Payment information: As required by law</li>
          </ul>
        </section>

        <section>
          <h2>10. Children's Privacy</h2>
          <p>LightRead is not intended for use by children under 13. We do not knowingly collect information from children under 13.</p>
        </section>

        <section>
          <h2>11. Changes to Privacy Policy</h2>
          <p>We may update this privacy policy from time to time. We will notify users of any material changes via email or through our service.</p>
        </section>

        <section>
          <h2>12. Contact Us</h2>
          <p>If you have questions about our Privacy Policy or your data, please contact us at jordan.sinclair@du.edu</p>
        </section>

        <div className="legal-footer">
          <Link to="/terms">View Terms of Service</Link>
          {' | '}
          <Link to="/cancellation-policy">View Cancellation Policy</Link>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy; 