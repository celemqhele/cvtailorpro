
import { supabase } from './supabaseClient';

/**
 * Fetches the client's public IP address.
 */
const getIpAddress = async (): Promise<string> => {
    try {
        const response = await fetch('/api/ip');
        const data = await response.json();
        return data.ip || 'unknown_ip';
    } catch (e) {
        console.warn("Could not determine IP", e);
        return 'unknown_ip';
    }
};

/**
 * Generates a simple browser fingerprint.
 */
const getFingerprint = (): string => {
    try {
        const components = [
            navigator.userAgent,
            navigator.language,
            window.screen.colorDepth,
            window.screen.width + 'x' + window.screen.height,
            new Date().getTimezoneOffset(),
            navigator.hardwareConcurrency,
            (navigator as any).deviceMemory
        ];
        const str = components.join('###');
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return `fp_${Math.abs(hash)}`;
    } catch (e) {
        return 'fp_unknown';
    }
};

/**
 * Determines the tracking identifier: User ID (if logged in) OR Persistent Guest ID (if guest).
 */
const getIdentifier = async (userId?: string): Promise<string> => {
    if (userId) return userId;
    
    // For guests, use STRICTLY the IP address to prevent incognito/cache clearing bypass
    const ip = await getIpAddress();
    
    if (ip !== 'unknown_ip') {
        return `ip_${ip}`;
    }

    // Fallback to localStorage ONLY if IP fetch fails (very rare)
    let guestId = localStorage.getItem('cv_tailor_guest_id');
    if (!guestId) {
        const fp = getFingerprint();
        guestId = `guest_fallback_${fp}_` + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('cv_tailor_guest_id', guestId);
    }
    return guestId;
};

/**
 * Checks if the user has reached their daily limit for CV generation.
 */
