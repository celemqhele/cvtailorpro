/** Updated: 2026-03-08 */
/* global AbortController */
import { GoogleGenAI } from "@google/genai";

function isJsonResponse(response: any) {
  const contentType = response.headers.get("content-type");
  return contentType && contentType.includes("application/json");
}

async function callGemini(modelName: any, systemPrompt: any, userPrompt: any, temperature: any, apiKey: any, jsonMode = false, timeoutMs = 60000, stream = false) {
  const ai = new GoogleGenAI({ apiKey });
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Gemini Timeout")), timeoutMs)
  );
  
  const config: any = {
    systemInstruction: systemPrompt,
    temperature: temperature,
    responseMimeType: jsonMode ? "application/json" : "text/plain"
  };

  if (stream) {
    const apiCall = ai.models.generateContentStream({
      model: modelName,
      contents: userPrompt,
      config
    });
    // We don't race streaming calls with timeout in the same way, 
    // but we could wrap the initial connection.
    // For now, just return the stream.
    return await apiCall;
  }

  const apiCall = ai.models.generateContent({
    model: modelName,
    contents: userPrompt,
    config
  });
  
  const response: any = await Promise.race([apiCall, timeoutPromise]);
  return response.text || "";
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { systemPrompt, userPrompt, temperature, jsonMode, task, planId, adminOverrideModel, stream } = req.body;

  if (!userPrompt) {
    return res.status(400).json({ error: 'Missing userPrompt' });
  }

  const geminiKeys = [process.env.GEMINI_KEY_1, process.env.GEMINI_KEY_2, process.env.GEMINI_API_KEY].filter(Boolean);

  console.log(`Keys available: Gemini(${geminiKeys.length})`);

  // Define Fallback Chains and Prompt Differentiation based on Plan
  let activeChain: any[] = [];
  let processedPrompt = systemPrompt;

  // Task-specific prompt differentiation (primarily for CV generation)
  if (task === 'cv_generation' || task === 'fill_skeleton') {
    if (planId === 'tier_3' || planId === 'tier_4' || planId?.startsWith('recruiter_')) {
      // PRO: Full prompt + Elite instructions
      processedPrompt += "\n\nTIER: PRO/UNLIMITED. Provide ELITE, deep-reasoning analysis. Use advanced psychological triggers, hyper-tailoring, and specific metrics. Include a 'Strategic Rationale' section explaining the tailoring choices.";
    } else if (planId === 'tier_2') {
      // GROWTH: Remove elite branding and some strategic depth
      processedPrompt = processedPrompt
        .replace("Strategic CV Architect and ATS Optimization Expert", "Professional CV Writer")
        .replace("maximizes ATS compatibility (target ≥85% match), improves recruiter readability, and positions the candidate as a strong match", "improves recruiter readability and positions the candidate as a match")
        .replace("Think critically, reason independently, and position the profile to clearly show value and alignment.", "Position the profile to show alignment.");
      processedPrompt += "\n\nTIER: GROWTH. Provide high-quality professional tailoring. Use strong action verbs and industry-specific keywords. Ensure all bullet points are impact-focused.";
    } else if (planId === 'tier_1') {
      // STARTER: Remove advanced frameworks and rationale
      processedPrompt = processedPrompt
        .replace("Strategic CV Architect and ATS Optimization Expert", "CV Assistant")
        .replace("maximizes ATS compatibility (target ≥85% match), improves recruiter readability, and positions the candidate as a strong match", "improves formatting and readability")
        .replace("Think critically, reason independently, and position the profile to clearly show value and alignment.", "Update the profile to match the job.")
        .replace("measurable outcomes, leadership scope, and contributions to growth or improvement", "basic responsibilities and tasks")
        .replace("Challenge / Action / Result (CAR) framework", "standard bullet points")
        .replace(/4\. Provide a rationale covering:[\s\S]*?perceived value\./, "4. Provide a brief summary of changes.");
      processedPrompt += "\n\nTIER: STARTER. Provide standard professional tailoring. Keep descriptions concise and focused on basic job requirements. Use common professional terminology.";
    } else {
      // FREE: Basic version - strip almost all strategy
      processedPrompt = processedPrompt
        .replace("Strategic CV Architect and ATS Optimization Expert", "Basic CV Formatter")
        .replace(/OBJECTIVE:[\s\S]*?achievements\./, "OBJECTIVE: Reformat the CV to match the job description. Do not fabricate achievements.")
        .replace(/TASK:[\s\S]*?perceived value\./, "TASK: 1. Update the CV content to match the job keywords.")
        .replace(/STRATEGIC GUIDELINES:[\s\S]*?no made-up numbers\./, "STRATEGIC GUIDELINES: Use simple language. Do not use CAR framework. Just list tasks. Do not fabricate numbers or achievements.")
        .replace(/"summary": "150-200 word professional summary[\s\S]*?forward-looking statement of value."/, '"summary": "A short 50-word summary of the candidate."')
        .replace(/"achievements": \["Bullet using CAR framework: \[Action\] \+ \[Achievement\] \+ \[Impact\/Outcome\] \+ \[Relevance\]"\]/, '"achievements": ["List basic responsibilities"]');
      processedPrompt += "\n\nTIER: FREE. Provide basic, concise tailoring. Limit the depth of analysis. Focus on standard formatting and essential keywords only. Do not provide advanced strategic insights. Do not fabricate experience.";
    }
  } else {
    // For other tasks, just use the tier limiter
    if (planId === 'tier_3' || planId === 'tier_4' || planId?.startsWith('recruiter_')) {
      processedPrompt += "\n\nTIER: PRO. Provide elite quality.";
    } else if (planId === 'tier_2') {
      processedPrompt += "\n\nTIER: GROWTH. Provide professional quality.";
    } else if (planId === 'tier_1') {
      processedPrompt += "\n\nTIER: STARTER. Provide standard quality.";
    } else {
      processedPrompt += "\n\nTIER: FREE. Provide basic quality.";
    }
  }

  const finalSystemPrompt = jsonMode 
    ? `${processedPrompt}\n\nIMPORTANT: You MUST return strictly valid JSON. Do not include any text before or after the JSON object.`
    : processedPrompt;

  // ADMIN OVERRIDE: If an admin explicitly chooses a model for testing
  if (adminOverrideModel) {
    console.log(`Admin Override: Testing model ${adminOverrideModel}`);
    if (adminOverrideModel.includes('gemini')) {
      activeChain = [{ provider: 'gemini', model: adminOverrideModel, keys: geminiKeys, timeout: 60000 }];
    } else {
      // Default fallback for admin override if not gemini (though user said only gemini)
      activeChain = [{ provider: 'gemini', model: 'gemini-3-flash-preview', keys: geminiKeys, timeout: 60000 }];
    }
  } else if (planId === 'tier_3' || planId === 'tier_4' || planId?.startsWith('recruiter_')) {
    // Pro/Unlimited: Gemini 3.1 Pro -> Gemini 3 Flash
    activeChain = [
      { provider: 'gemini',   model: 'gemini-3.1-pro-preview',   keys: geminiKeys,   timeout: 90000 },
      { provider: 'gemini',   model: 'gemini-3-flash-preview',   keys: geminiKeys,   timeout: 60000 },
    ];
  } else {
    // Free, Starter, Growth: Gemini 3 Flash -> Gemini 3.1 Flash Lite
    activeChain = [
      { provider: 'gemini',   model: 'gemini-3-flash-preview',      keys: geminiKeys,   timeout: 60000 },
      { provider: 'gemini',   model: 'gemini-3.1-flash-lite-preview', keys: geminiKeys,   timeout: 45000 },
    ];
  }

  for (const step of activeChain) {
    try {
      if (step.provider === 'gemini' && step.keys.length > 0) {
        for (const key of step.keys) {
          try {
            const result = await callGemini(step.model, finalSystemPrompt, userPrompt, temperature, key, jsonMode, step.timeout, stream);
            
            if (stream) {
              // Handle Streaming Response
              res.setHeader('Content-Type', 'text/plain; charset=utf-8');
              res.setHeader('Transfer-Encoding', 'chunked');
              
              for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                if (chunkText) {
                  res.write(chunkText);
                }
              }
              res.end();
              return;
            } else {
              // Handle Standard Response
              return res.status(200).json({ text: result, provider: `gemini:${step.model}` });
            }

          } catch (e) {
            console.warn(`Gemini ${step.model} failed, trying next...`, e);
            continue;
          }
        }
      }
    } catch (e: any) {
      console.warn(`Step ${step.provider} failed:`, e.message);
    }
  }

  return res.status(503).json({ 
    error: 'All AI providers are currently busy. Please try again in a moment.',
    details: 'All AI providers in the chain failed or timed out.'
  });
}