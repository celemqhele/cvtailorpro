
import { GoogleGenAI } from "@google/genai";

async function callCerebras(modelName, systemPrompt, userPrompt, temperature, apiKey, jsonMode = false) {
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

async function callGemini(modelName, systemPrompt, userPrompt, temperature, apiKey, jsonMode = false) {
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { systemPrompt, userPrompt, temperature, jsonMode } = req.body;

  if (!userPrompt) {
    return res.status(400).json({ error: 'Missing userPrompt' });
  }

  // 1. Gemini Fallback Chain
  const geminiKeys = [process.env.GEMINI_KEY_1, process.env.GEMINI_KEY_2].filter(Boolean);
  const geminiModels = ["gemini-3.1-pro-preview", "gemini-3-flash-preview"];

  for (const gKey of geminiKeys) {
    for (const gModel of geminiModels) {
      try {
        const text = await callGemini(gModel, systemPrompt, userPrompt, temperature || 0.5, gKey, jsonMode);
        return res.status(200).json({ text });
      } catch (e) {
        console.warn(`Gemini ${gModel} failed in backend proxy:`, e.message);
      }
    }
  }

  // 2. Cerebras Fallback Chain
  const cerebrasKeys = [process.env.CEREBRAS_KEY, process.env.CEREBRAS_KEY_2].filter(Boolean);
  const cerebrasModels = ["llama-3.3-70b", "llama-3.1-70b", "llama-3.1-8b"];

  for (const cKey of cerebrasKeys) {
    for (const cModel of cerebrasModels) {
      try {
        const text = await callCerebras(cModel, systemPrompt, userPrompt, temperature || 0.5, cKey, jsonMode);
        return res.status(200).json({ text });
      } catch (e) {
        console.warn(`Cerebras ${cModel} failed in backend proxy:`, e.message);
      }
    }
  }

  return res.status(503).json({ error: 'All AI models failed to respond' });
}
