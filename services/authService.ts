
import { supabase } from './supabaseClient';
import { UserProfile, SavedApplication } from '../types';

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
    // Note: In Supabase v2, persistence is handled by the client configuration (defaults to localStorage).
    // The 'rememberMe' toggle is removed from logic as it requires client re-initialization.
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
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

    // 1. Update the public profile table
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', user.id);

    if (profileError) throw profileError;

    // 2. Sync to Auth Metadata (Best Practice)
    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name: fullName }
    });

    if (authError) console.error("Failed to sync auth metadata", authError);
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
    matchScore: number
  ) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { error } = await supabase.from('applications').insert({
      user_id: user.id,
      job_title: jobTitle,
      company_name: companyName,
      cv_content: cvContent,
      cl_content: clContent,
      match_score: matchScore
    });

    if (error) console.error("Error saving application:", error);
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
    return data as SavedApplication[];
  },

  async deleteApplication(id: string) {
    const { error } = await supabase.from('applications').delete().eq('id', id);
    if (error) throw error;
  }
};
