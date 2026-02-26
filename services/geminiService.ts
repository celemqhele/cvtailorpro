

import * as mammoth from "mammoth";
import * as pdfjsLib from 'pdfjs-dist';
import { TIER_1_PROMPT, TIER_2_PROMPT, TIER_3_PROMPT, ANALYSIS_PROMPT, CHAT_SYSTEM_PROMPT, SMART_EDIT_PROMPT, SMART_EDIT_CL_PROMPT, SKELETON_FILLER_PROMPT } from "../constants";
import { FileData, GeneratorResponse, MatchAnalysis, ManualCVData, CVData } from "../types";
import { naturalizeObject, naturalizeText } from "../utils/textHelpers";
import { errorService } from "./errorService";

/**
 * Scrapes job content using Jina.ai.
 */
export const scrapeJobFromUrl = async (url: string): Promise<string> => {
    console.log("Attempting Jina scrape...");
    
    let targetUrl = url;
    if (!url.startsWith('http')) {
        targetUrl = 'https://' + url;
    }

    // Use Jina.ai Reader
    const scrapeUrl = `https://r.jina.ai/${targetUrl}`;

    try {
        const response = await fetch(scrapeUrl);
        
        if (!response.ok) {
            throw new Error(`Jina error status: ${response.status}`);
        }
        
        const text = await response.text();
        
        // Validation check for common blocking responses
        if (!text || text.length < 50 || text.includes("Access Denied") || text.includes("Cloudflare") || text.includes("Just a moment")) {
             throw new Error("Content appears to be blocked.");
        }
        
        return text;

    } catch (e: any) {
        console.warn("Jina scraping failed:", e);
        errorService.logError({
            message: `Jina Scrape Failed: ${e.message}`,
            path: '/scrapeJobFromUrl',
            metadata: { url, type: 'api_failure' }
        });
        // Throw specific error message that the UI will recognize to switch modes
        throw new Error("We couldn't read this link automatically. Please copy and paste the job description text manually.");
    }
};

/**
 * Helper: Call OCR Proxy
 */
async function extractTextFromPdfOcrSpace(base64: string): Promise<string> {
    const response = await fetch("/api/ocr-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64 })
    });

    if (!response.ok) {
        const err = await response.json();
        errorService.logError({
            message: `OCR Proxy Error: ${err.error}`,
            path: '/extractTextFromPdfOcrSpace',
            metadata: { type: 'api_failure' }
        });
        throw new Error(`OCR Error: ${err.error}`);
    }

    const data = await response.json();
    return data.text;
}

/**
 * Helper to extract raw text from the uploaded file.
 * Now Exported for use in Dashboard to save text to DB.
 */
