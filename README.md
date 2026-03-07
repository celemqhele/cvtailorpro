# CV Tailor Pro

ATS-optimized CV tailoring application.

## Fallback Providers

If the primary AI providers are unavailable or over quota, the system uses a round-robin fallback chain. Below is a list of free LLM providers that are compatible with our `ai-proxy` interface.

| Provider | Model (Free Tier) | Endpoint (example) | Free-quota / notes | Quick-setup |
|----------|-------------------|--------------------|--------------------|-------------|
| **Cerebras** | `llama-3.3-70b` | `https://api.cerebras.ai/v1/chat/completions` | High-speed Llama 3.3 | Set `CEREBRAS_KEY_2` |
| **Cerebras** | `GLM-4.7` | `https://api.cerebras.ai/v1/chat/completions` | Fallback model | Set `CEREBRAS_KEY_2` |
| **OpenAI** | `gpt-3.5-turbo` | `https://api.openai.com/v1/chat/completions` | $5-$18 credit for new accounts | Set `OPENAI_API_KEY` |
| **Anthropic** | `claude-3-haiku-20240307` | `https://api.anthropic.com/v1/messages` | 5M input tokens/month free | Set `ANTHROPIC_API_KEY` |
| **Mistral AI** | `mistral-small-latest` | `https://api.mistral.ai/v1/chat/completions` | 10M tokens/month free | Set `MISTRAL_API_KEY` |
| **Groq** | `llama3-8b-8192` | `https://api.groq.com/openai/v1/chat/completions` | Unlimited free tier (rate-limited) | Set `GROQ_API_KEY` |
| **Google Gemini** | `gemini-1.5-flash` | `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent` | Free tier available | Set `GOOGLE_API_KEY` |
| **Cerebras** | `Cerebras-GPT-13B-Instruct` | `https://api.cerebras.ai/v1/chat/completions` | Free tier available | Set `CEREBRAS_API_KEY` |

## Testing Connectivity

You can test the connectivity of the configured models using the following command:

```bash
npm run test-proxy
```

This will iterate through the configured models and report their status.
