/**
 * Main entry point for the LightRead application.
 * Sets up React Router for client-side routing and wraps the app with necessary providers.
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Dashboard from './pages/Dashboard/Dashboard.jsx'
import TermsOfService from './pages/Legal/TermsOfService'
import PrivacyPolicy from './pages/Legal/PrivacyPolicy'
import DashboardLayout from './components/Dashboard/DashboardLayout.jsx'
import Summaries from './pages/Dashboard/Summaries.jsx'
import Settings from './pages/Dashboard/Settings.jsx'
import Billing from './pages/Dashboard/Billing.jsx'
import Feedback from './pages/Dashboard/Feedback.jsx'
import SetupGuide from './components/SetupGuide/SetupGuide.jsx'
import EmailVerification from './pages/EmailVerification.jsx'

/**
 * Router configuration for the application.
 * Defines the main routes and their corresponding components.
 * 
 * Routes:
 * - / : Landing page
 * - /dashboard: Protected dashboard area
 *   - / (index): Summaries view
 *   - /summaries: Summaries view
 *   - /settings: User settings
 *   - /billing: Subscription management
 *   - /feedback: Feedback form
 * - /terms: Terms of Service
 * - /privacy: Privacy Policy
 * - /verify-email: Email verification page
 */
const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/onboarding',
    element: <SetupGuide />,
  },
  {
    path: '/verify-email',
    element: <EmailVerification />,
  },
  {
    path: '/dashboard',
    element: <DashboardLayout />,
    children: [
      {
        index: true,
        element: <Summaries />,
      },
      {
        path: 'summaries',
        element: <Summaries />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
      {
        path: 'billing',
        element: <Billing />,
      },
      {
        path: 'feedback',
        element: <Feedback />,
      },
    ],
  },
  {
    path: '/terms',
    element: <TermsOfService />,
  },
  {
    path: '/privacy',
    element: <PrivacyPolicy />,
  }
])

// Initialize React with StrictMode and required providers
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>,
)
