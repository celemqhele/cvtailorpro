
import { supabase } from './supabaseClient';

/**
 * Service to log all administrative actions for audit and context.
 */
export const adminLogService = {
  /**
   * Records an admin action in the database.
   */
  async logAction(action: string, targetId?: string, details?: any) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Only log if the user is the verified admin
      if (!user || user.email !== 'mqhele03@gmail.com') return;

      const { error } = await supabase.from('admin_logs').insert({
        admin_email: user.email,
        action,
        target_id: targetId,
        details: details || {}
      });

      if (error) {
        console.error('Failed to record admin log:', error);
      }
    } catch (err) {
      console.error('Admin logging error:', err);
    }
  },

  /**
   * Fetches recent admin logs.
   */
  async getLogs(limit = 100) {
    const { data, error } = await supabase
      .from('admin_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Failed to fetch admin logs:', error);
      return [];
    }
    return data;
  }
};
