
import { supabase } from './supabaseClient';

export interface SubscriptionPlan {
  id: 'free' | 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4';
  name: string;
  price: number;
  durationDays: number;
  dailyLimit: number; // For CV Generations
  description: string;
  hasSkeletonMode: boolean; // New feature flag
}

export const PLANS: SubscriptionPlan[] = [
  { id: 'free', name: 'Free', price: 0, durationDays: 0, dailyLimit: 1, description: '1 CV / Day (Ads)', hasSkeletonMode: false },
  { id: 'tier_1', name: 'Starter', price: 19.99, durationDays: 30, dailyLimit: 5, description: '5 CVs / Day', hasSkeletonMode: false },
  { id: 'tier_2', name: 'Growth', price: 39.99, durationDays: 30, dailyLimit: 10, description: '10 CVs / Day', hasSkeletonMode: true },
  { id: 'tier_3', name: 'Pro', price: 99.99, durationDays: 30, dailyLimit: 25, description: '25 CVs / Day', hasSkeletonMode: true },
  { id: 'tier_4', name: 'Unlimited', price: 199.99, durationDays: 30, dailyLimit: 1000000, description: 'Unlimited CVs', hasSkeletonMode: true },
];

export const getPlanDetails = (planId: string) => {
  return PLANS.find(p => p.id === planId) || PLANS[0];
};

export const createSubscription = async (
  planId: string, 
  paymentRef: string
): Promise<{ success: boolean; subscriptionId?: string; error?: string }> => {
  return { success: true };
};

/**
 * Calculates the monetary value of the remaining days on the current plan.
 * Used for prorating upgrades.
 */
export const calculateRemainingValue = (planId: string, endDateStr?: string): number => {
    if (!endDateStr || planId === 'free') return 0;
    const plan = getPlanDetails(planId);
    if (!plan || plan.price === 0) return 0;

    const now = new Date();
    const end = new Date(endDateStr);
    
    // If expired, no value
    if (end <= now) return 0;

    const msPerDay = 1000 * 60 * 60 * 24;
    const daysRemaining = (end.getTime() - now.getTime()) / msPerDay;
    
    // Cap effective days at plan duration (usually 30) to prevent weird math errors
    const effectiveDays = Math.min(daysRemaining, plan.durationDays);
    
    const dailyRate = plan.price / plan.durationDays;
    const value = dailyRate * effectiveDays;
    
    return Math.max(0, value);
};

export const updateUserSubscription = async (
    userId: string, 
    planId: string, 
    discountUsed: boolean = false,
    isUpgrade: boolean = false
): Promise<boolean> => {
    const plan = PLANS.find(p => p.id === planId);
    if (!plan || plan.id === 'free') return true; 

    const now = new Date();
    
    // Calculate Start Date
    let startDate = now;
    
    // If it's NOT an upgrade (i.e. renewal or same tier extension), we stack the time.
    // If it IS an upgrade, we reset the clock to NOW (because they paid for a fresh 30 days minus credit).
    if (!isUpgrade) {
        const { data: profile } = await supabase.from('profiles').select('subscription_end_date').eq('id', userId).single();
        if (profile?.subscription_end_date) {
            const currentEnd = new Date(profile.subscription_end_date);
            if (currentEnd > now) {
                startDate = currentEnd;
            }
        }
    }
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.durationDays);

    const updates: any = { 
        is_pro_plus: true, 
        plan_id: plan.id,
        subscription_end_date: endDate.toISOString()
    };

    if (discountUsed) {
        updates.has_used_discount = true;
    }

    const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

    if (error) {
        console.error("Failed to update subscription", error);
        return false;
    }
    return true;
};
