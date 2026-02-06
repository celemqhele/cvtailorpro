


import * as mammoth from "mammoth";
import * as pdfjsLib from 'pdfjs-dist';
import { SYSTEM_PROMPT, ANALYSIS_PROMPT } from "../constants";
import { FileData, GeneratorResponse, MatchAnalysis } from "../types";

const CEREBRAS_API_URL = "https://api.cerebras.ai/v1/chat/completions";

/**
 * Scrapes job content from a URL using Jina.ai (free markdown reader).
 * Note: SERP_API_KEY is available in constants if needed for specific engines,
 * but Jina is used here for direct URL text extraction compatibility on frontend.
 */
export const scrapeJobFromUrl = async (url: string): Promise<string> => {
    // Validating URL
    let targetUrl = url;
    if (!url.startsWith('http')) {
        targetUrl = 'https://' + url;
    }

    // Using r.jina.ai as a reader proxy to get Markdown content
    const scrapeUrl = `https://r.jina.ai/${targetUrl}`;

    try {
        const response = await fetch(scrapeUrl);
        if (!response.ok) {
            throw new Error(`Failed to scan job link (${response.status})`);
        }
        const text = await response.text();
        
        if (!text || text.length < 100) {
             throw new Error("Scanned content is too short. The link might be protected or invalid.");
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
      // Fix for "Cannot read properties of undefined (reading 'workerSrc')"
      // In some environments, the library is the default export
      const pdfjs = (pdfjsLib as any).default || pdfjsLib;

      // Set worker source to CDN to avoid bundler/browser issues
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
        
        // Extract strings from text items and join with spaces
        // Use a more robust join to prevent words running together
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
    cvFile: FileData,
    jobDescription: string,
    apiKey: string
): Promise<MatchAnalysis> => {
    
    // 1. Extract Text
    const cvText = await extractTextFromFile(cvFile);

    // 2. Prepare Messages
    const messages = [
        {
            role: "system",
            content: ANALYSIS_PROMPT
        },
        {
            role: "user",
            content: `JOB DESCRIPTION:\n${jobDescription.substring(0, 10000)}\n\nCANDIDATE CV:\n${cvText.substring(0, 10000)}`
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
  cvFile: FileData,
  jobDescription: string,
  apiKey: string,
  force: boolean = false
): Promise<GeneratorResponse> => {
  
  if (!apiKey) {
    throw new Error("API Key is missing. Please enter a valid Cerebras API Key.");
  }

  // 1. Extract Text from CV
  let cvText = "";
  try {
    cvText = await extractTextFromFile(cvFile);
  } catch (error: any) {
    throw new Error(`File processing error: ${error.message}`);
  }

  if (!cvText || cvText.length < 50) {
    throw new Error("Could not extract enough text from the CV. Please check the file.");
  }

  // 2. Prepare Prompt with Strict Schema
  const SCHEMA_INSTRUCTION = `
  CRITICAL INSTRUCTION: You must return strictly valid JSON.
  
  JSON Structure:
  {
    "outcome": "PROCEED", // or "REJECT" if unqualified
    "cv": {
      "title": "Candidate_Name_Role_CV.docx",
      "content": "# Full CV content in Markdown format..." 
    },
    "coverLetter": {
      "title": "Candidate_Name_Cover_Letter.docx",
      "content": "# Full, multi-paragraph Cover Letter in Markdown format including Date, Recipient info, Body, and Sign-off."
    },
    // If outcome is REJECT:
    "rejectionDetails": {
      "reason": "Explanation...",
      "suggestion": "Better fit roles..."
    }
  }
  `;

  let systemContent = SYSTEM_PROMPT + "\n\n" + SCHEMA_INSTRUCTION;

  if (force) {
    systemContent += `
    
    IMPORTANT OVERRIDE: 
    The user has requested to FORCE GENERATION regardless of qualification match.
    IGNORE the instruction to reject unqualified candidates.
    You MUST generate the tailored CV and Cover Letter to the best of your ability, even if the match is low.
    Set "outcome" to "PROCEED".
    `;
  }

  const messages = [
    {
      role: "system",
      content: systemContent
    },
    {
      role: "user",
      content: `Here is the Job Description:\n${jobDescription}\n\nHere is the Candidate's CV Text:\n${cvText}\n\nPerform the tailoring and return the JSON object.`
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

    // 4. Parse & Normalize JSON Response
    let parsedResponse: any;
    try {
      // Sometimes models wrap JSON in markdown blocks
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        content = jsonMatch[1];
      }
      parsedResponse = JSON.parse(content);
    } catch (e) {
      console.error("JSON Parse Error:", e, "Content:", content);
      throw new Error("Failed to parse the AI response. Please try again.");
    }

    // Normalize Data Structure (Handling potential model hallucinations on property names)
    if (parsedResponse.outcome !== 'REJECT') {
      
      // Ensure CV object structure
      if (!parsedResponse.cv) {
        parsedResponse.cv = { title: "Tailored_CV.docx", content: "" };
      }
      
      // Fix missing content property (mapped from common alternatives)
      if (!parsedResponse.cv.content) {
        parsedResponse.cv.content = parsedResponse.cv.body || parsedResponse.cv.text || parsedResponse.cv.markdown || "";
      }

      // Ensure Cover Letter object structure
      if (!parsedResponse.coverLetter) {
        parsedResponse.coverLetter = { title: "Cover_Letter.docx", content: "" };
      }

      if (!parsedResponse.coverLetter.content) {
        parsedResponse.coverLetter.content = parsedResponse.coverLetter.body || parsedResponse.coverLetter.text || "";
      }

      // --- FIX: Enforce Markdown Paragraph Spacing in Cover Letter ---
      // Markdown requires double newlines for a new paragraph. 
      // If the model generates single newlines, it renders as one block.
      // We detect if no double newlines exist but single newlines do, and assume compressed formatting.
      const clContent = parsedResponse.coverLetter.content;
      if (clContent && !clContent.includes('\n\n') && clContent.includes('\n')) {
          // Replace all single newlines with double newlines to ensure proper paragraphs in Markdown
          parsedResponse.coverLetter.content = clContent.replace(/\n/g, '\n\n');
      }
    }

    // Return result
    return {
      ...parsedResponse,
      brandingImage: undefined 
    } as GeneratorResponse;

  } catch (error) {
    console.error("API Request Failed:", error);
    throw error;
  }
};