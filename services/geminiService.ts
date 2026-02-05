import * as mammoth from "mammoth";
import { SYSTEM_PROMPT } from "../constants";
import { FileData, GeneratorResponse } from "../types";

const CEREBRAS_API_URL = "https://api.cerebras.ai/v1/chat/completions";

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
  // Handle PDF - Placeholder
  else if (file.mimeType === "application/pdf" || file.name.endsWith(".pdf")) {
    throw new Error("PDF parsing is not supported with this text-only model configuration. Please convert your CV to .docx or .txt.");
  }
  // Handle Text
  else {
    const decoder = new TextDecoder("utf-8");
    return decoder.decode(byteArray);
  }
}

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
      "content": "Full Cover Letter content in plain text..."
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
        model: "llama3.1-8b", 
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
