
import { supabase } from './supabaseClient';

export interface SubscriptionPlan {
  id: 'free' | 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4';
  name: string;
  price: number;
  durationDays: number;
  dailyLimit: number; // For CV Generations
  jobSearchLimit: number; // New limit for Job Finder
  description: string;
}

export const PLANS: SubscriptionPlan[] = [
  { id: 'free', name: 'Free', price: 0, durationDays: 0, dailyLimit: 5, jobSearchLimit: 0, description: '5 CVs + 0 Searches / Day' },
  { id: 'tier_1', name: 'Starter', price: 19.99, durationDays: 30, dailyLimit: 20, jobSearchLimit: 1, description: '20 CVs + 1 Search / Day' },
  { id: 'tier_2', name: 'Growth', price: 39.99, durationDays: 30, dailyLimit: 50, jobSearchLimit: 1, description: '50 CVs + 1 Search / Day' },
  { id: 'tier_3', name: 'Pro', price: 99.99, durationDays: 30, dailyLimit: 100, jobSearchLimit: 1, description: '100 CVs + 1 Search / Day' },
  { id: 'tier_4', name: 'Unlimited', price: 199.99, durationDays: 30, dailyLimit: 10000, jobSearchLimit: 5, description: 'Unlimited CVs + 5 Searches' },
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

export const updateUserSubscription = async (userId: string, planId: string): Promise<boolean> => {
    const plan = PLANS.find(p => p.id === planId);
    if (!plan || plan.id === 'free') return true; 

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
            plan_id: plan.id,
            subscription_end_date: endDate.toISOString()
        })
        .eq('id', userId);

    if (error) {
        console.error("Failed to update subscription", error);
        return false;
    }
    return true;
};
