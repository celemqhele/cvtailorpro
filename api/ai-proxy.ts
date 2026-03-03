import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";

const TIMEOUT_MS = 30000; // 30 second timeout per provider

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    )
  ]);
}

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

async function callCerebras(modelName: any, systemPrompt: any, userPrompt: any, temperature: any, apiKey: any, jsonMode = false) {
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
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Cerebras API Error (${modelName}): ${response.status} ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callGemini(modelName: any, systemPrompt: any, userPrompt: any, temperature: any, apiKey: any, jsonMode = false) {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: modelName,
    contents: userPrompt,
    config: {
      systemInstruction: systemPrompt,
      temperature: temperature,
      responseMimeType: jsonMode ? "application/json" : "text/plain"
    }
  });
  return response.text || "";
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { systemPrompt, userPrompt, temperature, jsonMode, task } = req.body;

  if (!userPrompt) {
    return res.status(400).json({ error: 'Missing userPrompt' });
  }

  const geminiKeys = [process.env.GEMINI_KEY_1, process.env.GEMINI_KEY_2].filter(Boolean);
  const cerebrasKeys = [process.env.CEREBRAS_KEY, process.env.CEREBRAS_KEY_2].filter(Boolean);
  const claudeKey = process.env.CLAUDE_API_KEY;

  // Define Fallback Chains - STRICT ORDER: Claude -> Gemini -> Cerebras
  const chains: Record<string, any[]> = {
    cv_generation: [
      { provider: 'claude', key: claudeKey },
      { provider: 'gemini', model: 'gemini-2.5-pro-preview-05-06', keys: geminiKeys },
      { provider: 'gemini', model: 'gemini-2.5-flash-preview-05-20', keys: geminiKeys },
      { provider: 'cerebras', model: 'llama-3.3-70b', keys: cerebrasKeys }
    ],
    analyse_match: [
      { provider: 'gemini', model: 'gemini-2.5-flash-preview-05-20', keys: geminiKeys },
      { provider: 'cerebras', model: 'llama-3.3-70b', keys: cerebrasKeys }
    ],
    admin_job_creation: [
      { provider: 'claude', key: claudeKey },
      { provider: 'gemini', model: 'gemini-2.5-pro-preview-05-06', keys: geminiKeys },
      { provider: 'gemini', model: 'gemini-2.5-flash-preview-05-20', keys: geminiKeys },
      { provider: 'cerebras', model: 'llama-3.3-70b', keys: cerebrasKeys }
    ],
    recruiter_candidate_finder: [
      { provider: 'claude', key: claudeKey },
      { provider: 'gemini', model: 'gemini-2.5-pro-preview-05-06', keys: geminiKeys },
      { provider: 'gemini', model: 'gemini-2.5-flash-preview-05-20', keys: geminiKeys },
      { provider: 'cerebras', model: 'llama-3.3-70b', keys: cerebrasKeys }
    ]
  };

  const activeChain = chains[task] || chains.cv_generation;
  const errors: string[] = [];

  for (const step of activeChain) {
    try {
      if (step.provider === 'claude' && step.key) {
        const text = await withTimeout(
          callClaude(systemPrompt, userPrompt, temperature, step.key),
          TIMEOUT_MS,
          'Claude'
        );
        return res.status(200).json({ text, provider: 'claude' });
      }
      if (step.provider === 'gemini' && step.keys && step.keys.length > 0) {
        for (const key of step.keys) {
          try {
            const text = await withTimeout(
              callGemini(step.model, systemPrompt, userPrompt, temperature, key, jsonMode),
              TIMEOUT_MS,
              `Gemini:${step.model}`
            );
            return res.status(200).json({ text, provider: `gemini:${step.model}` });
          } catch (e: any) {
            errors.push(`Gemini(${step.model}): ${e.message}`);
            continue;
          }
        }
      }
      if (step.provider === 'cerebras' && step.keys && step.keys.length > 0) {
        for (const key of step.keys) {
          try {
            const text = await withTimeout(
              callCerebras(step.model, systemPrompt, userPrompt, temperature, key, jsonMode),
              TIMEOUT_MS,
              `Cerebras:${step.model}`
            );
            return res.status(200).json({ text, provider: `cerebras:${step.model}` });
          } catch (e: any) {
            errors.push(`Cerebras(${step.model}): ${e.message}`);
            continue;
          }
        }
      }
    } catch (e: any) {
      errors.push(`${step.provider}: ${e.message}`);
      console.warn(`Step ${step.provider} failed:`, e.message);
    }
  }

  return res.status(503).json({ 
    error: 'High traffic detected. Please try again in 1 minute.',
    details: errors
  });
}
