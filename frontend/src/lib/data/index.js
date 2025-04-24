import { supabase } from '../supabase';
import { z } from 'zod';

// Schema definitions
const SettingsSchema = z.object({
  preferred_summary_length: z.enum(['short', 'medium', 'long']),
  theme: z.enum(['light', 'dark', 'system']),
  summary_tone: z.enum(['friendly', 'professional', 'casual', 'formal']),
  summary_difficulty: z.enum(['simple', 'medium', 'advanced', 'eli5']),
  created_at: z.string().optional(),
  updated_at: z.string().optional()
});

const SubscriptionSchema = z.object({
  plan_type: z.enum(['free', 'pro']),
  status: z.enum(['active', 'inactive', 'cancelled']),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional()
});

class DataService {
  static async getUserSettings(userId) {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    return SettingsSchema.parse(data);
  }

  static async updateUserSettings(userId, settings) {
    const validatedSettings = SettingsSchema.parse(settings);
    
    const { data, error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        ...validatedSettings,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return SettingsSchema.parse(data);
  }

  static async getUserSubscription(userId) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();
    
    if (error) throw error;
    return data ? SubscriptionSchema.parse(data) : null;
  }

  static async updateUserSubscription(userId, subscription) {
    const validatedSubscription = SubscriptionSchema.parse(subscription);
    
    const { data, error } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        ...validatedSubscription,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return SubscriptionSchema.parse(data);
  }

  static async getUserSummaries(userId, limit = 10, offset = 0) {
    const { data, error } = await supabase
      .from('summaries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) throw error;
    return data;
  }

  static async getUserDailyUsage(userId, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const { data, error } = await supabase
      .from('daily_usage')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });
    
    if (error) throw error;
    return data;
  }
}

export default DataService; 