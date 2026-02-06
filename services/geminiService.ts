import * as mammoth from "mammoth";
import * as pdfjsLib from 'pdfjs-dist';
import { SYSTEM_PROMPT, ANALYSIS_PROMPT } from "../constants";
import { FileData, GeneratorResponse, MatchAnalysis } from "../types";

// Cerebras API Configuration
const CEREBRAS_API_URL = "https://api.cerebras.ai/v1/chat/completions";
const MODEL_NAME = "llama3.1-70b"; // Using Llama 3.1 70B as per Cerebras availability

/**
 * Scrapes job content from a URL using Jina.ai (free markdown reader).
 */
export const scrapeJobFromUrl = async (url: string): Promise<string> => {
    let targetUrl = url;
    if (!url.startsWith('http')) {
        targetUrl = 'https://' + url;
    }

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
            throw new Error(`Cerebras API Error: ${err}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) throw new Error("No content received from AI.");

        return JSON.parse(content);
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