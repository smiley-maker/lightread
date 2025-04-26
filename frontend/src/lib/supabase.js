import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client with fallback values for development
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

// Flag to determine if we're using a real Supabase instance
const isUsingRealSupabase = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;

// Manual flag to force using mock auth (for demo purposes)
const FORCE_MOCK_AUTH = false; // Set to false to attempt real auth if credentials are available

// Provide a helpful warning for missing environment variables in development
if (!isUsingRealSupabase || FORCE_MOCK_AUTH) {
  console.warn(
    `${!isUsingRealSupabase ? 'Supabase environment variables are missing.' : 'Mock auth is forced.'} Using mock authentication for demo purposes.`
  );
}

// Create the Supabase client with a singleton pattern to prevent multiple instances
let supabaseInstance = null;

const getSupabase = () => {
  if (supabaseInstance === null) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true, 
        storageKey: 'lightread-auth'
      }
    });
  }
  return supabaseInstance;
};

export const supabase = getSupabase();

// Mock user for demo purposes
const mockUser = {
  id: 'mock-user-id',
  email: 'demo@example.com',
  user_metadata: {
    name: 'Demo User'
  }
};

// Authentication helpers
export const signUp = async (email, password) => {
  // Use mock auth if forced or if real credentials aren't available
  if (FORCE_MOCK_AUTH || !isUsingRealSupabase) {
    return {
      data: {
        user: { ...mockUser, email },
        session: { access_token: 'mock-token' }
      },
      error: null
    };
  }
  
  // Try real auth first
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });
    
    if (error) {
      // Fall back to mock auth on error
      return {
        data: {
          user: { ...mockUser, email },
          session: { access_token: 'mock-token' }
        },
        error: null
      };
    }
    
    return { data, error };
  } catch (err) {
    // Fall back to mock auth on exception
    return {
      data: {
        user: { ...mockUser, email },
        session: { access_token: 'mock-token' }
      },
      error: null
    };
  }
};

export const signIn = async (email, password) => {
  // Use mock auth if forced or if real credentials aren't available
  if (FORCE_MOCK_AUTH || !isUsingRealSupabase) {
    const mockUserData = { ...mockUser, email };
    // Store mock user in localStorage to simulate persistence
    localStorage.setItem('lightread-mock-user', JSON.stringify(mockUserData));
    return {
      data: {
        user: mockUserData,
        session: { access_token: 'mock-token' }
      },
      error: null
    };
  }
  
  // Try real auth first
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      // Fall back to mock auth on error
      return {
        data: {
          user: { ...mockUser, email },
          session: { access_token: 'mock-token' }
        },
        error: null
      };
    }
    
    return { data, error };
  } catch (err) {
    // Fall back to mock auth on exception
    return {
      data: {
        user: { ...mockUser, email },
        session: { access_token: 'mock-token' }
      },
      error: null
    };
  }
};

