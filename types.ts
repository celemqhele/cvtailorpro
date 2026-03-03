
export enum Status {
  IDLE = 'IDLE',
  SCANNING = 'SCANNING',
  ANALYZING = 'ANALYZING',
  ANALYSIS_COMPLETE = 'ANALYSIS_COMPLETE',
  GENERATING = 'GENERATING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  REJECTED = 'REJECTED'
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  is_pro_plus: boolean; 
  plan_id: string; 
  subscription_end_date?: string;
  last_cv_content?: string;
  last_cv_filename?: string;
  has_used_discount?: boolean;
}

export interface SavedApplication {
  id: string;
  user_id?: string | null;
  job_title: string;
  company_name: string;
  cv_content: string; 
  cl_content: string;
  match_score?: number;
  created_at: string;
  expires_at?: string | null;
  original_link?: string | null; // Added field for tracking the job post
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

export interface CVReference {
  name: string;
  contact: string;
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
  references?: CVReference[];
}

export interface GeneratorResponse {
  outcome: 'PROCEED' | 'REJECT';
  rejectionDetails?: RejectionDetails;
  cvData?: CVData; 
  coverLetter?: TailoredDocument; 
  brandingImage?: string; 
  meta?: {
      jobTitle?: string;
      company?: string;
      suggestedFilename?: string;
  };
}

export interface FileData {
  base64: string;
  mimeType: string;
  name: string;
}

// --- New Manual Entry Types ---

export interface ManualExperienceItem {
  id: string;
  title: string;
  company: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface ManualEducationItem {
  id: string;
  degree: string;
  school: string;
  year: string;
}

export interface ManualCVData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  experience: ManualExperienceItem[];
  education: ManualEducationItem[];
  skills: string[]; // List of strings
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

// --- Job Listing Type ---
export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  summary: string;
  description: string; // The AI rewritten 3rd person description
  original_link: string;
  example_cv_content?: string; // Stringified JSON of a fictional tailored CV
  created_at: string;
}