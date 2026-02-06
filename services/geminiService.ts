import { GoogleGenAI, Type } from "@google/genai";
import * as mammoth from "mammoth";
import * as pdfjsLib from 'pdfjs-dist';
import { SYSTEM_PROMPT, ANALYSIS_PROMPT } from "../constants";
import { FileData, GeneratorResponse, MatchAnalysis } from "../types";

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

export const analyzeMatch = async (
    cvFile: FileData,
    jobDescription: string
): Promise<MatchAnalysis> => {
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const cvText = await extractTextFromFile(cvFile);

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: {
                parts: [
                    { text: "Analyze the Candidate CV against the Job Description to determine fit." },
                    { text: `JOB DESCRIPTION:\n${jobDescription.substring(0, 20000)}` },
                    { text: `CANDIDATE CV:\n${cvText.substring(0, 20000)}` }
                ]
            },
            config: {
                systemInstruction: ANALYSIS_PROMPT,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        decision: { type: Type.STRING, enum: ["APPLY", "CAUTION", "SKIP"] },
                        matchScore: { type: Type.INTEGER },
                        headline: { type: Type.STRING },
                        pros: { type: Type.ARRAY, items: { type: Type.STRING } },
                        cons: { type: Type.ARRAY, items: { type: Type.STRING } },
                        reasoning: { type: Type.STRING }
                    },
                    required: ["decision", "matchScore", "headline", "pros", "cons", "reasoning"]
                }
            }
        });

        const text = response.text;
        if (!text) throw new Error("No response from AI");
        return JSON.parse(text);

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
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let cvText = "";
  try {
    cvText = await extractTextFromFile(cvFile);
  } catch (error: any) {
    throw new Error(`File processing error: ${error.message}`);
  }

  if (!cvText || cvText.length < 50) {
    throw new Error("Could not extract enough text from the CV. Please check the file.");
  }

  const prompt = `
    Job Description:
    ${jobDescription}

    Candidate CV Text:
    ${cvText}

    Task:
    Perform the tailoring based on the system instructions.
    ${force ? "IMPORTANT: Force generation even if the candidate is unqualified. Set outcome to PROCEED." : ""}
  `;

  try {
    const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: {
            parts: [{ text: prompt }]
        },
        config: {
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    outcome: { type: Type.STRING, enum: ["PROCEED", "REJECT"] },
                    rejectionDetails: {
                        type: Type.OBJECT,
                        properties: {
                            reason: { type: Type.STRING },
                            suggestion: { type: Type.STRING }
                        }
                    },
                    cv: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            content: { type: Type.STRING }
                        },
                        required: ["title", "content"]
                    },
                    coverLetter: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            content: { type: Type.STRING }
                        },
                        required: ["title", "content"]
                    },
                    brandingImage: { type: Type.STRING }
                },
                required: ["outcome"]
            }
        }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as GeneratorResponse;

  } catch (e: any) {
    console.error("Generation failed", e);
    throw new Error(e.message || "Failed to generate tailored application.");
  }
};