export const signOut = async () => {
  if (FORCE_MOCK_AUTH || !isUsingRealSupabase) {
    // Remove mock user from localStorage
    localStorage.removeItem('lightread-mock-user');
    return { error: null };
  }
  
  try {
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (err) {
    return { error: null };
  }
};

export const getCurrentUser = async () => {
  if (FORCE_MOCK_AUTH || !isUsingRealSupabase) {
    // Check for a mock user in localStorage to simulate persistence
    const mockUserSession = localStorage.getItem('lightread-mock-user');
    return mockUserSession ? JSON.parse(mockUserSession) : null;
  }
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (err) {
    return null;
  }
};

export const onAuthStateChange = (callback) => {
  if (FORCE_MOCK_AUTH || !isUsingRealSupabase) {
    return { data: { subscription: { unsubscribe: () => {} } } };
  }
  
  try {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  } catch (err) {
    return { data: { subscription: { unsubscribe: () => {} } } };
  }
};

// Dashboard data functions
export const getUserSummaries = async (userId, options = {}) => {
  const { pageSize = 10, cursor = null } = options;
  
  if (FORCE_MOCK_AUTH || !isUsingRealSupabase) {
    // Return mock summaries for demo with pagination
    const mockSummaries = [
      { id: 1, user_id: userId, summary: "The article discusses the impact of artificial intelligence on modern workspace efficiency, highlighting both productivity gains and potential concerns about job displacement.", created_at: new Date().toISOString() },
      { id: 2, user_id: userId, summary: "Research findings indicate that regular meditation can significantly reduce stress levels and improve cognitive function in adults over a 12-week period.", created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
      { id: 3, user_id: userId, summary: "The company announced a new sustainable initiative that aims to reduce carbon emissions by 50% before 2030 through innovative manufacturing processes.", created_at: new Date(Date.now() - 86400000 * 7).toISOString() }
    ];
    
    return {
      data: mockSummaries.slice(0, pageSize),
      hasMore: mockSummaries.length > pageSize,
      nextCursor: mockSummaries.length > pageSize ? mockSummaries[pageSize - 1].created_at : null,
      error: null
    };
  }
  
  try {
    let query = supabase
      .from('summaries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(pageSize + 1); // Get one extra to check if there are more
      
    if (cursor) {
      query = query.lt('created_at', cursor); // Get items created before the cursor
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    const hasMore = data.length > pageSize;
    const summaries = hasMore ? data.slice(0, -1) : data; // Remove the extra item if we have more
    
    return {
      data: summaries,
      hasMore,
      nextCursor: hasMore ? summaries[summaries.length - 1].created_at : null,
      error: null
    };
  } catch (err) {
    console.error('Error fetching summaries:', err);
    return { data: null, error: err };
  }
};

export const getUserSubscription = async (userId) => {
  if (FORCE_MOCK_AUTH || !isUsingRealSupabase) {
    // Return mock subscription for demo
    return {
      data: {
        id: 1,
        user_id: userId,
        plan_type: 'free',
        status: 'active',
        end_date: new Date(Date.now() + 86400000 * 30).toISOString(),
        created_at: new Date(Date.now() - 86400000 * 15).toISOString()
      },
      error: null
    };
  }
  
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (error) {
      // If no subscription found, return a default free plan
      if (error.code === 'PGRST116') {
        return {
          data: {
            plan_type: 'free',
            status: 'active',
            end_date: null,
            created_at: new Date().toISOString()
          },
          error: null
        };
      }
      throw error;
    }
    
    return { data, error };
  } catch (err) {
    console.error('Error fetching subscription:', err);
    return { 
      data: {
        plan_type: 'free',
        status: 'active',
        end_date: null,
        created_at: new Date().toISOString()
      }, 
      error: null 
    };
  }
};

export const getUserDailyUsage = async (userId, days = 7) => {
  if (FORCE_MOCK_AUTH || !isUsingRealSupabase) {
    // Return mock usage data for demo
    const mockData = [];
    for (let i = 0; i < days; i++) {
      mockData.push({
        id: i + 1,
        user_id: userId,
        date: new Date(Date.now() - 86400000 * i).toISOString().split('T')[0],
        summaries_count: Math.floor(Math.random() * 5)
      });
    }
    
    return {
      data: mockData,
      error: null
    };
  }
  
  try {
    // Get date for 'days' ago
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const { data, error } = await supabase
      .from('daily_usage')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });
      
    return { data, error };
  } catch (err) {
    console.error('Error fetching daily usage:', err);
    return { data: null, error: err };
  }
};

// Get user settings
export const getUserSettings = async () => {
  if (FORCE_MOCK_AUTH || !isUsingRealSupabase) {
    // Mock response for dev/testing
    return {
      data: {
        summary_length: 'medium',
        theme_type: 'light',
        summary_tone: 'neutral',
        summary_difficulty: 'medium'
      },
      error: null
    };
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('user_settings')
      .select('preferred_summary_length, theme, summary_tone, summary_difficulty, save_source_url, created_at, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;

    // Return default settings if none exist
    return {
      data: data ? {
        summary_length: data.preferred_summary_length,
        theme_type: data.theme,
        summary_tone: data.summary_tone,
        summary_difficulty: data.summary_difficulty,
        save_source_url: data.save_source_url ?? true
      } : {
        summary_length: 'medium',
        theme_type: 'light',
        summary_tone: 'neutral',
        summary_difficulty: 'medium',
        save_source_url: true
      },
      error: null
    };
  } catch (err) {
    console.error('Error fetching user settings:', err);
    // Return default settings on error
    return {
      data: {
        summary_length: 'medium',
        theme_type: 'light',
        summary_tone: 'neutral',
        summary_difficulty: 'medium'
      },
      error: err
    };
  }
};

// Update user settings
export const updateUserSettings = async (settings) => {
  if (FORCE_MOCK_AUTH || !isUsingRealSupabase) {
    // Mock response for dev/testing
    return {
      data: {
        ...settings,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      error: null
    };
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Check if user already has settings
    const { data: existingSettings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    let result;
    
    if (existingSettings) {
      // Update existing settings
      result = await supabase
        .from('user_settings')
        .update({ 
          preferred_summary_length: settings.summary_length,
          theme: settings.theme_type,
          summary_tone: settings.summary_tone,
          summary_difficulty: settings.summary_difficulty,
          save_source_url: settings.save_source_url,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .single();
    } else {
      // Create new settings
      result = await supabase
        .from('user_settings')
        .insert([{ 
          user_id: user.id,
          preferred_summary_length: settings.summary_length,
          theme: settings.theme_type,
          summary_tone: settings.summary_tone,
          summary_difficulty: settings.summary_difficulty,
          save_source_url: settings.save_source_url,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();
    }

    if (result.error) {
      console.error('Database error:', result.error);
      throw result.error;
    }

    // Map the response back to UI-friendly types
    return {
      data: {
        summary_length: result.data.preferred_summary_length,
        theme_type: result.data.theme,
        summary_tone: result.data.summary_tone,
        summary_difficulty: result.data.summary_difficulty
      },
      error: null
    };
  } catch (err) {
    console.error('Error updating user settings:', err);
    return {
      data: null,
      error: err
    };
  }
};

// Update user subscription
export const updateUserSubscription = async (userId, planType) => {
  if (FORCE_MOCK_AUTH || !isUsingRealSupabase) {
    // Return mock subscription data for demo
    return {
      data: {
        id: 1,
        user_id: userId,
        plan_type: planType,
        status: 'active',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000 * 30).toISOString()
      },
      error: null
    };
  }
  
  try {
    // This implementation works, but maybe revisit keeping past subscriptions and marking them as cancelled
    // First mark any existing active subscriptions as inactive
//    await supabase
//      .from('subscriptions')
//      .update({ status: 'cancelled' })
//      .eq('user_id', userId)
//      .eq('status', 'active');
    
    // Create new subscription
    const result = await supabase
      .from('subscriptions')
      .update({
        plan_type: planType,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000 * 30).toISOString()
      })
      .eq('user_id', userId)
      .eq('status', 'active')
      .select()
      .single();
    
    return result;
  } catch (err) {
    console.error('Error updating subscription:', err);
    return { data: null, error: err };
  }
};

// Get dropdown options
export const getDropdownOptions = async () => {
  if (FORCE_MOCK_AUTH || !isUsingRealSupabase) {
    // Return mock dropdown options
    return {
      data: {
        summary_length: ['short', 'medium', 'long'],
        theme_type: ['light', 'dark', 'system'],
        summary_tone: ['neutral', 'excited', 'formal', 'casual'],
        summary_difficulty: ['eli5', 'eli10', 'advanced']
      },
      error: null
    };
  }
  
  try {
    // Get summary_length options
    const { data: lengthData, error: lengthError } = await supabase
      .from('summary_length')
      .select('value');
      
    if (lengthError) throw lengthError;
    
    // Get theme_type options
    const { data: themeData, error: themeError } = await supabase
      .from('theme_type')
      .select('value');
      
    if (themeError) throw themeError;
    
    // Get summary_tone options
    const { data: toneData, error: toneError } = await supabase
      .from('summary_tone')
      .select('value');
      
    if (toneError) throw toneError;
    
    // Get summary_difficulty options
    const { data: difficultyData, error: difficultyError } = await supabase
      .from('summary_difficulty')
      .select('value');
      
    if (difficultyError) throw difficultyError;
    
    // Format data
    return {
      data: {
        summary_length: lengthData.map(item => item.value),
        theme_type: themeData.map(item => item.value),
        summary_tone: toneData.map(item => item.value),
        summary_difficulty: difficultyData.map(item => item.value)
      },
      error: null
    };
  } catch (err) {
    console.error('Error fetching dropdown options:', err);
    return { 
      data: {
        summary_length: ['short', 'medium', 'long'],
        theme_type: ['light', 'dark', 'system'],
        summary_tone: ['neutral', 'excited', 'formal', 'casual'],
        summary_difficulty: ['eli5', 'eli10', 'advanced']
      }, 
      error: err 
    };
  }
};

export const getUserPlan = async () => {
  if (FORCE_MOCK_AUTH || !isUsingRealSupabase) {
    // Mock response for dev/testing
    return {
      data: {
        id: 'mock-id',
        user_id: 'mock-user-id',
        plan_type: 'free',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      error: null
    };
  }

  try {
    const session = await getCurrentUser();
    if (!session) {
      return { data: null, error: 'User not authenticated.' };
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', session.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      // User doesn't have a plan yet, default to free
      const defaultPlan = {
        user_id: session.id,
        plan_type: 'free',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      return { data: defaultPlan, error: null };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error getting user plan:', err);
    return { data: null, error: err };
  }
};

export const updateUserPlan = async (planType) => {
  if (FORCE_MOCK_AUTH || !isUsingRealSupabase) {
    // Mock response for dev/testing
    return {
      data: {
        id: 'mock-id',
        user_id: 'mock-user-id',
        plan_type: planType,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      error: null
    };
  }

  try {
    const session = await getCurrentUser();
    if (!session) {
      return { data: null, error: 'User not authenticated.' };
    }

    // Check if user already has a plan
    const { data: existingPlan } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', session.id)
      .maybeSingle();

    const now = new Date().toISOString();
    
    if (existingPlan) {
      // Update existing plan
      const { data, error } = await supabase
        .from('subscriptions')
        .update({
          plan_type: planType,
          updated_at: now
        })
        .eq('id', existingPlan.id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } else {
      // Create new plan
      const { data, error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: session.id,
          plan_type: planType,
          created_at: now,
          updated_at: now
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    }
  } catch (err) {
    console.error('Error updating user plan:', err);
    return { data: null, error: err };
  }
};

// Get available options for settings
export const getSettingsOptions = async () => {
  if (FORCE_MOCK_AUTH || !isUsingRealSupabase) {
    // Mock response for dev/testing
    return {
      data: {
        summary_length: ['short', 'medium', 'long'],
        theme_type: ['light', 'dark', 'system'],
        summary_tone: ['neutral', 'excited', 'formal', 'casual'],
        summary_difficulty: ['simple', 'medium', 'advanced', 'eli5'],
        plan_type: ['free', 'pro'],
        subscription_state: ['active', 'inactive', 'cancelled']
      },
      error: null
    };
  }

  try {
    // Call the database function to get enum values
    const { data: enumData, error: enumError } = await supabase
      .rpc('get_enum_values');

    if (enumError) throw enumError;

    // Convert the array response to an object
    const options = {
      summary_length: [],
      summary_difficulty: [],
      summary_tone: [],
      theme_type: [],
      plan_type: [],
      subscription_state: []
    };

    if (enumData && Array.isArray(enumData)) {
      enumData.forEach(item => {
        if (item && item.enum_name && item.enum_values && options.hasOwnProperty(item.enum_name)) {
          options[item.enum_name] = item.enum_values;
        }
      });
    }

    return {
      data: options,
      error: null
    };
  } catch (err) {
    console.error('Error fetching settings options:', err);
    // Return default options on error
    return {
      data: {
        summary_length: ['short', 'medium', 'long'],
        theme_type: ['light', 'dark', 'system'],
        summary_tone: ['neutral', 'excited', 'formal', 'casual'],
        summary_difficulty: ['simple', 'medium', 'advanced', 'eli5'],
        plan_type: ['free', 'pro'],
        subscription_state: ['active', 'inactive', 'cancelled']
      },
      error: err
    };
  }
};

// Deactivate user account
export const deactivateAccount = async () => {
  if (FORCE_MOCK_AUTH || !isUsingRealSupabase) {
    return { error: null };
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Update subscription status to cancelled
    const { error: subError } = await supabase
      .from('subscriptions')
      .update({ 
        status: 'cancelled',
        plan_type: 'free',
        cancelled_at: new Date().toISOString(),
        scheduled_deletion: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString() // 6 months from now
      })
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (subError) throw subError;

    return { error: null };
  } catch (err) {
    console.error('Error deactivating account:', err);
    return { error: err };
  }
};

// Delete user account
export const deleteAccount = async () => {
  if (FORCE_MOCK_AUTH || !isUsingRealSupabase) {
    return { error: null };
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Delete user's data from all tables
    const tables = ['summaries', 'user_settings', 'subscriptions', 'daily_usage'];
    
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
    }

    // Delete the user's auth account
    const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
    if (authError) throw authError;

    return { error: null };
  } catch (err) {
    console.error('Error deleting account:', err);
    return { error: err };
  }
}; 