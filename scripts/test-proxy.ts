import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

async function testModel(modelName: string, planId: string = 'free') {
  console.log(`Testing model: ${modelName} (Plan: ${planId})...`);
  try {
    const response = await fetch(`${APP_URL}/api/ai-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemPrompt: 'You are a helpful assistant.',
        userPrompt: 'Hello, are you working?',
        temperature: 0.7,
        task: 'test_connection',
        planId: planId,
        adminOverrideModel: modelName
      }),
    });

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      if (response.ok) {
        console.log(`✅ SUCCESS: ${modelName} responded via ${data.provider}`);
        return true;
      } else {
        console.error(`❌ FAILED: ${modelName} returned error: ${data.error}`);
        if (data.details) console.error(`   Details: ${data.details}`);
        return false;
      }
    } else {
      const text = await response.text();
      console.error(`❌ FAILED: ${modelName} returned non-JSON response (Status ${response.status})`);
      console.error(`   Body snippet: ${text.slice(0, 200)}`);
      return false;
    }
  } catch (err: any) {
    console.error(`❌ FAILED: ${modelName} request failed: ${err.message}`);
    return false;
  }
}

async function runTests() {
  console.log('Starting AI Proxy Connectivity Tests...\n');
  
  const modelsToTest = [
    { name: 'claude-sonnet-4-20250514', plan: 'tier_3' },
    { name: 'gemini-3.1-pro-preview', plan: 'tier_3' },
    { name: 'gemini-3-flash-preview', plan: 'tier_1' },
    { name: 'llama-3.3-70b', plan: 'free' },
    { name: 'llama3.3-70b', plan: 'free' },
    { name: 'GLM-4.7', plan: 'free' },
    { name: 'Cerebras-GPT-13B-Instruct', plan: 'free' },
    { name: 'Mistral-7B-Instruct-v0.2', plan: 'free' }
  ];

  let successCount = 0;
  for (const model of modelsToTest) {
    const success = await testModel(model.name, model.plan);
    if (success) successCount++;
    console.log('-----------------------------------');
  }

  console.log(`\nTests Completed: ${successCount}/${modelsToTest.length} passed.`);
  process.exit(successCount === modelsToTest.length ? 0 : 1);
}

runTests();
