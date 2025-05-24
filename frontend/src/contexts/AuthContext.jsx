/**
 * Authentication context and provider for the LightRead application.
 * Manages user authentication state and provides authentication methods.
 * @module AuthContext
 */
import { createContext, useContext, useState, useEffect } from 'react';
import { 
  signIn as supabaseSignIn, 
  signUp as supabaseSignUp, 
  signOut as supabaseSignOut, 
  getCurrentUser,
  onAuthStateChange 
} from '../lib/supabase';

/**
 * Context for authentication state and methods.
 * @type {React.Context<{
 *   user: object|null,
 *   loading: boolean,
 *   login: Function,
 *   signup: Function,
 *   logout: Function
 * }>}
 */
const AuthContext = createContext(null);

/**
 * Custom hook to access the auth context.
 * @returns {{
 *   user: object|null,
 *   loading: boolean,
 *   login: Function,
 *   signup: Function,
 *   logout: Function
 * }}
 * @throws {Error} If used outside of AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Provider component that wraps the app and makes auth object available to any
 * child component that calls useAuth().
 * @param {object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    /**
     * Checks for current user session on component mount
     */
    const checkUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Error checking auth state:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Subscribe to auth state changes
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Signs in a user with email and password
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @returns {Promise<object>} Authentication result
   * @throws {Error} If sign in fails
   */
  const login = async (email, password) => {
    try {
      const result = await supabaseSignIn(email, password);
      if (result.error) {
        throw result.error;
      }
      setUser(result.data?.user || null);
      return result;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  /**
   * Creates a new user account
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @returns {Promise<object>} Sign up result
   * @throws {Error} If sign up fails
   */
  const signup = async (email, password) => {
    try {
      const result = await supabaseSignUp(email, password);
      if (result.error) {
        throw result.error;
      }
      return result;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  /**
   * Signs out the current user
   * @returns {Promise<void>}
   * @throws {Error} If sign out fails
   */
  const logout = async () => {
    try {
      const { error } = await supabaseSignOut();
      if (error) {
        throw error;
      }
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    login,
    signup,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 