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
import Welcome from './pages/Onboarding/Welcome.jsx'
import PlanSelection from './pages/Onboarding/PlanSelection.jsx'
import HowItWorks from './pages/Onboarding/HowItWorks.jsx'
import StripeSuccess from './pages/Onboarding/StripeSuccess.jsx'

/**
 * Router configuration defines all application routes:
 * - / : Landing page
 * - /dashboard : Main dashboard (redirects to summaries)
 * - /dashboard/summaries : User's summary history
 * - /dashboard/settings : User preferences and configuration
 * - /dashboard/billing : Subscription management
 * - /onboarding/* : Multi-step onboarding flow
 *   - /onboarding/welcome : Initial welcome page
 *   - /onboarding/plan-selection : Choose free or pro plan
 *   - /onboarding/how-it-works : Instructions and demo
 *   - /onboarding/stripe-success : Payment confirmation and redirect
 * - /terms : Terms of Service
 * - /privacy : Privacy Policy
 */
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/dashboard",
    element: <DashboardLayout />,
    children: [
      {
        index: true,
        element: <Dashboard />
      },
      {
        path: "summaries",
        element: <Summaries />
      },
      {
        path: "settings", 
        element: <Settings />
      },
      {
        path: "billing",
        element: <Billing />
      }
    ]
  },
  {
    path: "/onboarding/welcome",
    element: <Welcome />
  },
  {
    path: "/onboarding/plan-selection", 
    element: <PlanSelection />
  },
  {
    path: "/onboarding/how-it-works",
    element: <HowItWorks />
  },
  {
    path: "/onboarding/stripe-success",
    element: <StripeSuccess />
  },
  {
    path: "/terms",
    element: <TermsOfService />
  },
  {
    path: "/privacy",
    element: <PrivacyPolicy />
  }
]);

// Initialize React with StrictMode and required providers
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>,
)

