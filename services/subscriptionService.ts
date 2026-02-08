
import { supabase } from './supabaseClient';

export interface SubscriptionPlan {
  id: 'one_time' | '30_days' | '3_months' | '1_year';
  name: string;
  price: number;
  durationDays: number;
  type: 'subscription' | 'one_time';
}

export const PLANS: SubscriptionPlan[] = [
  { id: 'one_time', name: 'Single Unlock', price: 20.00, durationDays: 0, type: 'one_time' },
  { id: '30_days', name: '30 Days Pro+', price: 99.00, durationDays: 30, type: 'subscription' },
  { id: '3_months', name: '3 Months Pro+', price: 179.00, durationDays: 90, type: 'subscription' },
  { id: '1_year', name: '1 Year Pro+', price: 499.00, durationDays: 365, type: 'subscription' },
];

export const createSubscription = async (
  planId: string, 
  paymentRef: string
): Promise<{ success: boolean; subscriptionId?: string; error?: string }> => {
  // Legacy function mostly for anonymous one-time orders if we still want to track them without user ID
  // For the new auth system, we use updateUserSubscription
  return { success: true };
};

export const updateUserSubscription = async (userId: string, planId: string): Promise<boolean> => {
    const plan = PLANS.find(p => p.id === planId);
    if (!plan || plan.type === 'one_time') return true; 

    const now = new Date();
    
    // First check current profile to see if we should extend
    const { data: profile } = await supabase.from('profiles').select('subscription_end_date').eq('id', userId).single();
    
    let startDate = now;
    if (profile?.subscription_end_date) {
        const currentEnd = new Date(profile.subscription_end_date);
        if (currentEnd > now) {
            startDate = currentEnd;
        }
    }
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.durationDays);

    const { error } = await supabase
        .from('profiles')
        .update({ 
            is_pro_plus: true,
            subscription_end_date: endDate.toISOString()
        })
        .eq('id', userId);

    if (error) {
        console.error("Failed to update subscription", error);
        return false;
    }
    return true;
};
