
import * as mammoth from "mammoth";
import * as pdfjsLib from 'pdfjs-dist';
import { SYSTEM_PROMPT, ANALYSIS_PROMPT, SERP_API_KEY, CEREBRAS_KEY } from "../constants";
import { FileData, GeneratorResponse, MatchAnalysis, ManualCVData, JobSearchResult } from "../types";

// Reliable CORS Proxy
const PROXY_URL = "https://api.allorigins.win/raw?url=";

/**
 * Helper to fetch JSON from a URL with CORS fallback.
 */
async function fetchJsonWithFallback(targetUrl: string): Promise<any> {
    // 1. Attempt Direct Fetch (Fastest, but likely blocked by CORS in browser)
    try {
        const response = await fetch(targetUrl);
        if (response.ok) {
            return await response.json();
        }
    } catch (e) {
        console.warn("Direct fetch blocked (CORS), attempting proxy...");
    }

    // 2. Attempt via Proxy
    try {
        // Add timestamp to prevent caching
        const proxiedUrl = `${PROXY_URL}${encodeURIComponent(targetUrl)}&_t=${Date.now()}`;
        const response = await fetch(proxiedUrl);
        
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Proxy error: ${response.status} ${text}`);
        }
        
        return await response.json();
    } catch (e: any) {
        console.error("Proxy fetch failed:", e);
        throw new Error("Unable to connect to search service. Please try again or check your internet connection.");
    }
}

/**
 * Scrapes job content using SerpApi Google Jobs engine directly.
 */
export const scrapeJobFromUrl = async (url: string): Promise<string> => {
    
    let scrapedText = "";

    // 1. Try SerpApi (Google Jobs) Direct Fetch
    if (SERP_API_KEY) {
        try {
            console.log("Attempting SerpApi Google Jobs scrape...");
            // We search for the URL itself to see if Google Jobs indexed it
            const targetUrl = `https://serpapi.com/search.json?engine=google_jobs&q=${encodeURIComponent(url)}&api_key=${SERP_API_KEY}&hl=en`;
            
            const data = await fetchJsonWithFallback(targetUrl);
            
            if (data.jobs_results && data.jobs_results.length > 0) {
                const job = data.jobs_results[0];
                // Simple heuristic: if the title is vaguely similar or it's the only result
                if (job.description && job.description.length > 100) {
                    scrapedText = `
JOB TITLE: ${job.title}
COMPANY: ${job.company_name}
LOCATION: ${job.location}

DESCRIPTION:
${job.description}
                    `.trim();
                }
            }
        } catch (error) {
            console.warn("SerpApi scrape attempt failed, initiating fallback.", error);
        }
    }

    if (scrapedText) return scrapedText;

    // 2. Fallback to Jina.ai
    console.log("Attempting Jina scrape...");
    let targetUrl = url;
    if (!url.startsWith('http')) {
        targetUrl = 'https://' + url;
    }

    const scrapeUrl = `https://r.jina.ai/${targetUrl}`;

    try {
        const response = await fetch(scrapeUrl);
        if (!response.ok) {
            if (response.status === 451 || response.status === 403) {
                throw new Error("This job board blocks automated scanning. Please copy and paste the job description text manually.");
            }
            throw new Error(`Failed to scan job link with Jina (${response.status})`);
        }
        const text = await response.text();
        
        if (!text || text.length < 100 || text.includes("Please enable cookies") || text.includes("Access Denied")) {
             throw new Error("Scanned content appears to be blocked or invalid. Please try pasting the text manually.");
        }
        
        return text;
    } catch (e: any) {
        console.error("Jina scraping error:", e);
        throw new Error(e.message || "Failed to scan job link. Please paste the description manually.");
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

// --- JOB FINDER LOGIC ---

export const findJobsMatchingCV = async (
    cvFile: FileData | null,
    manualData: ManualCVData | null,
    locationOverride: string = ''
): Promise<JobSearchResult[]> => {

    // 1. Extract CV Data
    let candidateText = "";
    if (cvFile) {
        candidateText = await extractTextFromFile(cvFile);
    } else if (manualData) {
        candidateText = JSON.stringify(manualData);
    }

    // 2. Identify Search Query via AI
    const queryPrompt = `
        Analyze this CV. Extract the top 2 most relevant Job Titles for this candidate and their primary location (city/country).
        Output JSON: { "query": "Job Title OR Job Title 2", "location": "City, Country" }
        If user provided location override: "${locationOverride}", use that.
    `;
    const criteriaJson = await runAIChain("You are a search query optimizer.", `${queryPrompt}\n\nCV:\n${candidateText.substring(0, 5000)}`, 0.1);
    
    let criteria;
    try {
        criteria = JSON.parse(criteriaJson);
    } catch (e) {
        console.error("Failed to parse criteria JSON", criteriaJson);
        throw new Error("Failed to analyze CV for search criteria.");
    }

    // 3. Search via SerpApi (Google Jobs) - With Proxy Fallback
    const searchQuery = `${criteria.query} ${criteria.location}`;
    console.log(`Searching for: ${searchQuery}`);

    // Construct SerpApi URL for Google Jobs
    const serpUrl = `https://serpapi.com/search.json?engine=google_jobs&q=${encodeURIComponent(searchQuery)}&hl=en&num=20&api_key=${SERP_API_KEY}`;
    
    let jobs = [];
    
    try {
        const data = await fetchJsonWithFallback(serpUrl);
        
        const rawJobs = data.jobs_results || [];

        // 4. Process and Filter Jobs
        // Rule: Only keep jobs with direct apply options (apply_options)
        jobs = rawJobs.filter((j: any) => j.apply_options && Array.isArray(j.apply_options) && j.apply_options.length > 0);

        // Extra fallback: If strict filtering returns nothing, relax it but mark them
        if (jobs.length === 0 && rawJobs.length > 0) {
            console.warn("No jobs with direct apply_options found. Returning filtered raw jobs.");
            jobs = rawJobs;
        }

    } catch (error: any) {
        console.error("SerpApi Fetch Error:", error);
        throw new Error(error.message || "Could not connect to job search service. Please try again later.");
    }

    if (jobs.length === 0) return [];

    // 5. Analyze Matches in Batch (Top 10)
    const topJobs = jobs.slice(0, 10);
    
    const analysisPrompt = `
        You are a Recruiter. Analyze these jobs against the CV summary below.
        
        CV Summary: ${candidateText.substring(0, 2000)}...

        JOBS TO ANALYZE:
        ${JSON.stringify(topJobs.map((j: any, i: number) => ({
            id: i,
            title: j.title,
            company: j.company_name,
            snippet: j.description ? j.description.substring(0, 300) : "No desc"
        })))}

        Output JSON Array:
        [
            {
                "id": number,
                "matchScore": number (0-100),
                "analysis": "1 sentence why it matches or not."
            }
        ]
    `;

    const analysisRes = await runAIChain("Job Match Analyzer", analysisPrompt, 0.2);
    let analyses = [];
    try {
        analyses = JSON.parse(analysisRes);
    } catch(e) {
        console.warn("Failed to parse batch analysis, using defaults.", e);
        analyses = [];
    }

    // 6. Map to JobSearchResult
    const results: JobSearchResult[] = topJobs.map((job: any, index: number) => {
        const analysis = analyses.find((a: any) => a.id === index) || { matchScore: 50, analysis: "Potential match based on keywords." };
        
        // Calculate Recency Score
        let recencyScore = 50; 
        const posted = job.detected_extensions?.posted_at || "";
        if (posted.toLowerCase().includes("hour") || posted.toLowerCase().includes("just")) recencyScore = 100;
        else if (posted.toLowerCase().includes("1 day")) recencyScore = 90;
        else if (posted.toLowerCase().includes("2 day")) recencyScore = 80;
        else if (posted.toLowerCase().includes("3 day")) recencyScore = 70;
        else if (posted.toLowerCase().includes("week")) recencyScore = 50;
        else if (posted.toLowerCase().includes("month")) recencyScore = 20;

        const rankScore = (recencyScore * 0.6) + (analysis.matchScore * 0.4);

        // Extract Apply Links
        let applyLinks: any[] = [];
        if (job.apply_options && Array.isArray(job.apply_options)) {
             applyLinks = job.apply_options.map((opt: any) => ({
                link: opt.link,
                title: opt.title || "Apply Now"
            }));
        }

        // Use the first valid link as the primary URL, or Google Jobs URL if none
        const primaryUrl = applyLinks.length > 0 ? applyLinks[0].link : (job.share_link || "#");

        return {
            title: job.title,
            company: job.company_name,
            location: job.location,
            url: primaryUrl,
            applyLinks: applyLinks,
            datePosted: posted || "Recently",
            descriptionSnippet: job.description ? job.description.substring(0, 200) + "..." : "Click to view details.",
            matchScore: analysis.matchScore,
            analysis: analysis.analysis,
            rankScore: rankScore
        };
    });

    // Sort by rankScore desc
    return results.sort((a, b) => b.rankScore - a.rankScore);
};

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

    const userMessage = `JOB DESCRIPTION:\n${jobDescription.substring(0, 15000)}\n\nCANDIDATE CV DATA:\n${candidateText.substring(0, 15000)}`;

    const responseText = await runAIChain(ANALYSIS_PROMPT, userMessage, 0.2);
    
    try {
        return JSON.parse(responseText);
    } catch (e) {
        console.error("JSON Parse Error in AnalyzeMatch:", e);
        throw new Error("Failed to parse analysis result.");
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
