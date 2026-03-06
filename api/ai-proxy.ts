/** Updated: 2026-03-06 */
/* global AbortController */
import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";

// ============================================================
// TODO FOR AI STUDIO (restore tier routing when ready):
// - Free/Starter: Cerebras llama-3.3-70b -> llama-3.1-8b
// - Growth: gemini-2.0-flash -> Cerebras fallback
// - Pro: Claude -> gemini-2.0-flash -> Cerebras fallback
// Currently all tiers share the same chain (plan limits enforced on frontend).
// ============================================================

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
  if (content.type === 'text') return content.text;
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

  const { systemPrompt, userPrompt, temperature, jsonMode, task, planId } = req.body;

  if (!userPrompt) {
    return res.status(400).json({ error: 'Missing userPrompt' });
  }

  // Only using GEMINI_KEY_2 — GEMINI_API_KEY is project-scoped and runs out
  const geminiKeys = [process.env.GEMINI_KEY_2].filter(Boolean);
  const cerebrasKeys = [process.env.CEREBRAS_KEY_2].filter(Boolean);
  const claudeKey = process.env.CLAUDE_API_KEY;

  // Same chain for all tiers
  const activeChain: any[] = [
    { provider: 'claude',   model: 'claude-sonnet-4-20250514', key: claudeKey,     timeout: 30000 },
    { provider: 'gemini',   model: 'gemini-2.0-flash',         keys: geminiKeys,   timeout: 20000 },
    { provider: 'gemini',   model: 'gemini-2.0-flash-lite',    keys: geminiKeys,   timeout: 20000 },
    { provider: 'cerebras', model: 'llama-3.3-70b',            keys: cerebrasKeys, timeout: 30000 },
    { provider: 'cerebras', model: 'llama-3.1-8b',             keys: cerebrasKeys, timeout: 20000 },
  ];

  for (const step of activeChain) {
    try {
      if (step.provider === 'claude' && step.key) {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Claude Timeout")), step.timeout || 30000)
        );
        const text: any = await Promise.race([
          callClaude(systemPrompt, userPrompt, temperature, step.key),
          timeoutPromise
        ]);
        return res.status(200).json({ text, provider: 'claude' });
      }

      if (step.provider === 'gemini' && step.keys.length > 0) {
        for (const key of step.keys) {
          try {
            const text = await callGemini(step.model, systemPrompt, userPrompt, temperature, key, jsonMode, step.timeout);
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
            const text = await callCerebras(step.model, systemPrompt, userPrompt, temperature, key, jsonMode, step.timeout);
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

  return res.status(503).json({ error: 'High traffic, try again in 1 minute' });
}