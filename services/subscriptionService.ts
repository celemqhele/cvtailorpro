import { supabase } from './supabaseClient';

export interface SubscriptionPlan {
  id: '30_days' | '3_months' | '1_year';
  name: string;
  price: number;
  durationDays: number;
}

export const PLANS: SubscriptionPlan[] = [
  { id: '30_days', name: '30 Days Pro', price: 399.99, durationDays: 30 },
  { id: '3_months', name: '3 Months Pro', price: 999.99, durationDays: 90 },
  { id: '1_year', name: '1 Year Pro', price: 2999.99, durationDays: 365 },
];

export const createSubscription = async (
  planId: string, 
  paymentRef: string
): Promise<{ success: boolean; subscriptionId?: string; error?: string }> => {
  
  const plan = PLANS.find(p => p.id === planId);
  if (!plan) return { success: false, error: "Invalid plan" };

  const subscriptionId = 'SUB-' + Math.random().toString(36).substring(2, 10).toUpperCase();
  const now = new Date();
  const expiresAt = new Date(now.setDate(now.getDate() + plan.durationDays));

  try {
    const { error } = await supabase
      .from('subscriptions')
      .insert([
        {
          id: subscriptionId,
          plan_type: planId,
          payment_ref: paymentRef,
          created_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          is_active: true
        }
      ]);

    if (error) throw error;

    return { success: true, subscriptionId };
  } catch (e: any) {
    console.error("Subscription creation failed", e);
    return { success: false, error: e.message };
  }
};

export const verifySubscription = async (subscriptionId: string): Promise<{ active: boolean; expiresAt?: string; plan?: string }> => {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();

    if (error || !data) return { active: false };

    const expiresAt = new Date(data.expires_at);
    const now = new Date();
    
    // Check if active flag is true AND date hasn't passed
    const isValid = data.is_active && expiresAt > now;

    return { 
      active: isValid, 
      expiresAt: data.expires_at,
      plan: data.plan_type
    };
  } catch (e) {
    console.error("Verification failed", e);
    return { active: false };
  }
};