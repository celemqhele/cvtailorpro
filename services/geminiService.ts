import * as mammoth from "mammoth";
import * as pdfjsLib from 'pdfjs-dist';
import { SYSTEM_PROMPT, ANALYSIS_PROMPT, SERP_API_KEY } from "../constants";
import { FileData, GeneratorResponse, MatchAnalysis } from "../types";

// Cerebras API Configuration
const CEREBRAS_API_URL = "https://api.cerebras.ai/v1/chat/completions";
const MODEL_NAME = "llama3.1-70b"; // Using Llama 3.1 70B as per Cerebras availability

/**
 * Scrapes job content from a URL using SerpApi (Google Jobs Engine).
 * This searches for the URL/Job via Google and extracts the full description.
 */
export const scrapeJobFromUrl = async (url: string): Promise<string> => {
    // We use the provided SERP_API_KEY to search for the job URL via Google Jobs
    const params = new URLSearchParams({
        engine: "google_jobs",
        q: url, // Passing the URL as the query often finds the exact job listing in Google's index
        api_key: SERP_API_KEY
    });

    const scrapeUrl = `https://serpapi.com/search.json?${params.toString()}`;

    try {
        const response = await fetch(scrapeUrl);

        if (!response.ok) {
            throw new Error(`SerpApi request failed (${response.status}).`);
        }
        
        const data = await response.json();
        
        // 1. Try to find the full job description in 'jobs_results'
        if (data.jobs_results && data.jobs_results.length > 0) {
            // We take the description from the first result
            const description = data.jobs_results[0].description;
            if (description && description.length > 50) {
                return description;
            }
        }
        
        // 2. Fallback: If 'jobs_results' is empty (Google Jobs didn't index it yet),
        // check organic results for a snippet, though this is usually too short.
        if (data.organic_results && data.organic_results.length > 0) {
             const snippet = data.organic_results[0].snippet;
             if (snippet && snippet.length > 100) return snippet;
        }
        
        throw new Error("Google Jobs could not extract the full description for this link.");
        
    } catch (e: any) {
        console.error("Scraping error:", e);
        // Throw a user-friendly error
        throw new Error("Could not automatically retrieve the job description via SerpApi. Please copy and paste the text manually.");
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
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + "\n\n";
      }
      
      return fullText;
    } catch (e) {
      console.error("PDF extraction failed", e);
      throw new Error("Failed to read PDF. Please ensure it is a text-based PDF.");
    }
  }
  // Handle Text
  else {
    const decoder = new TextDecoder("utf-8");
    return decoder.decode(byteArray);
  }
}

/**
 * Cleans the AI response string to ensure it is valid JSON.
 * Removes markdown code blocks (```json ... ```) and whitespace.
 */
function cleanJsonString(str: string): string {
    let clean = str.trim();
    // Remove markdown code blocks if present
    if (clean.startsWith('```json')) {
        clean = clean.replace(/^```json/, '').replace(/```$/, '');
    } else if (clean.startsWith('```')) {
        clean = clean.replace(/^```/, '').replace(/```$/, '');
    }
    return clean.trim();
}

/**
 * Common function to call Cerebras API
 */
async function callCerebrasAPI(systemPrompt: string, userPrompt: string): Promise<any> {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key is missing. Please check configuration.");

    try {
        const response = await fetch(CEREBRAS_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                response_format: { type: "json_object" }, // Enforce JSON output
                temperature: 0.7,
                max_tokens: 4096,
                top_p: 1
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Cerebras API Error (${response.status}): ${err}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) throw new Error("No content received from AI.");

        const cleanedContent = cleanJsonString(content);
        return JSON.parse(cleanedContent);

    } catch (e: any) {
        console.error("AI Service Error:", e);
        throw e;
    }
}

export const analyzeMatch = async (
    cvFile: FileData,
    jobDescription: string
): Promise<MatchAnalysis> => {
    
    const cvText = await extractTextFromFile(cvFile);
    
    const userPrompt = `
        JOB DESCRIPTION:
        ${jobDescription.substring(0, 15000)}

        CANDIDATE CV:
        ${cvText.substring(0, 15000)}
    `;

    try {
        const result = await callCerebrasAPI(ANALYSIS_PROMPT, userPrompt);
        // Basic Validation
        if (!result.decision || !result.matchScore) {
             console.warn("Invalid analysis structure received:", result);
             // Fallback for partial data
             return {
                 decision: result.decision || "SKIP",
                 matchScore: result.matchScore || 0,
                 headline: result.headline || "Analysis Incomplete",
                 pros: result.pros || [],
                 cons: result.cons || [],
                 reasoning: result.reasoning || "Could not parse full analysis."
             };
        }
        return result as MatchAnalysis;
    } catch (e) {
        console.error("Analysis failed", e);
        throw new Error("Failed to analyze job match.");
    }
};

export const generateTailoredApplication = async (
  cvFile: FileData,
  jobDescription: string,
  force: boolean = false
): Promise<GeneratorResponse> => {
  
  let cvText = "";
  try {
    cvText = await extractTextFromFile(cvFile);
  } catch (error: any) {
    throw new Error(`File processing error: ${error.message}`);
  }

  if (!cvText || cvText.length < 50) {
    throw new Error("Could not extract enough text from the CV. Please check the file.");
  }

  const userPrompt = `
    Job Description:
    ${jobDescription}

    Candidate CV Text:
    ${cvText}

    Task:
    Perform the tailoring based on the system instructions.
    ${force ? "IMPORTANT: Force generation even if the candidate is unqualified. Set outcome to PROCEED." : ""}
  `;

  try {
    const result = await callCerebrasAPI(SYSTEM_PROMPT, userPrompt);
    return result as GeneratorResponse;
  } catch (e: any) {
    console.error("Generation failed", e);
    throw new Error(e.message || "Failed to generate tailored application.");
  }
};