
import { supabase } from './supabaseClient';

export const emailService = {
  /**
   * Sends the contact form content to customer service.
   * Uses FormSubmit.co for reliable serverless delivery.
   */
  async sendContactForm(name: string, email: string, subject: string, message: string) {
    try {
        // We use FormSubmit to send the email directly without needing a Supabase Edge Function
        // Using user-provided verified endpoint (manual setup)
        const response = await fetch("https://formsubmit.co/el/himacu", {
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

        // FormSubmit sometimes returns HTML (success page) instead of JSON if the alias behaves like a redirect.
        // We capture the text first to avoid JSON.parse crashing on HTML "DOCTYPE".
        const text = await response.text();

        if (!response.ok) {
            throw new Error(`FormSubmit failed with status: ${response.status}`);
        }
        
        // Try to parse as JSON. If it fails but response was OK, it's likely the HTML success page.
        try {
            return JSON.parse(text);
        } catch (e) {
            // It returned 200 OK but likely HTML. This counts as success for FormSubmit.
            return { success: true, message: "Email sent successfully" };
        }

    } catch (err) {
        console.warn("FormSubmit failed or returned invalid response, trying Supabase Edge Function...", err);
        
        // Fallback: If FormSubmit fails, try the Supabase function as backup
        const { data, error } = await supabase.functions.invoke('send-email', {
          body: { type: 'contact', name, email, subject, message }
        });

        if (error) {
          throw new Error(`Email Service Unavailable: ${error.message || 'Unknown Error'}`);
        }
        return data;
    }
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
