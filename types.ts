

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

export interface TailoredDocument {
  title: string;
  content: string; // Markdown content
}

export interface RejectionDetails {
  reason: string;
  suggestion: string;
}

export interface GeneratorResponse {
  outcome: 'PROCEED' | 'REJECT';
  rejectionDetails?: RejectionDetails;
  cv?: TailoredDocument;
  coverLetter?: TailoredDocument;
  brandingImage?: string; // Base64 image string
}

export interface FileData {
  base64: string;
  mimeType: string;
  name: string;
}

export interface ManualCVData {
  fullName: string;
  contactInfo: string; // Phone, Email, Location
  summary: string;
  experience: string; // Free text for now, LLM parses it
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
}
