# Finxan AI - Backend

Backend server for Finxan AI Teacher application.

## 🚀 Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Create .env file (copy from .env.example)
cp .env.example .env

# Add your API keys to .env
# AI_PROVIDER=openai
# OPENAI_API_KEY=your_key_here

# Run development server
npm run dev
```

Server runs on: http://localhost:3001

### Build for Production

```bash
npm run build
npm start
```

## 📋 Environment Variables

Required:
- `AI_PROVIDER` - AI provider to use (openai, gemini, groq, aws-bedrock)
- `OPENAI_API_KEY` - OpenAI API key (if using OpenAI)
- `OPENAI_MODEL` - OpenAI model (e.g., gpt-4o-mini)
- `GEMINI_API_KEY` - Google Gemini API key (if using Gemini)
- `GROQ_API_KEY` - Groq API key (if using Groq)
- `IMAGE_PROVIDER` - Image provider (puter, aws-bedrock, placeholder)
- `NODE_ENV` - Environment (development, production)

Optional:
- `TTS_PROVIDER` - Text-to-speech provider (sarvam, aws-polly, browser)
- `STT_PROVIDER` - Speech-to-text provider (browser, aws-transcribe)
- `SARVAM_API_KEY` - Sarvam API key (if using Sarvam TTS)
- `AWS_REGION` - AWS region (if using AWS services)
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `UNSPLASH_ACCESS_KEY` - Unsplash API key (for image search)

## 🎨 Image Generation with Puter.js

The backend now supports **free, fast image generation** using Puter.js - no API keys required!

### Quick Setup

```env
IMAGE_PROVIDER=puter
```

That's it! Puter.js provides:
- ✅ Free image generation (no API keys)
- ✅ Fast generation (2-5 seconds)
- ✅ Multiple AI models (GPT Image, DALL-E, Gemini, Stable Diffusion, Flux)
- ✅ Automatic fallback to placeholders on errors

### How It Works

When a user asks for visual content, the AI automatically triggers image generation through the `/api/images/generate` endpoint, which uses the Puter adapter to create images in real-time.

See `src/providers/puter/README.md` for more details.

## 🌐 API Endpoints

- `GET /health` - Health check
- `POST /api/chat` - Chat with AI
- `POST /api/transcribe` - Transcribe audio
- `POST /api/synthesize` - Text-to-speech
- `POST /api/images` - Generate images

## 🏗️ Project Structure

```
backend/
├── src/
│   ├── contracts/       # Provider interfaces
│   ├── providers/       # AI provider implementations
│   │   ├── openai/     # OpenAI adapter
│   │   ├── gemini/     # Gemini adapter
│   │   └── aws/        # AWS adapters
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   └── index.ts        # Server entry point
├── dist/               # Compiled JavaScript
├── package.json
└── tsconfig.json
```

## 🔧 Tech Stack

- **Runtime:** Node.js
- **Framework:** Express
- **Language:** TypeScript
- **AI Providers:** OpenAI, Google Gemini, AWS Bedrock
- **Speech:** AWS Polly, AWS Transcribe

## 📦 Deployment

### Render

1. Connect GitHub repository
2. Set root directory to `backend`
3. Build command: `npm install --include=dev && npm run build`
4. Start command: `npm start`
5. Add environment variables
6. Deploy!

### Railway

1. Connect GitHub repository
2. Set root directory to `backend`
3. Add environment variables
4. Railway auto-detects and deploys

### Vercel

1. Connect GitHub repository
2. Set root directory to `backend`
3. Framework: Other
4. Build command: `npm run build`
5. Output directory: `dist`
6. Add environment variables

## 🧪 Testing

```bash
# Test health endpoint
curl http://localhost:3001/health

# Test chat endpoint
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello"}'
```

## 📝 License

MIT
