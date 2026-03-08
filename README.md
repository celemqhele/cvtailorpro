# CV Tailor Pro

ATS-optimized CV tailoring application.

## AI Providers

This application uses Google Gemini models for all AI processing.

| Provider | Model | Notes |
|----------|-------|-------|
| **Google Gemini** | `gemini-3.1-pro-preview` | Used for Pro/Unlimited plans |
| **Google Gemini** | `gemini-3-flash-preview` | Used for Free/Starter/Growth plans |
| **Google Gemini** | `gemini-3.1-flash-lite-preview` | Fallback model |

## Testing Connectivity

You can test the connectivity of the configured models using the following command:

```bash
npm run test-proxy
```

This will iterate through the configured models and report their status.
