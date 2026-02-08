
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
  is_pro_plus: boolean; // Kept for backwards compatibility logic
  plan_id: string; // 'free', 'tier_1', 'tier_2', etc.
  subscription_end_date?: string;
}

export interface SavedApplication {
  id: string;
  job_title: string;
  company_name: string;
  cv_content: string; // Storing the JSON stringified now
  cl_content: string;
  match_score?: number;
  created_at: string;
}

export interface TailoredDocument {
  title: string;
  content: string; // Markdown content (Used for Cover Letter)
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
  cvData?: CVData; // The structured data for the CV
  coverLetter?: TailoredDocument; // Cover letter remains Markdown for simplicity
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
