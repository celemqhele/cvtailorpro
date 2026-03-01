
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
    
    // For guests, use the IP address + Fingerprint to prevent incognito/cache clearing bypass
    const ip = await getIpAddress();
    const fp = getFingerprint();
    
    if (ip !== 'unknown_ip') {
        // Use a combination of IP and fingerprint for better accuracy
        return `guest_${ip}_${fp}`;
    }

    // Fallback to localStorage ONLY if IP fetch fails (very rare)
    let guestId = localStorage.getItem('cv_tailor_guest_id');
    if (!guestId) {
        guestId = `guest_fallback_${fp}_` + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('cv_tailor_guest_id', guestId);
    }
    return guestId;
};

/**
 * Checks if the user has reached their daily limit for CV generation.
 */
export const checkUsageLimit = async (userId: string | undefined, limit: number): Promise<boolean> => {
    try {
        const identifier = await getIdentifier(userId);
        
        // Secure RPC call
        const { data, error } = await supabase
            .rpc('get_user_usage_stats', { user_identifier: identifier });

        if (error) {
            console.warn("Usage check error:", error);
            // Fail safe: allow if we can't check, but usually this means network error
            return true; 
        }

        const currentCount = data?.count || 0;
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
        
        // Call the secure RPC function
        const { error } = await supabase
            .rpc('increment_usage_secure', { user_identifier: identifier });

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
export const getUsageStats = async (userId?: string): Promise<{ count: number, secondsLeft: number }> => {
     try {
        const identifier = await getIdentifier(userId);
        
        const { data, error } = await supabase
            .rpc('get_user_usage_stats', { user_identifier: identifier });

        if (error || !data) {
            return { count: 0, secondsLeft: 0 };
        }
        
        return { count: data.count, secondsLeft: data.seconds_left };
    } catch {
        return { count: 0, secondsLeft: 0 };
    }
};

export const getUsageCount = async (userId?: string): Promise<number> => {
    const stats = await getUsageStats(userId);
    return stats.count;
};

/**
 * Syncs usage from the Guest ID to their new User ID.
 */
export const syncIpUsageToUser = async (userId: string): Promise<void> => {
    try {
        const ip = await getIpAddress();
        const fp = getFingerprint();
        const identifier = ip !== 'unknown_ip' ? `guest_${ip}_${fp}` : localStorage.getItem('cv_tailor_guest_id');
        
        if (!identifier) return;

        // Call secure RPC - we keep the name for compatibility if it's hardcoded in DB,
        // but we pass the guestId as the identifier to sync from.
        const { error } = await supabase
            .rpc('sync_usage_from_ip', { ip_address: identifier });

        if (error) {
            console.error("Failed to sync guest usage via RPC:", error);
        } else {
            // Clear guest ID after successful sync to avoid double syncing
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
        const fp = getFingerprint();
        const identifier = ip !== 'unknown_ip' ? `guest_${ip}_${fp}` : 'unknown_ip';
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
        const fp = getFingerprint();
        const identifier = ip !== 'unknown_ip' ? `guest_${ip}_${fp}` : 'unknown_ip';
        const { error } = await supabase.rpc('record_quick_apply_usage', { user_ip: identifier });
        
        if (error) {
            console.error("Failed to record Quick Apply usage:", error);
        }
    } catch (e) {
        console.error("Failed to increment Quick Apply:", e);
    }
};
