
import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";

async function callClaude(systemPrompt: any, userPrompt: any, temperature: any, apiKey: any) {
  const anthropic = new Anthropic({ apiKey });
  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-latest",
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

  // Define Fallback Chains
  const chains: Record<string, any[]> = {
    cv_generation: [
      { provider: 'claude', key: claudeKey },
      { provider: 'gemini', model: 'gemini-3.1-pro-preview', keys: geminiKeys },
      { provider: 'gemini', model: 'gemini-3-flash-preview', keys: geminiKeys },
      { provider: 'cerebras', model: 'llama-3.3-70b', keys: cerebrasKeys }
    ],
    analyse_match: [
      { provider: 'gemini', model: 'gemini-3-flash-preview', keys: geminiKeys },
      { provider: 'cerebras', model: 'llama-3.3-70b', keys: cerebrasKeys }
    ],
    admin_job_creation: [
      { provider: 'claude', key: claudeKey },
      { provider: 'gemini', model: 'gemini-3.1-pro-preview', keys: geminiKeys },
      { provider: 'gemini', model: 'gemini-3-flash-preview', keys: geminiKeys },
      { provider: 'cerebras', model: 'llama-3.3-70b', keys: cerebrasKeys }
    ],
    recruiter_candidate_finder: [
      { provider: 'claude', key: claudeKey },
      { provider: 'gemini', model: 'gemini-3.1-pro-preview', keys: geminiKeys },
      { provider: 'gemini', model: 'gemini-3-flash-preview', keys: geminiKeys },
      { provider: 'cerebras', model: 'llama-3.3-70b', keys: cerebrasKeys }
    ]
  };

  const activeChain = chains[task] || chains.cv_generation;

  for (const step of activeChain) {
    try {
      if (step.provider === 'claude' && step.key) {
        const text = await callClaude(systemPrompt, userPrompt, temperature, step.key);
        return res.status(200).json({ text, provider: 'claude' });
      }
      if (step.provider === 'gemini' && step.keys.length > 0) {
        for (const key of step.keys) {
          try {
            const text = await callGemini(step.model, systemPrompt, userPrompt, temperature, key, jsonMode);
            return res.status(200).json({ text, provider: `gemini:${step.model}` });
          } catch (e) { continue; }
        }
      }
      if (step.provider === 'cerebras' && step.keys.length > 0) {
        for (const key of step.keys) {
          try {
            const text = await callCerebras(step.model, systemPrompt, userPrompt, temperature, key, jsonMode);
            return res.status(200).json({ text, provider: `cerebras:${step.model}` });
          } catch (e) { continue; }
        }
      }
    } catch (e: any) {
      console.warn(`Step ${step.provider} failed:`, e.message);
    }
  }

  return res.status(503).json({ error: 'All AI models failed to respond' });
}
