export enum Status {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  REJECTED = 'REJECTED'
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
