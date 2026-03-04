
/* global AbortController */
import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";

async function callClaude(systemPrompt: any, userPrompt: any, temperature: any, apiKey: any) {
  const anthropic = new Anthropic({ apiKey });
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    temperature: temperature || 0.5,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });
  
  const content = response.content[0];
  if (content.type === 'text') {
    return content.text;
  }
  return "";
}

async function callCerebras(modelName: any, systemPrompt: any, userPrompt: any, temperature: any, apiKey: any, jsonMode = false, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
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
      const errText = await response.text();
      throw new Error(`Cerebras API Error (${modelName}): ${response.status} ${errText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callGemini(modelName: any, systemPrompt: any, userPrompt: any, temperature: any, apiKey: any, jsonMode = false, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const ai = new GoogleGenAI({ apiKey });
    // Note: @google/genai doesn't natively support AbortSignal in all methods easily, 
    // but we can wrap the call in a promise race or just use the timeout config if available.
    // However, the SDK we use might not have it. Let's use a Promise wrapper for strict timeout.
    
    const apiCall = ai.models.generateContent({
      model: modelName,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: temperature,
        responseMimeType: jsonMode ? "application/json" : "text/plain"
      }
    });

    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Gemini Timeout")), timeoutMs);
    });

    const response: any = await Promise.race([apiCall, timeoutPromise]);
    return response.text || "";
  } finally {
    clearTimeout(timeoutId);
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { systemPrompt, userPrompt, temperature, jsonMode, task, planId } = req.body;

  if (!userPrompt) {
    return res.status(400).json({ error: 'Missing userPrompt' });
  }

  const geminiKeys = [process.env.GEMINI_API_KEY, process.env.GEMINI_KEY_2].filter(Boolean);
  const cerebrasKeys = [process.env.CEREBRAS_KEY_2].filter(Boolean);
  const claudeKey = process.env.CLAUDE_API_KEY;

  // Define Fallback Chains based on Plan
  // Pro/Unlimited: Claude -> Gemini Pro -> Gemini Flash -> Cerebras
  // Growth: Gemini Flash -> Cerebras
  // Free/Starter: Cerebras (70b -> 8b)
  
  let activeChain: any[] = [];

  if (planId === 'tier_3' || planId === 'tier_4' || planId?.startsWith('recruiter_')) {
    activeChain = [
      { provider: 'claude', model: 'claude-sonnet-4-20250514', key: claudeKey, timeout: 30000 },
      { provider: 'gemini', model: 'gemini-3.1-pro-preview', keys: geminiKeys, timeout: 20000 },
      { provider: 'gemini', model: 'gemini-3.1-flash-lite-preview', keys: geminiKeys, timeout: 10000 },
      { provider: 'cerebras', model: 'llama-3.3-70b', keys: cerebrasKeys, timeout: 30000 }
    ];
  } else if (planId === 'tier_2') {
    activeChain = [
      { provider: 'gemini', model: 'gemini-3.1-flash-lite-preview', keys: geminiKeys, timeout: 10000 },
      { provider: 'cerebras', model: 'llama-3.3-70b', keys: cerebrasKeys, timeout: 30000 },
      { provider: 'cerebras', model: 'llama3.1-8b', keys: cerebrasKeys, timeout: 20000 }
    ];
  } else {
    // Free or Starter
    activeChain = [
      { provider: 'cerebras', model: 'llama-3.3-70b', keys: cerebrasKeys, timeout: 30000 },
      { provider: 'cerebras', model: 'llama3.1-8b', keys: cerebrasKeys, timeout: 20000 }
    ];
  }

  for (const step of activeChain) {
    try {
      if (step.provider === 'claude' && step.key) {
        // Wrap Claude in timeout too
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Claude Timeout")), step.timeout || 30000);
        });
        const apiCall = callClaude(systemPrompt, userPrompt, temperature, step.key);
        const text: any = await Promise.race([apiCall, timeoutPromise]);
        return res.status(200).json({ text, provider: 'claude' });
      }
      if (step.provider === 'gemini' && step.keys.length > 0) {
        for (const key of step.keys) {
          try {
            const text = await callGemini(step.model, systemPrompt, userPrompt, temperature, key, jsonMode, step.timeout);
            return res.status(200).json({ text, provider: `gemini:${step.model}` });
          } catch (e) { 
            console.warn(`Gemini key failed or timed out, trying next...`);
            continue; 
          }
        }
      }
      if (step.provider === 'cerebras' && step.keys.length > 0) {
        for (const key of step.keys) {
          try {
            const text = await callCerebras(step.model, systemPrompt, userPrompt, temperature, key, jsonMode, step.timeout);
            return res.status(200).json({ text, provider: `cerebras:${step.model}` });
          } catch (e) { 
            console.warn(`Cerebras key failed or timed out, trying next...`);
            continue; 
          }
        }
      }
    } catch (e: any) {
      console.warn(`Step ${step.provider} failed:`, e.message);
    }
  }

  return res.status(503).json({ error: 'High traffic, try again in 1 minute' });
}