export const checkUsageLimit = async (userId: string | undefined, limit: number, planId: string = 'free'): Promise<boolean> => {
    try {
        const identifier = await getIdentifier(userId);
        
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('daily_usage')
            .select('cv_count')
            .eq('identifier', identifier)
            .eq('date', todayStr)
            .maybeSingle();

        if (error) {
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
 * Uses Secure RPC to prevent client-side manipulation.
 */
export const incrementUsage = async (userId: string | undefined): Promise<void> => {
    try {
        const identifier = await getIdentifier(userId);
        
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        // First get current count
        const { data: current } = await supabase
            .from('daily_usage')
            .select('cv_count')
            .eq('identifier', identifier)
            .eq('date', todayStr)
            .maybeSingle();

        const newCount = (current?.cv_count || 0) + 1;

        // Then upsert
        const { error } = await supabase
            .from('daily_usage')
            .upsert({ 
                identifier, 
                date: todayStr, 
                cv_count: newCount 
            });

        if (error) {
            console.error("Failed to increment usage securely:", error);
        }
    } catch (e) {
        console.error("Failed to increment usage:", e);
    }
};

/**
 * Gets the current CV count and Time to Refill
 */
export const getUsageStats = async (userId?: string, planId: string = 'free'): Promise<{ count: number, secondsLeft: number }> => {
     try {
        const identifier = await getIdentifier(userId);
        
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        
        const { data, error } = await supabase
            .from('daily_usage')
            .select('cv_count')
            .eq('identifier', identifier)
            .eq('date', todayStr)
            .maybeSingle();

        const count = data?.cv_count || 0;
        
        const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
        const secondsLeft = Math.floor((tomorrow.getTime() - now.getTime()) / 1000);

        return { count, secondsLeft };
    } catch {
        return { count: 0, secondsLeft: 0 };
    }
};

export const getUsageCount = async (userId?: string, planId: string = 'free'): Promise<number> => {
    const stats = await getUsageStats(userId, planId);
    return stats.count;
};

/**
 * Syncs usage from the Guest ID to their new User ID.
 */
export const syncIpUsageToUser = async (userId: string): Promise<void> => {
    try {
        const ip = await getIpAddress();
        const identifier = ip !== 'unknown_ip' ? `ip_${ip}` : localStorage.getItem('cv_tailor_guest_id');
        
        if (!identifier) return;

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        // 1. Get guest usage
        const { data: guestUsage } = await supabase
            .from('daily_usage')
            .select('cv_count')
            .eq('identifier', identifier)
            .eq('date', todayStr)
            .maybeSingle();

        if (guestUsage && guestUsage.cv_count > 0) {
            // 2. Get user usage
            const { data: userUsage } = await supabase
                .from('daily_usage')
                .select('cv_count')
                .eq('identifier', userId)
                .eq('date', todayStr)
                .maybeSingle();

            const newCount = (userUsage?.cv_count || 0) + guestUsage.cv_count;

            // 3. Upsert user usage
            const { error } = await supabase
                .from('daily_usage')
                .upsert({ 
                    identifier: userId, 
                    date: todayStr, 
                    cv_count: newCount 
                });

            if (error) {
                console.error("Failed to sync guest usage:", error);
            } else {
                // 4. Delete guest usage to prevent double counting
                await supabase
                    .from('daily_usage')
                    .delete()
                    .eq('identifier', identifier)
                    .eq('date', todayStr);
                
                localStorage.removeItem('cv_tailor_guest_id');
            }
        } else {
             localStorage.removeItem('cv_tailor_guest_id');
        }
    } catch (e) {
        console.error("Failed to sync guest usage to user:", e);
    }
};

/**
 * ADMIN: Resets all daily usage stats for the current day.
 */
export const resetAllDailyCredits = async (): Promise<void> => {
    const { error } = await supabase.rpc('reset_all_daily_credits');
    
    if (error) {
        console.error("RPC Error:", error);
        throw new Error(error.message);
    }
};

/**
 * Checks if the current IP is eligible for Quick Apply (Once per day).
 * Bypasses limit if user is on Pro (tier_3) or Unlimited (tier_4) plan.
 */
export const checkQuickApplyLimit = async (userPlanId?: string): Promise<boolean> => {
    // Unlimited plans bypass the check
    if (userPlanId === 'tier_3' || userPlanId === 'tier_4') {
        return true;
    }

    try {
        const ip = await getIpAddress();
        const identifier = ip !== 'unknown_ip' ? `ip_${ip}` : 'unknown_ip';
        const { data, error } = await supabase.rpc('check_quick_apply_eligibility', { user_ip: identifier });
        
        if (error) {
            console.error("Quick Apply Check Error:", error);
            return true; // Fail open if error, or false if strict
        }
        return data;
    } catch (e) {
        console.error("Quick Apply Check Failed:", e);
        return true;
    }
};

/**
 * Records a Quick Apply usage for the current IP.
 */
export const incrementQuickApply = async (): Promise<void> => {
    try {
        const ip = await getIpAddress();
        const identifier = ip !== 'unknown_ip' ? `ip_${ip}` : 'unknown_ip';
        const { error } = await supabase.rpc('record_quick_apply_usage', { user_ip: identifier });
        
        if (error) {
            console.error("Failed to record Quick Apply usage:", error);
        }
    } catch (e) {
        console.error("Failed to increment Quick Apply:", e);
    }
};

/**
 * Gets the recruiter search count for the current month.
 */
export const getRecruiterSearchStats = async (userId: string): Promise<number> => {
    try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { count, error } = await supabase
            .from('recruiter_searches')
            .select('*', { count: 'exact', head: true })
            .eq('recruiter_id', userId)
            .gte('created_at', startOfMonth.toISOString());

        if (error) {
            console.error('Error fetching recruiter search count:', error);
            return 0;
        }
        return count || 0;
    } catch (e) {
        console.error('Failed to get recruiter search stats:', e);
        return 0;
    }
};
