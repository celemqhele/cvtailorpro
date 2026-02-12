
import { supabase } from './supabaseClient';
import { UserProfile, SavedApplication } from '../types';
import { naturalizeText } from '../utils/textHelpers';

export const authService = {
  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signIn(email: string, password: string, rememberMe: boolean = true) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) return null;
    return data as UserProfile;
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
    originalLink?: string | null
  ): Promise<SavedApplication | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Logic: If user exists, use their ID and no expiration. 
    // If guest, use null user_id and set expiration to 48 hours.
    const userId = user ? user.id : null;
    const expiresAt = user ? null : new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase.from('applications').insert({
      user_id: userId,
      job_title: jobTitle,
      company_name: companyName,
      cv_content: cvContent,
      cl_content: clContent,
      match_score: matchScore,
      expires_at: expiresAt,
      original_link: originalLink
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
      .from('applications')
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
        .from('applications')
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
      .from('applications')
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
      .from('applications')
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
    const { error } = await supabase.from('applications').delete().eq('id', id);
    if (error) throw error;
  }
};
