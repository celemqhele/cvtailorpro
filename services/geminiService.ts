
import * as mammoth from "mammoth";
import * as pdfjsLib from 'pdfjs-dist';
import { SYSTEM_PROMPT, ANALYSIS_PROMPT, CEREBRAS_KEY } from "../constants";
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
 */
async function extractTextFromFile(file: FileData): Promise<string> {
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
        const version = pdfjs.version || '3.11.174';
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
 * Executes a call to Cerebras API with a specific model.
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
      console.error(`Cerebras API Error (${modelName}):`, response.status, errText);
      throw new Error(`Cerebras API Error (${modelName}): ${response.status} ${errText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (e) {
    console.error(`Cerebras call failed for ${modelName}:`, e);
    throw e;
  }
}

async function runAIChain(systemInstruction: string, userMessage: string, temperature: number): Promise<string> {
    try {
        console.log("Attempting Primary: GPT-OSS-120B (Llama-70b proxy)..."); 
        return await callCerebras("llama-3.3-70b", systemInstruction, userMessage, temperature, true);
    } catch (e: any) {
        console.warn("Primary Model Failed:", e.message);
    }

    try {
        console.log("Attempting Secondary: Llama 3.1 70B...");
        return await callCerebras("llama-3.1-70b", systemInstruction, userMessage, temperature, true);
    } catch (e: any) {
        console.warn("Secondary Model Failed:", e.message);
    }

    try {
        console.log("Attempting Tertiary: Llama 3.1 8B...");
        return await callCerebras("llama-3.1-8b", systemInstruction, userMessage, temperature, true);
    } catch (e: any) {
        console.error("All AI services failed.", e);
        throw new Error("Service Unavailable: All AI models failed to respond. Please try again later.");
    }
}

export const analyzeMatch = async (
    cvFile: FileData | null,
    manualData: ManualCVData | null,
    jobDescription: string,
    apiKey: string 
): Promise<MatchAnalysis> => {
    
    // 1. Extract Text
    let candidateText = "";
    if (cvFile) {
        candidateText = await extractTextFromFile(cvFile);
    } else if (manualData) {
        candidateText = JSON.stringify(manualData);
    }

    // 2. Client-Side Execution (Primary)
    try {
        // Truncate to prevent context overflow if necessary, but 120B models have large context.
        // We strictly format the message to ensure clear separation.
        const userMessage = `
        JOB DESCRIPTION:
        ${jobDescription.substring(0, 15000)}
        
        --------------------------------------------------
        
        CANDIDATE CV DATA:
        ${candidateText.substring(0, 15000)}
        `;
        
        const responseText = await runAIChain(ANALYSIS_PROMPT, userMessage, 0.2);
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
  linkedinUrl?: string
): Promise<GeneratorResponse> => {
  
  // 1. Extract Text
  let candidateData = "";
  try {
    if (cvFile) {
        candidateData = "CANDIDATE EXISTING CV:\n" + (await extractTextFromFile(cvFile));
    } else if (manualData) {
        candidateData = "CANDIDATE MANUAL ENTRY:\n" + JSON.stringify(manualData, null, 2);
    } else {
        throw new Error("No candidate data provided.");
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
      "content": "# Markdown content..."
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

  const linkedinInstruction = linkedinUrl 
    ? `MANDATORY LINKEDIN INSTRUCTION: The user provided this LinkedIn URL: ${linkedinUrl}. Insert this into the "linkedin" field in the JSON.`
    : `MANDATORY LINKEDIN INSTRUCTION: The user did NOT provide a LinkedIn URL. Set "linkedin" to null or use the one found in the CV text if available.`;

  const userMessage = `
      STEP 1: Analyze the Candidate CV. Identify all METRICS, NUMBERS, and SPECIFIC ACHIEVEMENTS.
      STEP 2: Analyze the Target Job. Identify TOP 5 KEYWORDS.
      STEP 3: Rewrite the CV Data into the JSON structure.
      
      ${linkedinInstruction}

      ${jobContext}
      
      ${candidateData}
      
      Perform the generation and return the JSON object.`;

  const responseText = await runAIChain(systemContent, userMessage, 0.6);
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

      if (!parsedResponse.coverLetter) parsedResponse.coverLetter = { title: "Cover_Letter.docx", content: "" };
      if (!parsedResponse.coverLetter.content) parsedResponse.coverLetter.content = parsedResponse.coverLetter.body || parsedResponse.coverLetter.text || "";

      const clContent = parsedResponse.coverLetter.content;
      if (clContent && !clContent.includes('\n\n') && clContent.includes('\n')) {
          parsedResponse.coverLetter.content = clContent.replace(/\n/g, '\n\n');
      }
    }

    return {
      ...parsedResponse,
      brandingImage: undefined 
    } as GeneratorResponse;
}