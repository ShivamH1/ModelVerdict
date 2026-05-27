import { buildClient } from '@veritas/llm-client';
import * as dotenv from 'dotenv';
dotenv.config();

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function testGeminiModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log("Using Gemini API Key:", apiKey ? apiKey.substring(0, 10) + "..." : "undefined");
  
  const client = buildClient('gemini', apiKey || '');

  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

  for (const model of models) {
    try {
      console.log(`Sending chat completion request for ${model}...`);
      const response = await client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: 'Hello, this is a test.' }],
      });
      console.log(`Success for ${model}! Response:`, response.choices[0]?.message?.content);
    } catch (err: any) {
      console.error(`Failed for ${model}:`);
      console.error("Status:", err.status);
      console.error("Message:", err.message);
    }
    // sleep to prevent rapid hits
    await sleep(2000);
  }
}

testGeminiModels();
