
export enum Status {
  IDLE = 'IDLE',
  SCANNING = 'SCANNING',
  ANALYZING = 'ANALYZING',
  ANALYSIS_COMPLETE = 'ANALYSIS_COMPLETE',
  GENERATING = 'GENERATING',
  SEARCHING_JOBS = 'SEARCHING_JOBS', // New status
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  REJECTED = 'REJECTED'
}

export type AppMode = 'tailor' | 'finder';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  is_pro_plus: boolean; 
  plan_id: string; 
  subscription_end_date?: string;
}

export interface SavedApplication {
  id: string;
  job_title: string;
  company_name: string;
  cv_content: string; 
  cl_content: string;
  match_score?: number;
  created_at: string;
}

export interface JobSearchResult {
  id?: string; // Optional (if saved to DB)
  title: string;
  company: string;
  location: string;
  url: string;
  datePosted: string; // "2 days ago", "Just now"
  descriptionSnippet: string;
  matchScore: number;
  analysis: string;
  rankScore: number; // Internal score for sorting
}

export interface TailoredDocument {
  title: string;
  content: string; 
}

export interface RejectionDetails {
  reason: string;
  suggestion: string;
}

export interface CVSkill {
  category: string;
  items: string;
}

export interface CVExperience {
  title: string;
  company: string;
  dates: string;
  achievements: string[];
}

export interface CVEducation {
  degree: string;
  institution?: string;
  year?: string;
}

export interface CVData {
  name: string;
  title: string;
  location: string;
  phone: string;
  email: string;
  linkedin?: string;
  summary: string;
  skills: CVSkill[];
  experience: CVExperience[];
  keyAchievements?: string[];
  education: CVEducation[];
}

export interface GeneratorResponse {
  outcome: 'PROCEED' | 'REJECT';
  rejectionDetails?: RejectionDetails;
  cvData?: CVData; 
  coverLetter?: TailoredDocument; 
  brandingImage?: string; 
}

export interface FileData {
  base64: string;
  mimeType: string;
  name: string;
}

export interface ManualCVData {
  fullName: string;
  contactInfo: string; 
  summary: string;
  experience: string; 
  education: string;
  skills: string;
}

export interface MatchAnalysis {
  decision: 'APPLY' | 'CAUTION' | 'SKIP';
  matchScore: number;
  headline: string;
  pros: string[];
  cons: string[];
  reasoning: string;
  jobTitle?: string;
  company?: string;
}