export async function extractTextFromFile(file: FileData): Promise<string> {
  const byteCharacters = atob(file.base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);

  // Handle DOCX
  if (
    file.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.endsWith(".docx")
  ) {
    try {
      const result = await mammoth.extractRawText({ arrayBuffer: byteArray.buffer });
      return result.value;
    } catch (e) {
      console.error("Mammoth extraction failed", e);
      throw new Error("Failed to read Word document. Please try a text file.");
    }
  } 
  // Handle PDF
  else if (file.mimeType === "application/pdf" || file.name.endsWith(".pdf")) {
    // Strategy 1: OCR.space (Primary)
    try {
        console.log("Attempting PDF extraction via OCR.space...");
        const text = await extractTextFromPdfOcrSpace(file.base64);
        console.log("OCR.space success.");
        return text;
    } catch (ocrError) {
        console.warn("OCR.space failed, falling back to local PDF.js. Reason:", ocrError);
        
        // Strategy 2: PDF.js (Fallback)
        try {
            const pdfjs = (pdfjsLib as any).default || pdfjsLib;

            if (!pdfjs.GlobalWorkerOptions.workerSrc) {
                // Use the ES Module worker build to match the ESM import of pdfjs-dist.
                // Classic script (.js) workers fail when loaded via dynamic import in ESM mode.
                const version = pdfjs.version || '5.4.624'; 
                pdfjs.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@${version}/build/pdf.worker.mjs`;
            }

            const loadingTask = pdfjs.getDocument({ data: byteArray });
            const pdf = await loadingTask.promise;
            let fullText = "";

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');
                fullText += pageText + "\n\n";
            }
            
            return fullText;
        } catch (pdfJsError) {
            console.error("PDF.js extraction failed", pdfJsError);
            throw new Error("Failed to read PDF. Please ensure it is a valid text-based PDF or try a DOCX file.");
        }
    }
  }
  // Handle Text
  else {
    const decoder = new TextDecoder("utf-8");
    return decoder.decode(byteArray);
  }
}

/**
 * Executes a call to AI Provider (Cerebras).
 */
async function runAIChain(systemInstruction: string, userMessage: string, temperature: number, _apiKey: string): Promise<string> {
    const isJsonMode = systemInstruction.includes("JSON") || systemInstruction.includes("json");

    try {
        const response = await fetch("/api/ai-proxy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                systemPrompt: systemInstruction,
                userPrompt: userMessage,
                temperature,
                jsonMode: isJsonMode
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "AI Proxy failed");
        }

        const data = await response.json();
        return data.text;
    } catch (e: any) {
        console.error("AI Proxy Call Failed:", e);
        throw new Error("Service Unavailable: AI models failed to respond. Please try again later.");
    }
}

export const analyzeMatch = async (
    cvFile: FileData | null,
    manualData: ManualCVData | null,
    jobDescription: string,
    apiKey: string,
    savedCvText?: string // New optional param
): Promise<MatchAnalysis> => {
    
    // 1. Extract Text
    let candidateText = "";
    if (cvFile) {
        candidateText = await extractTextFromFile(cvFile);
    } else if (savedCvText) {
        candidateText = savedCvText;
    } else if (manualData) {
        candidateText = JSON.stringify(manualData);
    }

    // 2. Client-Side Execution
    try {
        const userMessage = `
        JOB DESCRIPTION:
        ${jobDescription.substring(0, 15000)}
        
        --------------------------------------------------
        
        CANDIDATE CV DATA:
        ${candidateText.substring(0, 15000)}
        `;
        
        const responseText = await runAIChain(ANALYSIS_PROMPT, userMessage, 0.2, apiKey);
        return JSON.parse(responseText) as MatchAnalysis;

    } catch (clientError: any) {
         console.error("Analysis failed:", clientError);
         throw new Error("Failed to analyze job match. Please try again later or manually check the job description.");
    }
};

export const generateTailoredApplication = async (
  cvFile: FileData | null,
  manualData: ManualCVData | null,
  jobSpec: string,
  targetType: 'specific' | 'title',
  apiKey: string,
  force: boolean = false,
  linkedinUrl?: string,
  savedCvText?: string,
  additionalInfo?: string
): Promise<GeneratorResponse> => {
  
  // 1. Extract Text
  let candidateData = "";
  try {
    if (cvFile) {
        candidateData = "CANDIDATE EXISTING CV:\n" + (await extractTextFromFile(cvFile));
    } else if (savedCvText) {
        candidateData = "CANDIDATE EXISTING CV:\n" + savedCvText;
    } else if (manualData) {
        candidateData = "CANDIDATE MANUAL ENTRY:\n" + JSON.stringify(manualData, null, 2);
    } else {
        throw new Error("No candidate data provided.");
    }

    // Append Additional Info if present
    if (additionalInfo && additionalInfo.trim() !== '') {
        candidateData += "\n\n=== ADDITIONAL CANDIDATE INFORMATION (New skills, certs, or instructions) ===\n" + additionalInfo;
    }

  } catch (error: any) {
    throw new Error(`File processing error: ${error.message}`);
  }

  // 2. Prepare Prompt
  const SCHEMA_INSTRUCTION = `
  You are a CV optimization AI. Extract and optimize the CV data into this EXACT JSON structure.
  
  CRITICAL: You must return strictly valid JSON.

  Structure:
  {
    "outcome": "PROCEED",
    "meta": {
        "jobTitle": "The specific Job Title from the description (e.g. 'Senior Data Analyst'). Do NOT use placeholders like 'Role' or 'General'. If unknown, infer the most likely title.",
        "company": "The Company Name (or 'Company' if unknown)",
        "suggestedFilename": "CandidateName_JobTitle_CV"
    },
    "cvData": {
        "name": "FULL NAME",
        "title": "Professional Title/Role",
        "location": "City, Country",
        "phone": "Phone number",
        "email": "email@example.com",
        "linkedin": "LinkedIn URL or null",
        "summary": "2-3 sentence professional summary tailored to job",
        "skills": [
            {"category": "Category Name", "items": "comma, separated, skills"}
        ],
        "experience": [
            {
            "title": "Job Title",
            "company": "Company Name",
            "dates": "Month Year – Month Year",
            "achievements": ["Achievement 1", "Achievement 2"]
            }
        ],
        "keyAchievements": ["Achievement 1", "Achievement 2"],
        "education": [
            {"degree": "Degree/Certification", "institution": "School", "year": "Year"}
        ],
        "references": [
            {"name": "Reference Name", "contact": "Phone/Email or Relationship"}
        ]
    },
    "coverLetter": {
      "title": "Cover_Letter.docx",
      "content": "Strictly formatted business letter text..."
    },
    "rejectionDetails": {
      "reason": "Explanation...",
      "suggestion": "Better fit roles..."
    }
  }
  `;

  let systemContent = SCHEMA_INSTRUCTION;

  if (force || targetType === 'title') {
    systemContent += `\nIMPORTANT OVERRIDE: Set "outcome" to "PROCEED". Do not reject. ${targetType === 'title' ? 'Optimize for the INDUSTRY STANDARD of the provided Job Title.' : 'Force generation despite low match.'}`;
  }

  const jobContext = targetType === 'specific' 
    ? `TARGET JOB DESCRIPTION (KEYWORDS TO INJECT):\n${jobSpec}`
    : `TARGET JOB TITLE (General Optimization): ${jobSpec}`;

  const linkedinInstruction = linkedinUrl && linkedinUrl.trim() !== ''
    ? `MANDATORY LINKEDIN INSTRUCTION: The user provided this LinkedIn URL: ${linkedinUrl}. Insert this into the "linkedin" field in the JSON.`
    : `MANDATORY LINKEDIN INSTRUCTION: The user did NOT provide a LinkedIn URL. If one exists in the CV text, use it. If NOT, set "linkedin" to null. DO NOT invent a URL.`;

  const coverLetterInstruction = `
    COVER LETTER RULES:
    1.  Format as a TRADITIONAL BUSINESS LETTER.
    2.  DO NOT use Markdown headers like '# Introduction'. Use standard paragraphs.
    3.  DO NOT include the Candidate's Header (Name/Contact) at the top. The UI will render this.
    4.  START the content strictly with:
        [Date Today]
        
        [Recipient Name (if known, else 'Hiring Manager')]
        [Company Name]
        [Company Address/City]
        
        Dear [Recipient Name],
    5.  Write 3-4 paragraphs: Hook, Value Proposition (using metrics from CV), Company Alignment, Call to Action.
    6.  End with:
        Sincerely,
        [Candidate Name]
  `;

  const userMessage = `
      STEP 1: Analyze the Candidate CV and Additional Information (if any). Identify all METRICS, NUMBERS, and SPECIFIC ACHIEVEMENTS.
      STEP 2: Analyze the Target Job. Identify TOP 5 KEYWORDS. Extract Job Title and Company Name for the 'meta' field. GENERATE a professional filename in the 'meta.suggestedFilename' field (e.g. "John_Smith_Senior_Accountant_CV").
      STEP 3: Rewrite the CV Data into the JSON structure. Integrate any relevant details from the "Additional Information" section into the summary, skills, or experience as appropriate. 
      NOTE: If References are present in the CV, extract them into the 'references' array. If none are present, leave it empty.
      STEP 4: Write the Cover Letter content following the TRADITIONAL BUSINESS LETTER rules.
      
      ${linkedinInstruction}
      ${coverLetterInstruction}

      ${jobContext}
      
      ${candidateData}
      
      Perform the generation and return the JSON object.`;

  const responseText = await runAIChain(systemContent, userMessage, 0.6, apiKey);
  return parseAndProcessResponse(responseText);
};

export const generateSkeletonCV = async (
    jobSpec: string,
    apiKey: string
): Promise<GeneratorResponse> => {
    const SCHEMA_INSTRUCTION = `
    You are a Strategic Career Architect. Your task is to build a "Perfect Candidate Skeleton CV" based strictly on the provided Job Description.
    
    GOAL: Create a CV structure that perfectly matches the job requirements, but leave placeholders for the user's specific metrics, dates, and companies.
    
    RULES:
    1. **PLACEHOLDERS:** Use strictly bracketed placeholders like \`[Insert Company Name]\`, \`[Date]\`, \`[Insert Metric %]\`, \`[Team Size]\`.
    2. **SKILLS:** Fill in the hard skills and soft skills that are EXPLICITLY required by the JD.
    3. **EXPERIENCE BULLETS:** Write the experience bullets as if the candidate did the job, but leave the quantifiable results as placeholders.
       - Example: "Led a team of [Team Size] developers to migrate legacy code, reducing technical debt by [Insert %]."
       - Example: "Managed a marketing budget of [Insert Amount], achieving a ROAS of [Insert ROAS]."
    4. **SUMMARY:** Write a powerful summary that hits every keyword, but uses placeholders for years of experience and specific industries if not generic.
    5. **NAME:** Use "[Your Full Name]".
    
    RETURN JSON:
    {
      "outcome": "PROCEED",
      "meta": {
          "jobTitle": "Extracted Job Title",
          "company": "Extracted Company",
          "suggestedFilename": "Skeleton_Tailored_CV"
      },
      "cvData": {
          "name": "[Your Full Name]",
          "title": "Professional Title (Match JD)",
          "location": "[City, Country]",
          "phone": "[Phone Number]",
          "email": "[Email Address]",
          "linkedin": "linkedin.com/in/[username]",
          "summary": "...",
          "skills": [ {"category": "Technical", "items": "Java, Python"} ],
          "experience": [
              {
              "title": "Previous Job Title (Relevant to JD)",
              "company": "[Insert Company Name]",
              "dates": "[Start Date] – [End Date]",
              "achievements": ["Achievement 1 with [Placeholder]", "Achievement 2 with [Placeholder]"]
              }
          ],
          "keyAchievements": ["Awarded [Name of Award] for excellence in..."],
          "education": [
              {"degree": "Degree Required by JD", "institution": "[University Name]", "year": "[Year]"}
          ],
          "references": []
      },
      "coverLetter": {
        "title": "Skeleton_Cover_Letter.docx",
        "content": "Cover Letter with [Placeholders] for specific company details..."
      }
    }
    `;

    const userMessage = `
    TARGET JOB DESCRIPTION:
    ${jobSpec}
    
    Generate the Skeleton CV JSON now.
    `;

    const responseText = await runAIChain(SCHEMA_INSTRUCTION, userMessage, 0.7, apiKey);
    return parseAndProcessResponse(responseText);
};

export const smartEditCV = async (
    currentData: CVData,
    instruction: string,
    apiKey: string
): Promise<CVData> => {
    const userMessage = `
    CURRENT CV JSON:
    ${JSON.stringify(currentData)}

    USER INSTRUCTION:
    "${instruction}"

    Please update the JSON accordingly.
    `;

    const responseText = await runAIChain(SMART_EDIT_PROMPT, userMessage, 0.4, apiKey);
    
    try {
        const result = JSON.parse(responseText);
        return naturalizeObject(result);
    } catch (e) {
        console.error("Smart Edit Parse Error", e, responseText);
        throw new Error("Failed to process your edit instruction. Please try again.");
    }
};

export const fillSkeletonCV = async (
    skeletonData: CVData,
    userCvText: string,
    apiKey: string
): Promise<CVData> => {
    const userMessage = `
    SKELETON CV DATA (The Target Structure):
    ${JSON.stringify(skeletonData)}

    REAL CANDIDATE CV TEXT (The Facts):
    ${userCvText}

    Please merge the Real Candidate Facts into the Skeleton Structure, replacing [Placeholders].
    `;

    const responseText = await runAIChain(SKELETON_FILLER_PROMPT, userMessage, 0.3, apiKey);
    
    try {
        const result = JSON.parse(responseText);
        return naturalizeObject(result);
    } catch (e) {
        console.error("Skeleton Fill Parse Error", e, responseText);
        throw new Error("Failed to auto-fill the skeleton CV. Please try again.");
    }
};

export const smartEditCoverLetter = async (
    currentContent: string,
    instruction: string,
    apiKey: string
): Promise<string> => {
    const userMessage = `
    CURRENT COVER LETTER CONTENT:
    ${currentContent}

    USER INSTRUCTION/PRESET:
    "${instruction}"

    Rewrite the cover letter body text now. Return strictly raw text.
    `;

    // Note: Use a higher temperature for creativity in CL
    const responseText = await runAIChain(SMART_EDIT_CL_PROMPT, userMessage, 0.7, apiKey);
    
    // Sanitize markdown code blocks
    let cleanText = responseText.replace(/```(markdown|text|json)?/g, '').trim();

    // Fallback: If the model returns JSON format (common with some smart models if they see structural clues), parse it.
    if (cleanText.trim().startsWith('{')) {
        try {
            const parsed = JSON.parse(cleanText);
            cleanText = parsed.content || parsed.text || parsed.body || parsed.letter || cleanText;
        } catch (e) {
            // If parse fails, just return the text (it might just start with a bracket)
        }
    }

    return naturalizeText(cleanText);
};

function parseAndProcessResponse(content: string): GeneratorResponse {
    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(content);
    } catch (e) {
      console.error("JSON Parse Error:", e, "Content:", content);
      throw new Error("Failed to parse the AI response. Please try again.");
    }

    if (parsedResponse.outcome !== 'REJECT') {
      if (!parsedResponse.cvData) {
          throw new Error("AI failed to generate structured CV data.");
      }

      // Sanitize LinkedIn field
      if (parsedResponse.cvData.linkedin) {
          const lk = parsedResponse.cvData.linkedin;
          if (lk === 'null' || lk === 'N/A' || lk === 'undefined' || lk.trim() === '') {
              parsedResponse.cvData.linkedin = null;
          }
      }

      if (!parsedResponse.coverLetter) parsedResponse.coverLetter = { title: "Cover_Letter.docx", content: "" };
      if (!parsedResponse.coverLetter.content) parsedResponse.coverLetter.content = parsedResponse.coverLetter.body || parsedResponse.coverLetter.text || "";

      // Sanitization: Replace em dashes with comma space
      parsedResponse = naturalizeObject(parsedResponse);
    }

    return {
      ...parsedResponse,
      brandingImage: undefined 
    } as GeneratorResponse;
}

export const rewriteJobDescription = async (
  rawTitle: string,
  rawDescription: string,
  apiKey: string
): Promise<{ title: string; description: string; summary: string }> => {
    
    const systemPrompt = `
    You are a Professional Job Description Writer and Career Strategist. 
    Your task is to rewrite a raw job posting into a professional, engaging 3rd person narrative.

    CRITICAL TASK - TITLE STANDARDIZATION:
    Analyze the provided "Raw Job Title" and "Raw Job Description".
    Convert the Job Title into the widely recognized INDUSTRY STANDARD title.
    Example: "Grade 4 Admin Assistant" -> "Office Administrator".
    Example: "Ninja Rockstar Coder" -> "Senior Software Engineer".
    
    RULES:
    1. Write in the THIRD PERSON (e.g. "Google is looking for...", "The company requires...").
    2. Maintain all technical requirements and qualifications.
    3. Make it sound exciting and professional.
    
    OUTPUT FORMAT:
    Return strictly valid JSON:
    {
       "title": "The standardized, recognizable job title",
       "description": "Full rewritten job description in markdown format (use bullet points for requirements).",
       "summary": "A 2-sentence summary of the role and company for a listing card. STRICTLY write in the third person."
    }
    `;

    const userMessage = `
    RAW TITLE: ${rawTitle}
    RAW DESCRIPTION:
    ${rawDescription}
    
    Please rewrite this now.
    `;
    
    const responseText = await runAIChain(systemPrompt, userMessage, 0.5, apiKey);
    const result = JSON.parse(responseText);
    return naturalizeObject(result);
};

export const generateFictionalCV = async (
    jobDescription: string,
    jobTitle: string,
    apiKey: string
): Promise<string> => {
    const systemPrompt = `
    ROLE: You are an expert Resume Writer demonstrating a "Perfect Match" CV.
    GOAL: Create a FICTIONAL, high-quality CV for a candidate who is a 100% perfect match for the provided job description.
    
    INSTRUCTIONS:
    1. Create a fictional persona (Name, realistic location, placeholder email).
    2. Write a summary that perfectly hits the keywords in the JD.
    3. Fabricate 2-3 past roles that directly demonstrate the required experience. Use strong action verbs and metrics (e.g. "Increased revenue by 20%").
    4. List skills that match the JD requirements.
    
    OUTPUT FORMAT:
    Return ONLY valid JSON matching this schema:
    {
        "name": "Jane Doe",
        "title": "Professional Title",
        "location": "City, Country",
        "phone": "+27 12 345 6789",
        "email": "jane.doe@example.com",
        "linkedin": "linkedin.com/in/janedoe-example",
        "summary": "...",
        "skills": [
            {"category": "Technical", "items": "Java, Python, SQL"}
        ],
        "experience": [
            {
                "title": "Previous Job Title",
                "company": "Tech Corp (Fictional)",
                "dates": "Jan 2020 – Present",
                "achievements": ["Led team of 5...", "Reduced latency by 15%..."]
            }
        ],
        "keyAchievements": ["Awarded Top Performer 2022"],
        "education": [
            {"degree": "BSc Computer Science", "institution": "University of Cape Town", "year": "2019"}
        ],
        "references": []
    }
    `;

    const userMessage = `
    JOB TITLE: ${jobTitle}
    JOB DESCRIPTION:
    ${jobDescription.substring(0, 10000)}
    `;

    const responseText = await runAIChain(systemPrompt, userMessage, 0.7, apiKey);
    
    // Ensure it's just the JSON part if there's extra text
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
    
    // Validate it parses
    JSON.parse(jsonStr); 
    return naturalizeText(jsonStr);
};

export const chatWithSupport = async (messageHistory: {role: 'user'|'assistant', content: string}[], userMessage: string): Promise<string> => {
    try {
        const response = await fetch("/api/ai-proxy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                systemPrompt: CHAT_SYSTEM_PROMPT,
                userPrompt: `Conversation History:\n${JSON.stringify(messageHistory)}\n\nUser Message: ${userMessage}`,
                temperature: 0.7,
                jsonMode: false
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Chat Proxy failed");
        }

        const data = await response.json();
        return naturalizeText(data.text);
    } catch (e: any) {
        console.error("Chat Proxy Call Failed:", e);
        return "I'm having trouble connecting to the server. Please try again later or email support.";
    }
};

/**
 * Generates an SEO-rich article based on a topic.
 */
export const generateArticle = async (topic: string, apiKey: string): Promise<any> => {
    const systemPrompt = `
    You are a Senior SEO Content Specialist and Career Coach.
    Your goal is to write a highly engaging, SEO-optimized, long-form article based on a provided TOPIC.
    
    TONE: Professional, Authoritative, Encouraging, Action-Oriented.
    AUDIENCE: Job Seekers, Professionals, Students.
    
    OUTPUT FORMAT:
    Return strictly valid JSON:
    {
       "title": "A Catchy, Click-worthy Title (H1)",
       "slug": "url-friendly-slug-example",
       "excerpt": "A meta description (150-160 chars) that hooks the reader.",
       "category": "One of: Guide, Career Strategy, Interview Prep, Resume Optimization",
       "readTime": "e.g. 5 min",
       "content": "Full article content in Markdown. Use H2 (##) and H3 (###) headers. Use bolding for emphasis. Include bullet points. Structure: Introduction, 3-4 Key Sections, Conclusion."
    }
    
    Ensure the content is substantial (min 800 words) and includes relevant keywords naturally.
    `;

    const userMessage = `TOPIC: ${topic}`;

    const responseText = await runAIChain(systemPrompt, userMessage, 0.7, apiKey);
    const result = JSON.parse(responseText);
    return naturalizeObject(result);
};

/**
 * NEW ADMIN FEATURE: Extracts data from a LinkedIn profile using Jina.ai Reader in JSON mode.
 */
export const extractLinkedInDataWithJina = async (linkedinUrl: string): Promise<string> => {
    console.log("Attempting LinkedIn scrape via Jina JSON...");
    
    let targetUrl = linkedinUrl;
    if (!linkedinUrl.startsWith('http')) {
        targetUrl = 'https://' + linkedinUrl;
    }

    // Use Jina.ai Reader with JSON header
    const scrapeUrl = `https://r.jina.ai/${targetUrl}`;

    try {
        // Try JSON mode first
        let response = await fetch(scrapeUrl, {
            headers: {
                'Accept': 'application/json',
                'X-With-Generated-Alt': 'true'
            }
        });
        
        // If 401, it might mean JSON mode is restricted for this URL/site on free tier
        // Fallback to standard text mode
        if (response.status === 401 || response.status === 403) {
            console.log("Jina JSON mode unauthorized, falling back to text mode...");
            response = await fetch(scrapeUrl);
        }

        if (!response.ok) {
            throw new Error(`Jina error status: ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            const jsonResponse = await response.json();
            if (jsonResponse.data && jsonResponse.data.content) {
                const content = jsonResponse.data.content;
                if (checkBlocking(content)) throw new Error("LinkedIn content is protected by an authwall.");
                
                return JSON.stringify({
                    title: jsonResponse.data.title,
                    description: jsonResponse.data.description,
                    content: jsonResponse.data.content,
                    url: jsonResponse.data.url
                }, null, 2);
            }
        }
        
        // Fallback or direct text processing
        const text = await response.text();
        if (checkBlocking(text)) throw new Error("LinkedIn content is protected by an authwall.");
        return text;

    } catch (e: any) {
        console.warn("Jina LinkedIn scraping failed:", e);
        throw new Error(`LinkedIn Extraction Failed: ${e.message}`);
    }
};

// Helper to check for LinkedIn authwalls or blocking
const checkBlocking = (content: string): boolean => {
    if (!content || content.length < 150) return true;
    const markers = ["Access Denied", "Cloudflare", "Sign in", "authwall", "Join LinkedIn", "login"];
    return markers.some(marker => content.includes(marker));
};

export const generateJobSpecFromCandidateProfile = async (candidateData: string, apiKey: string): Promise<string> => {
    const systemPrompt = `
    You are an Expert Technical Recruiter and Job Architect.
    Your task is to analyze the provided Candidate Profile (extracted from LinkedIn) and generate a "Perfect Match" Job Specification.
    
    GOAL: Create a job description that this specific candidate would be the absolute #1 choice for. 
    The job spec should be challenging but perfectly aligned with their skills, experience level, and industry.
    
    STRUCTURE:
    1. Job Title (Standardized)
    2. Company Overview (Fictional but realistic for their industry)
    3. The Role (High-level summary)
    4. Key Responsibilities (Tailored to their past achievements)
    5. Required Skills & Qualifications (Directly matching their top skills)
    6. Why Join Us (Attractive benefits for someone at their level)
    
    TONE: Professional, exciting, and high-end.
    FORMAT: Markdown.
    `;

    const userMessage = `
    CANDIDATE PROFILE DATA:
    ${candidateData}
    
    Generate the Perfect Match Job Spec now.
    `;

    const responseText = await runAIChain(systemPrompt, userMessage, 0.7, apiKey);
    return naturalizeText(responseText);
};
