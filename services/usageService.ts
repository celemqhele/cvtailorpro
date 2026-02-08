
import { supabase } from './supabaseClient';

/**
 * Fetches the client's public IP address.
 */
const getIpAddress = async (): Promise<string> => {
    try {
        const response = await fetch('https://api64.ipify.org?format=json');
        const data = await response.json();
        return data.ip || 'unknown_ip';
    } catch (e) {
        console.warn("Could not determine IP", e);
        return 'unknown_ip';
    }
};

/**
 * Determines the tracking identifier: User ID (if logged in) OR IP Address (if guest).
 */
const getIdentifier = async (userId?: string): Promise<string> => {
    if (userId) return userId;
    return await getIpAddress();
};

/**
 * Checks if the user has reached their daily limit.
 */
export const checkUsageLimit = async (userId: string | undefined, limit: number): Promise<boolean> => {
    try {
        const identifier = await getIdentifier(userId);
        const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        const { data, error } = await supabase
            .from('daily_usage')
            .select('usage_count')
            .eq('identifier', identifier)
            .eq('date', dateStr)
            .single();

        if (error) {
            // PGRST116 means no row found, which is fine (count is 0)
            if (error.code === 'PGRST116') return true;
            
            console.warn("Usage check error:", error);
            return true; // Fail open on DB error
        }

        return (data?.usage_count || 0) < limit;
    } catch (e) {
        return true;
    }
};

/**
 * Increments the usage counter for the current identifier + date.
 */
export const incrementUsage = async (userId?: string): Promise<void> => {
    try {
        const identifier = await getIdentifier(userId);
        const dateStr = new Date().toISOString().split('T')[0];

        // 1. Try to fetch existing record
        const { data } = await supabase
            .from('daily_usage')
            .select('usage_count')
            .eq('identifier', identifier)
            .eq('date', dateStr)
            .single();

        if (data) {
            // 2. Update existing
            await supabase
                .from('daily_usage')
                .update({ usage_count: data.usage_count + 1 })
                .eq('identifier', identifier)
                .eq('date', dateStr);
        } else {
            // 3. Insert new
            await supabase
                .from('daily_usage')
                .insert({ identifier, date: dateStr, usage_count: 1 });
        }
    } catch (e) {
        console.error("Failed to increment usage:", e);
    }
};

/**
 * Gets the current count for display purposes
 */
export const getUsageCount = async (userId?: string): Promise<number> => {
     try {
        const identifier = await getIdentifier(userId);
        const dateStr = new Date().toISOString().split('T')[0];

        const { data } = await supabase
            .from('daily_usage')
            .select('usage_count')
            .eq('identifier', identifier)
            .eq('date', dateStr)
            .single();
        
        return data?.usage_count || 0;
    } catch {
        return 0;
    }
};
