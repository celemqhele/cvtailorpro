/** Updated: 2026-03-06 */
/* global AbortController */
import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";

// ============================================================
// TODO FOR AI STUDIO (restore tier routing when ready):
// - Free/Starter: Cerebras Cerebras-GPT-13B-Instruct -> Mistral-7B-Instruct-v0.2
// - Growth: gemini-2.0-flash -> Cerebras fallback
// - Pro: Claude -> gemini-2.0-flash -> Cerebras fallback
// Currently all tiers share the same chain (plan limits enforced on frontend).
// ============================================================

const CEREBRAS_MODELS = [
  'llama3.3-70b', 
  'llama3.1-70b',
  'llama3.1-8b',
  'GLM-4.7',
  'glm-4',
  'Cerebras-GPT-13B-Instruct', 
  'Mistral-7B-Instruct-v0.2'
];

function isJsonResponse(response: any) {
  const contentType = response.headers.get("content-type");
  return contentType && contentType.includes("application/json");
}

async function callClaude(systemPrompt: any, userPrompt: any, temperature: any, apiKey: any) {
  try {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      temperature: temperature || 0.5,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
    const content = response.content[0];
    if (content.type === 'text') return content.text;
    return "";
  } catch (err: any) {
    console.error("Claude API Error:", err.message);
    throw err;
  }
}

