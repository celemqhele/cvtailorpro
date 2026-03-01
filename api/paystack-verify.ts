import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { reference, planId, userId, discountUsed } = req.body;

  if (!reference || !planId || !userId) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gqiccyijkvqyuollaqju.supabase.co';
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!PAYSTACK_SECRET_KEY) {
    return res.status(500).json({ error: 'Paystack Secret Key not configured' });
  }

  try {
    // 1. Verify Transaction with Paystack
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json"
      }
    });

    const data = await response.json();

    if (!response.ok || data.data.status !== 'success') {
      return res.status(400).json({ 
        error: 'Payment verification failed', 
        details: data.message || 'Transaction not successful' 
      });
    }

    // 2. Double check amount if necessary (optional but recommended)
    // const amountPaid = data.data.amount; // in cents

    // 3. Update User Subscription in Supabase
    // We use service role key to ensure we can update the profile
    if (!SUPABASE_SERVICE_ROLE_KEY) {
        console.error("SUPABASE_SERVICE_ROLE_KEY missing, falling back to client-side update (less secure)");
        return res.status(200).json({ 
            success: true, 
            verified: true,
            message: "Payment verified, but backend sync failed. Client will retry." 
        });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Calculate end date (30 days from now)
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    const updates: any = {
        plan_id: planId,
        is_pro_plus: true,
        subscription_end_date: endDate.toISOString()
    };

    if (discountUsed) {
        updates.has_used_discount = true;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (updateError) {
      console.error("Supabase Update Error:", updateError);
      return res.status(500).json({ error: 'Failed to update user profile' });
    }

    // 4. Log the order
    await supabase.from('orders').insert({
        user_id: userId,
        plan_id: planId,
        amount: data.data.amount / 100,
        status: 'completed',
        metadata: { paystack_ref: reference }
    });

    return res.status(200).json({ 
        success: true, 
        message: 'Payment verified and account upgraded' 
    });

  } catch (err: any) {
    console.error("Paystack Verify Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
