/**
 * Main entry point for the LightRead application.
 * Sets up React Router for client-side routing and wraps the app with necessary providers.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import DashboardLayout from './components/Dashboard/DashboardLayout.jsx'
import Summaries from './pages/Dashboard/Summaries.jsx'
import Settings from './pages/Dashboard/Settings.jsx'
import Billing from './pages/Dashboard/Billing.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'

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
 */
const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
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
    ],
  },
])

// Initialize React with StrictMode and required providers
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)