async function callCerebras(modelName: any, systemPrompt: any, userPrompt: any, temperature: any, apiKey: any, jsonMode = false, timeoutMs = 30000) {
  if (!CEREBRAS_MODELS.includes(modelName)) {
    console.warn(`Cerebras model not whitelisted: ${modelName}`);
    throw new Error(`Model ${modelName} is not whitelisted for Cerebras.`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    console.log(`Calling Cerebras with model: ${modelName}`);
    const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: temperature,
        max_tokens: 4096,
        response_format: jsonMode ? { type: "json_object" } : undefined
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      if (isJsonResponse(response)) {
        const errJson = await response.json();
        const msg = errJson.message || JSON.stringify(errJson);
        if (response.status === 402) {
          throw new Error(`Cerebras Payment Required (402): ${msg}. Please check your billing tab.`);
        }
        throw new Error(`Cerebras API Error (${modelName}): ${response.status} - ${msg}`);
      } else {
        const text = await response.text();
        throw new Error(`Cerebras returned HTML/Text Error (${modelName}): ${response.status} - ${text.slice(0, 200)}`);
      }
    }

    if (!isJsonResponse(response)) {
      const text = await response.text();
      throw new Error(`Cerebras returned non-JSON response (${modelName}): ${text.slice(0, 200)}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error(`Cerebras Timeout (${modelName})`);
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callGemini(modelName: any, systemPrompt: any, userPrompt: any, temperature: any, apiKey: any, jsonMode = false, timeoutMs = 20000) {
  const ai = new GoogleGenAI({ apiKey });
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Gemini Timeout")), timeoutMs)
  );
  const apiCall = ai.models.generateContent({
    model: modelName,
    contents: userPrompt,
    config: {
      systemInstruction: systemPrompt,
      temperature: temperature,
      responseMimeType: jsonMode ? "application/json" : "text/plain"
    }
  });
  const response: any = await Promise.race([apiCall, timeoutPromise]);
  return response.text || "";
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { systemPrompt, userPrompt, temperature, jsonMode, task, planId, adminOverrideModel } = req.body;

  if (!userPrompt) {
    return res.status(400).json({ error: 'Missing userPrompt' });
  }

  const geminiKeys = [process.env.GEMINI_KEY_1, process.env.GEMINI_KEY_2, process.env.GEMINI_API_KEY].filter(Boolean);
  const cerebrasKeys = [process.env.CEREBRAS_KEY, process.env.CEREBRAS_KEY_2, process.env.CEREBRAS_API_KEY].filter(Boolean);
  const claudeKey = process.env.CLAUDE_API_KEY;

  console.log(`Keys available: Gemini(${geminiKeys.length}), Cerebras(${cerebrasKeys.length}), Claude(${claudeKey ? 1 : 0})`);
  if (cerebrasKeys.length > 0) {
    const firstKey = cerebrasKeys[0];
    if (firstKey) {
      console.log(`Using Cerebras Key: ${firstKey.slice(0, 4)}...${firstKey.slice(-4)}`);
    }
  }

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
        .replace(/OBJECTIVE:[\s\S]*?achievements\./, "OBJECTIVE: Reformat the CV to match the job description.")
        .replace(/TASK:[\s\S]*?perceived value\./, "TASK: 1. Update the CV content to match the job keywords.")
        .replace(/STRATEGIC GUIDELINES:[\s\S]*?no made-up numbers\./, "STRATEGIC GUIDELINES: Use simple language. Do not use CAR framework. Just list tasks.")
        .replace(/"summary": "150-200 word professional summary[\s\S]*?forward-looking statement of value."/, '"summary": "A short 50-word summary of the candidate."')
        .replace(/"achievements": \["Bullet using CAR framework: \[Action\] \+ \[Achievement\] \+ \[Impact\/Outcome\] \+ \[Relevance\]"\]/, '"achievements": ["List basic responsibilities"]');
      processedPrompt += "\n\nTIER: FREE. Provide basic, concise tailoring. Limit the depth of analysis. Focus on standard formatting and essential keywords only. Do not provide advanced strategic insights.";
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
    if (adminOverrideModel.startsWith('claude')) {
      activeChain = [{ provider: 'claude', model: adminOverrideModel, key: claudeKey, timeout: 60000 }];
    } else if (adminOverrideModel.includes('gemini')) {
      activeChain = [{ provider: 'gemini', model: adminOverrideModel, keys: geminiKeys, timeout: 60000 }];
    } else {
      activeChain = [{ provider: 'cerebras', model: adminOverrideModel, keys: cerebrasKeys, timeout: 60000 }];
    }
  } else if (planId === 'tier_3' || planId === 'tier_4' || planId?.startsWith('recruiter_')) {
    // Pro/Unlimited: Gemini 3.1 Pro (Thinking) -> Claude -> Cerebras
    activeChain = [
      { provider: 'gemini',   model: 'gemini-3.1-pro-preview',   keys: geminiKeys,   timeout: 45000 },
      { provider: 'claude',   model: 'claude-sonnet-4-20250514', key: claudeKey,     timeout: 40000 },
      { provider: 'gemini',   model: 'gemini-3-flash-preview',   keys: geminiKeys,   timeout: 20000 },
      { provider: 'cerebras', model: 'llama3.3-70b',             keys: cerebrasKeys, timeout: 30000 },
    ];
  } else {
    // Free, Starter, Growth: Gemini 3 Flash -> Cerebras Fallback
    activeChain = [
      { provider: 'gemini',   model: 'gemini-3-flash-preview',      keys: geminiKeys,   timeout: 30000 },
      { provider: 'gemini',   model: 'gemini-3.1-flash-lite-preview', keys: geminiKeys,   timeout: 25000 },
      { provider: 'cerebras', model: 'llama3.1-8b',                keys: cerebrasKeys, timeout: 25000 },
    ];
  }

  for (const step of activeChain) {
    try {
      if (step.provider === 'claude' && step.key) {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Claude Timeout")), step.timeout || 30000)
        );
        const text: any = await Promise.race([
          callClaude(finalSystemPrompt, userPrompt, temperature, step.key),
          timeoutPromise
        ]);
        return res.status(200).json({ text, provider: 'claude' });
      }

      if (step.provider === 'gemini' && step.keys.length > 0) {
        for (const key of step.keys) {
          try {
            const text = await callGemini(step.model, finalSystemPrompt, userPrompt, temperature, key, jsonMode, step.timeout);
            return res.status(200).json({ text, provider: `gemini:${step.model}` });
          } catch (e) {
            console.warn(`Gemini ${step.model} failed, trying next...`, e);
            continue;
          }
        }
      }

      if (step.provider === 'cerebras' && step.keys.length > 0) {
        for (const key of step.keys) {
          try {
            const text = await callCerebras(step.model, finalSystemPrompt, userPrompt, temperature, key, jsonMode, step.timeout);
            return res.status(200).json({ text, provider: `cerebras:${step.model}` });
          } catch (e) {
            console.warn(`Cerebras ${step.model} failed, trying next...`, e);
            continue;
          }
        }
      }

    } catch (e: any) {
      console.warn(`Step ${step.provider} failed:`, e.message);
    }
  }

  return res.status(503).json({ 
    error: 'High traffic, try again in 1 minute',
    details: 'All AI providers in the chain failed or timed out.'
  });
}