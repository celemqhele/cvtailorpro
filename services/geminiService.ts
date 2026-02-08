
import * as mammoth from "mammoth";
import * as pdfjsLib from 'pdfjs-dist';
import { SYSTEM_PROMPT, ANALYSIS_PROMPT, SERP_API_KEY } from "../constants";
import { FileData, GeneratorResponse, MatchAnalysis, ManualCVData } from "../types";

const CEREBRAS_API_URL = "https://api.cerebras.ai/v1/chat/completions";

/**
 * Scrapes job content.
 * Priority 1: SerpApi (Google Jobs) - Uses Google's index to bypass anti-bot on LinkedIn/Indeed.
 * Priority 2: Jina.ai - Direct markdown reader fallback.
 */
export const scrapeJobFromUrl = async (url: string): Promise<string> => {
    
    // 1. Try SerpApi (Google Jobs)
    if (SERP_API_KEY) {
        try {
            // We use the specific job URL as the query. Google Jobs is effective at matching these.
            const serpUrl = `https://serpapi.com/search.json?engine=google_jobs&q=${encodeURIComponent(url)}&api_key=${SERP_API_KEY}&hl=en`;
            
            const response = await fetch(serpUrl);
            if (response.ok) {
                const data = await response.json();
                
                // Check if we have results
                if (data.jobs_results && data.jobs_results.length > 0) {
                    const job = data.jobs_results[0];
                    
                    if (job.description && job.description.length > 100) {
                        return `
JOB TITLE: ${job.title}
COMPANY: ${job.company_name}
LOCATION: ${job.location}

DESCRIPTION:
${job.description}
                        `.trim();
                    }
                }
            }
        } catch (error) {
            console.warn("SerpApi scrape attempt failed, falling back to Jina.", error);
        }
    }

    // 2. Fallback to Jina.ai
    let targetUrl = url;
    if (!url.startsWith('http')) {
        targetUrl = 'https://' + url;
    }

    const scrapeUrl = `https://r.jina.ai/${targetUrl}`;

    try {
        const response = await fetch(scrapeUrl);
        if (!response.ok) {
            if (response.status === 451) {
                throw new Error("This job board blocks automated scanning (Error 451). Please copy and paste the job description text manually.");
            }
            if (response.status === 403) {
                throw new Error("Access denied by the job board (Error 403). Please copy and paste the job description text manually.");
            }
            throw new Error(`Failed to scan job link (${response.status})`);
        }
        const text = await response.text();
        
        // Basic validation of returned content
        if (!text || text.length < 100 || text.includes("Please enable cookies") || text.includes("Access Denied")) {
             throw new Error("Scanned content appears to be blocked or invalid. Please try pasting the text manually.");
        }
        
        return text;
    } catch (e: any) {
        console.error("Scraping error:", e);
        throw new Error(e.message || "Failed to scan job link.");
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

    // 2. Prepare Messages
    const messages = [
        {
            role: "system",
            content: ANALYSIS_PROMPT
        },
        {
            role: "user",
            content: `JOB DESCRIPTION:\n${jobDescription.substring(0, 10000)}\n\nCANDIDATE CV DATA:\n${candidateText.substring(0, 10000)}`
        }
    ];

    try {
        const response = await fetch(CEREBRAS_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "llama-3.3-70b", 
                messages: messages,
                temperature: 0.7,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) throw new Error("Analysis API failed");
        
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        return JSON.parse(content);
    } catch (e) {
        console.error("Analysis failed", e);
        throw new Error("Failed to analyze job match.");
    }
};

export const generateTailoredApplication = async (
  cvFile: FileData | null,
  manualData: ManualCVData | null,
  jobSpec: string,
  targetType: 'specific' | 'title',
  apiKey: string,
  force: boolean = false
): Promise<GeneratorResponse> => {
  
  if (!apiKey) {
    throw new Error("API Key is missing. Please enter a valid Cerebras API Key.");
  }

  // 1. Extract Text from CV Source
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

  if (candidateData.length < 50) {
    throw new Error("Could not extract enough text from the CV input.");
  }

  // 2. Prepare Prompt with Strict Schema
  const SCHEMA_INSTRUCTION = `
  CRITICAL INSTRUCTION: You must return strictly valid JSON.
  
  JSON Structure:
  {
    "outcome": "PROCEED", // or "REJECT" if unqualified (only if targetType is 'specific')
    "cv": {
      "title": "Candidate_Name_Role_CV.docx",
      "content": "# Full CV content in Markdown format..." 
    },
    "coverLetter": {
      "title": "Candidate_Name_Cover_Letter.docx",
      "content": "# Full, multi-paragraph Cover Letter in Markdown format including Date, Recipient info, Body, and Sign-off."
    },
    "rejectionDetails": {
      "reason": "Explanation...",
      "suggestion": "Better fit roles..."
    }
  }
  `;

  let systemContent = SYSTEM_PROMPT + "\n\n" + SCHEMA_INSTRUCTION;

  if (force || targetType === 'title') {
    systemContent += `
    
    IMPORTANT OVERRIDE: 
    Set "outcome" to "PROCEED". Do not reject.
    ${targetType === 'title' ? 'Optimize for the INDUSTRY STANDARD of the provided Job Title.' : 'Force generation despite low match.'}
    `;
  }

  const jobContext = targetType === 'specific' 
    ? `TARGET JOB DESCRIPTION:\n${jobSpec}`
    : `TARGET JOB TITLE (General Optimization): ${jobSpec}`;

  const messages = [
    {
      role: "system",
      content: systemContent
    },
    {
      role: "user",
      content: `${jobContext}\n\n${candidateData}\n\nPerform the generation and return the JSON object.`
    }
  ];

  try {
    // 3. Call Cerebras API
    const response = await fetch(CEREBRAS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b", 
        messages: messages,
        temperature: 0.7,
        max_completion_tokens: 4000,
        response_format: { type: "json_object" },
        stream: false
      })
    });

    if (!response.ok) {
      const err = await response.text();
      try {
        const errJson = JSON.parse(err);
        if (errJson.message) throw new Error(`Cerebras API Error: ${errJson.message}`);
      } catch (e) {
        // ignore
      }
      throw new Error(`Cerebras API Error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Empty response from Cerebras.");
    }

    let parsedResponse: any;
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        content = jsonMatch[1];
      }
      parsedResponse = JSON.parse(content);
    } catch (e) {
      console.error("JSON Parse Error:", e, "Content:", content);
      throw new Error("Failed to parse the AI response. Please try again.");
    }

    if (parsedResponse.outcome !== 'REJECT') {
      if (!parsedResponse.cv) parsedResponse.cv = { title: "Tailored_CV.docx", content: "" };
      if (!parsedResponse.cv.content) parsedResponse.cv.content = parsedResponse.cv.body || parsedResponse.cv.text || "";
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

  } catch (error) {
    console.error("API Request Failed:", error);
    throw error;
  }
};
