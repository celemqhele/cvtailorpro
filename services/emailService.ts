
import { supabase } from './supabaseClient';

export const emailService = {
  /**
   * Sends the contact form content to customer service.
   * Uses FormSubmit.co for reliable serverless delivery.
   */
  async sendContactForm(name: string, email: string, subject: string, message: string) {
    // We use FormSubmit to send the email directly without needing a Supabase Edge Function
    // Note: The first time this runs, an activation email will be sent to customerservice@goapply.co.za
    const response = await fetch("https://formsubmit.co/ajax/customerservice@goapply.co.za", {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify({
            _subject: `Contact Form: ${subject}`,
            name: name,
            email: email, // This sets the Reply-To address automatically
            message: message,
            _template: 'table', // Formats the email nicely
            _captcha: 'false'   // Disables captcha for smoother UX
        })
    });

    if (!response.ok) {
        // Fallback: If FormSubmit fails, try the Supabase function as backup
        console.warn("FormSubmit failed, trying Supabase Edge Function...");
        const { data, error } = await supabase.functions.invoke('send-email', {
          body: { type: 'contact', name, email, subject, message }
        });

        if (error) {
          throw new Error(`Email Service Unavailable: ${error.message || 'Unknown Error'}`);
        }
        return data;
    }
    
    return await response.json();
  },

  /**
   * Sends a payment receipt to the user.
   */
  async sendReceipt(toEmail: string, userName: string, planName: string, amount: number) {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { 
        type: 'receipt', 
        toEmail, 
        userName, 
        planName, 
        amount 
      }
    });

    if (error) console.error("Failed to send receipt:", error);
    return data;
  }
};
