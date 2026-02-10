
import * as mammoth from "mammoth";
import * as pdfjsLib from 'pdfjs-dist';
import { SYSTEM_PROMPT, ANALYSIS_PROMPT, CEREBRAS_KEY, CHAT_SYSTEM_PROMPT } from "../constants";
import { FileData, GeneratorResponse, MatchAnalysis, ManualCVData } from "../types";

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
        // Throw specific error message that the UI will recognize to switch modes
        throw new Error("We couldn't read this link automatically. Please copy and paste the job description text manually.");
    }
};

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
    try {
      const pdfjs = (pdfjsLib as any).default || pdfjsLib;

      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        // Use a consistent version for worker
        const version = '3.11.174'; 
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`;
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
    } catch (e) {
      console.error("PDF extraction failed", e);
      throw new Error("Failed to read PDF. Please ensure it is a text-based PDF, not a scanned image.");
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
async function callCerebras(modelName: string, systemPrompt: string, userPrompt: string, temperature: number, jsonMode: boolean = false): Promise<string> {
  try {
    const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${CEREBRAS_KEY}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: temperature,
        max_tokens: 8192,
        response_format: jsonMode ? { type: "json_object" } : undefined
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Provider API Error (${modelName}):`, response.status, errText);
      throw new Error(`Provider API Error (${modelName}): ${response.status} ${errText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (e) {
    console.error(`Call failed for ${modelName}:`, e);
    throw e;
  }
}

async function runAIChain(systemInstruction: string, userMessage: string, temperature: number, apiKey: string): Promise<string> {
    const models = [
        "zai-glm-4.7",                    // Priority 1
        "qwen-3-235b-a22b-instruct-2507", // Priority 2
        "gpt-oss-120b",                   // Priority 3
        "llama-3.3-70b",                  // Priority 4 (Likely highest success rate)
        "qwen-3-32b",                     // Priority 5
        "llama-3.1-8b"                    // Priority 6 (Fallback speed)
    ];

    for (const model of models) {
        try {
            console.log(`Attempting Model: ${model}...`);
            // Attempt to call the model. If it's invalid/unavailable, callCerebras throws an error, 
            // which is caught here to try the next one.
            return await callCerebras(model, systemInstruction, userMessage, temperature, true);
        } catch (e: any) {
            console.warn(`Model ${model} failed or is unavailable:`, e.message);
        }
    }

    // Ultimate fallback if even the priority list fails
    try {
        console.log("All priority models failed. Attempting legacy Llama 3.1 70B...");
        return await callCerebras("llama-3.1-70b", systemInstruction, userMessage, temperature, true);
    } catch(e) {
        console.error("All AI services failed.");
        throw new Error("Service Unavailable: All AI models failed to respond. Please try again later.");
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

  let systemContent = SYSTEM_PROMPT + "\n\n" + SCHEMA_INSTRUCTION;

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
      STEP 2: Analyze the Target Job. Identify TOP 5 KEYWORDS.
      STEP 3: Rewrite the CV Data into the JSON structure. Integrate any relevant details from the "Additional Information" section into the summary, skills, or experience as appropriate.
      STEP 4: Write the Cover Letter content following the TRADITIONAL BUSINESS LETTER rules.
      
      ${linkedinInstruction}
      ${coverLetterInstruction}

      ${jobContext}
      
      ${candidateData}
      
      Perform the generation and return the JSON object.`;

  const responseText = await runAIChain(systemContent, userMessage, 0.6, apiKey);
  return parseAndProcessResponse(responseText);
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

      // Sanitization: Remove em dashes to look less like "AI"
      if (parsedResponse.coverLetter.content) {
          parsedResponse.coverLetter.content = parsedResponse.coverLetter.content.replace(/—/g, ' - ');
      }
    }

    return {
      ...parsedResponse,
      brandingImage: undefined 
    } as GeneratorResponse;
}

export const rewriteJobDescription = async (
  rawDescription: string,
  apiKey: string
): Promise<{ description: string; summary: string }> => {
    
    const systemPrompt = `
    You are a Professional Job Description Writer. 
    Your task is to rewrite a raw job posting into a professional, engaging 3rd person narrative.
    
    RULES:
    1. Write in the THIRD PERSON (e.g. "Google is looking for...", "The company requires...").
    2. Maintain all technical requirements and qualifications.
    3. Make it sound exciting and professional.
    
    OUTPUT FORMAT:
    Return strictly valid JSON:
    {
       "description": "Full rewritten job description in markdown format (use bullet points for requirements).",
       "summary": "A 2-sentence summary of the role and company for a listing card. STRICTLY write in the third person (e.g. 'The company is looking for...', 'This role involves...'). Do not use 'You will...' or 'We are looking for...'."
    }
    `;

    const userMessage = `
    RAW JOB DESCRIPTION:
    ${rawDescription}
    
    Please rewrite this now.
    `;
    
    const responseText = await runAIChain(systemPrompt, userMessage, 0.5, apiKey);
    return JSON.parse(responseText);
};

export const chatWithSupport = async (messageHistory: {role: 'user'|'assistant', content: string}[], userMessage: string): Promise<string> => {
    // Construct the messages array for the API
    const messages = [
        { role: "system", content: CHAT_SYSTEM_PROMPT },
        ...messageHistory,
        { role: "user", content: userMessage }
    ];

    try {
        const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${CEREBRAS_KEY}`
            },
            body: JSON.stringify({
                model: "llama-3.1-8b", // Cheapest/Fastest model for chat
                messages: messages,
                temperature: 0.7,
                max_tokens: 500
            })
        });

        if (!response.ok) {
             throw new Error("Chat service unavailable");
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "I apologize, I'm having trouble thinking right now.";
    } catch (e) {
        console.error("Chat Error:", e);
        return "I'm having trouble connecting to the server. Please try again later or email support.";
    }
};
