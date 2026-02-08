
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
 * Checks if the user has reached their daily limit for a specific action type.
 */
export const checkUsageLimit = async (userId: string | undefined, limit: number, type: 'cv' | 'search'): Promise<boolean> => {
    try {
        const identifier = await getIdentifier(userId);
        const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        const { data, error } = await supabase
            .from('daily_usage')
            .select('cv_count, search_count')
            .eq('identifier', identifier)
            .eq('date', dateStr)
            .single();

        if (error) {
            // PGRST116 means no row found (count is effectively 0)
            if (error.code === 'PGRST116') {
                // If limit is 0, 0 < 0 is false. If limit > 0, 0 < limit is true.
                return 0 < limit;
            }
            
            console.warn("Usage check error:", error);
            // On other errors, we might fail open or closed. Failing open for now to avoid blocking on DB hiccups.
            return true; 
        }

        const currentCount = type === 'cv' ? (data?.cv_count || 0) : (data?.search_count || 0);
        return currentCount < limit;
    } catch (e) {
        return true;
    }
};

/**
 * Increments the usage counter for the current identifier + date + type.
 */
export const incrementUsage = async (userId: string | undefined, type: 'cv' | 'search'): Promise<void> => {
    try {
        const identifier = await getIdentifier(userId);
        const dateStr = new Date().toISOString().split('T')[0];

        // 1. Try to fetch existing record
        const { data } = await supabase
            .from('daily_usage')
            .select('cv_count, search_count')
            .eq('identifier', identifier)
            .eq('date', dateStr)
            .single();

        if (data) {
            // 2. Update existing
            const updatePayload = type === 'cv' 
                ? { cv_count: (data.cv_count || 0) + 1 }
                : { search_count: (data.search_count || 0) + 1 };

            await supabase
                .from('daily_usage')
                .update(updatePayload)
                .eq('identifier', identifier)
                .eq('date', dateStr);
        } else {
            // 3. Insert new
            const insertPayload = type === 'cv'
                ? { identifier, date: dateStr, cv_count: 1, search_count: 0 }
                : { identifier, date: dateStr, cv_count: 0, search_count: 1 };

            await supabase
                .from('daily_usage')
                .insert(insertPayload);
        }
    } catch (e) {
        console.error("Failed to increment usage:", e);
    }
};

/**
 * Gets the current counts for display purposes
 */
export const getUsageCount = async (userId?: string): Promise<{ cv: number, search: number }> => {
     try {
        const identifier = await getIdentifier(userId);
        const dateStr = new Date().toISOString().split('T')[0];

        const { data } = await supabase
            .from('daily_usage')
            .select('cv_count, search_count')
            .eq('identifier', identifier)
            .eq('date', dateStr)
            .single();
        
        return {
            cv: data?.cv_count || 0,
            search: data?.search_count || 0
        };
    } catch {
        return { cv: 0, search: 0 };
    }
};
