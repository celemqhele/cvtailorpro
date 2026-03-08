
import { supabase, storageAdapter } from './supabaseClient';
import { UserProfile, SavedApplication } from '../types';
import { naturalizeText } from '../utils/textHelpers';

export const authService = {
  async signUp(email: string, password: string, fullName?: string, role: 'candidate' | 'recruiter' = 'candidate') {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || '',
          role: role
        },
        emailRedirectTo: window.location.origin + '/account?confirmed=true'
      }
    });
    if (error) throw error;
    return data;
  },

  async signIn(email: string, password: string, rememberMe: boolean = true) {
    // Set persistence mode on our custom adapter
    storageAdapter.mode = rememberMe ? 'local' : 'session';
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        return data;
    } finally {
        // Reset mode to auto so future updates (refresh token) respect current location
        storageAdapter.mode = 'auto';
    }
  },

  async resetPasswordForEmail(email: string) {
    // Redirect to the account page with a query param so we can open the security tab
    const redirectTo = window.location.origin + '/account?reset=true';
    
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentProfile(): Promise<UserProfile | null> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.log("No authenticated user found in Supabase Auth.");
        return null;
      }

      // Retry logic for profile fetching (handles trigger delay)
      let profileData = null;
      let lastError = null;
      const maxRetries = 3;
      
      for (let i = 0; i < maxRetries; i++) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          profileData = data;
          break;
        }
        
        lastError = error;
        console.warn(`Profile fetch attempt ${i + 1} failed:`, error?.message || "Row not found");
        
        // Wait 100ms before next attempt
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      if (!profileData) {
        console.warn("Profile row missing or inaccessible. Attempting to self-heal.");
        
        // Try to create the profile row if it's missing (Self-healing)
        const { error: insertError } = await supabase.from('profiles').insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name,
            role: (user.user_metadata?.role as any) || 'candidate'
        });
        
        if (insertError) {
             console.error("Failed to auto-create missing profile row:", insertError);
        }

        // Fallback: Construct profile from auth user to allow login regardless of DB state
        return {
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || '',
            is_pro_plus: false,
            plan_id: 'free',
            role: (user.user_metadata?.role as any) || 'candidate',
            credits: 0,
            has_used_discount: false,
            opt_in_headhunter: false
        };
      }

      return profileData as UserProfile;
    } catch (e) {
      console.error("Unexpected error in getCurrentProfile:", e);
      return null;
    }
  },

  async updateProfileName(fullName: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No user logged in");

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', user.id);

    if (profileError) throw profileError;

    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name: fullName }
    });

    if (authError) console.error("Failed to sync auth metadata", authError);
  },

  async saveCVToProfile(filename: string, extractedText: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
        .from('profiles')
        .update({ 
            last_cv_filename: filename,
            last_cv_content: extractedText
        })
        .eq('id', user.id);
    
    if (error) console.error("Failed to save CV to profile", error);
  },

  async clearCVFromProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
        .from('profiles')
        .update({ 
            last_cv_filename: null,
            last_cv_content: null
        })
        .eq('id', user.id);
    
    if (error) console.error("Failed to clear CV from profile", error);
  },

  async updateEmail(newEmail: string) {
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) throw error;
  },

  async updateHeadhunterOptIn(optIn: boolean) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ opt_in_headhunter: optIn })
      .eq('id', user.id);

    if (error) console.error("Failed to update headhunter opt-in", error);
  },

  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },

  async saveApplication(
    jobTitle: string, 
    companyName: string, 
    cvContent: string, 
    clContent: string, 
    matchScore: number,
    originalLink?: string | null,
    metadata?: any
  ): Promise<SavedApplication | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Logic: If user exists, use their ID and no expiration. 
    // If guest, use null user_id and set expiration to 48 hours.
    const userId = user ? user.id : null;
    const expiresAt = user ? null : new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase.from('cv_applications').insert({
      user_id: userId,
      job_title: jobTitle,
      company_name: companyName,
      cv_content: cvContent,
      cl_content: clContent,
      match_score: matchScore,
      expires_at: expiresAt,
      original_link: originalLink,
      metadata: metadata || {}
    }).select().single();

    if (error) {
        console.error("Error saving application:", error);
        return null;
    }
    return data as SavedApplication;
  },

  /**
   * Update an existing application (e.g. after AI Smart Edit)
   */
  async updateApplication(id: string, cvContent: string, clContent: string) {
    const { error } = await supabase
      .from('cv_applications')
      .update({ 
        cv_content: cvContent,
        cl_content: clContent
      })
      .eq('id', id);
    if (error) throw error;
  },

  /**
   * Assigns a guest application to a logged-in user and removes expiration.
   */
  async claimApplication(applicationId: string): Promise<boolean> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('cv_applications')
        .update({ 
            user_id: user.id,
            expires_at: null 
        })
        .eq('id', applicationId)
        .is('user_id', null); // Safety check: only claim if currently unowned

      if (error) {
          console.error("Failed to claim application", error);
          return false;
      }
      return true;
  },

  async getHistory(): Promise<SavedApplication[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('cv_applications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Sanitize existing data on read
    const sanitizedData = data.map((app: any) => ({
        ...app,
        cv_content: naturalizeText(app.cv_content),
        cl_content: naturalizeText(app.cl_content),
        job_title: naturalizeText(app.job_title),
        company_name: naturalizeText(app.company_name)
    }));

    return sanitizedData as SavedApplication[];
  },

  async getApplicationById(id: string): Promise<SavedApplication | null> {
    const { data, error } = await supabase
      .from('cv_applications')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    
    // Sanitize existing data on read
    const app = data as any;
    app.cv_content = naturalizeText(app.cv_content);
    app.cl_content = naturalizeText(app.cl_content);
    app.job_title = naturalizeText(app.job_title);
    app.company_name = naturalizeText(app.company_name);

    return app as SavedApplication;
  },

  async deleteApplication(id: string) {
    const { error } = await supabase.from('cv_applications').delete().eq('id', id);
    if (error) throw error;
  }
};
