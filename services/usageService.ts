
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
 * Checks if the user has reached their daily limit for CV generation.
 */
export const checkUsageLimit = async (userId: string | undefined, limit: number): Promise<boolean> => {
    try {
        const identifier = await getIdentifier(userId);
        const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        const { data, error } = await supabase
            .from('daily_usage')
            .select('cv_count')
            .eq('identifier', identifier)
            .eq('date', dateStr)
            .single();

        if (error) {
            // PGRST116 means no row found (count is effectively 0)
            if (error.code === 'PGRST116') {
                return 0 < limit;
            }
            console.warn("Usage check error:", error);
            return true; 
        }

        const currentCount = data?.cv_count || 0;
        return currentCount < limit;
    } catch (e) {
        return true;
    }
};

/**
 * Increments the CV usage counter.
 */
export const incrementUsage = async (userId: string | undefined): Promise<void> => {
    try {
        const identifier = await getIdentifier(userId);
        const dateStr = new Date().toISOString().split('T')[0];

        // 1. Try to fetch existing record
        const { data } = await supabase
            .from('daily_usage')
            .select('cv_count')
            .eq('identifier', identifier)
            .eq('date', dateStr)
            .single();

        if (data) {
            // 2. Update existing
            await supabase
                .from('daily_usage')
                .update({ cv_count: (data.cv_count || 0) + 1 })
                .eq('identifier', identifier)
                .eq('date', dateStr);
        } else {
            // 3. Insert new
            await supabase
                .from('daily_usage')
                .insert({ identifier, date: dateStr, cv_count: 1, search_count: 0 });
        }
    } catch (e) {
        console.error("Failed to increment usage:", e);
    }
};

/**
 * Gets the current CV count for display purposes
 */
export const getUsageCount = async (userId?: string): Promise<number> => {
     try {
        const identifier = await getIdentifier(userId);
        const dateStr = new Date().toISOString().split('T')[0];

        const { data } = await supabase
            .from('daily_usage')
            .select('cv_count')
            .eq('identifier', identifier)
            .eq('date', dateStr)
            .single();
        
        return data?.cv_count || 0;
    } catch {
        return 0;
    }
};

/**
 * CRITICAL: Syncs usage from the User's IP address to their new User ID.
 * This ensures that if a guest uses 5 credits then signs up, they still have 5 credits used.
 */
export const syncIpUsageToUser = async (userId: string): Promise<void> => {
    try {
        const ip = await getIpAddress();
        const dateStr = new Date().toISOString().split('T')[0];

        // 1. Get usage associated with IP
        const { data: ipData } = await supabase
            .from('daily_usage')
            .select('cv_count')
            .eq('identifier', ip)
            .eq('date', dateStr)
            .single();

        // If IP has usage...
        if (ipData && ipData.cv_count > 0) {
            
            // 2. Get usage associated with new User ID
            const { data: userData } = await supabase
                .from('daily_usage')
                .select('cv_count')
                .eq('identifier', userId)
                .eq('date', dateStr)
                .single();

            const userCount = userData?.cv_count || 0;

            // 3. If IP usage is higher (e.g. they just signed up), sync it to the user
            if (ipData.cv_count > userCount) {
                await supabase
                    .from('daily_usage')
                    .upsert({ 
                        identifier: userId, 
                        date: dateStr, 
                        cv_count: ipData.cv_count,
                        search_count: 0 
                    }, { onConflict: 'identifier,date' });
            }
        }
    } catch (e) {
        console.error("Failed to sync IP usage to user:", e);
    }
};

/**
 * ADMIN: Resets all daily usage stats for the current day.
 * Calls a Postgres function 'reset_all_daily_credits'
 */
export const resetAllDailyCredits = async (): Promise<void> => {
    const { error } = await supabase.rpc('reset_all_daily_credits');
    
    if (error) {
        console.error("RPC Error:", error);
        throw new Error(error.message);
    }
};
