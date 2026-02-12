
import { supabase } from './supabaseClient';
import { JobListing } from '../types';
import { naturalizeObject } from '../utils/textHelpers';

export const jobService = {
  async getJobs(): Promise<JobListing[]> {
    const { data, error } = await supabase
      .from('job_listings')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return naturalizeObject(data) as JobListing[];
  },

  async getJobById(id: string): Promise<JobListing | null> {
    const { data, error } = await supabase
      .from('job_listings')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return naturalizeObject(data) as JobListing;
  },

  async createJob(job: Omit<JobListing, 'id' | 'created_at'>): Promise<JobListing> {
    const { data, error } = await supabase
      .from('job_listings')
      .insert(job)
      .select()
      .single();
    
    if (error) throw error;
    return data as JobListing;
  },

  async deleteJob(id: string) {
    const { error } = await supabase
      .from('job_listings')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};
