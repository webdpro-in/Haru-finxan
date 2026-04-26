# 🌸 Haru AI Teacher

An anime-style 3D AI tutor for the **AMD Slingshot — AI in Education & Skilling** track.
Talk to Haru with voice, watch her gesture, get visuals on demand, and learn any subject.

![Status](https://img.shields.io/badge/status-demo--ready-success)
![Stack](https://img.shields.io/badge/stack-React%20%2B%20Express%20%2B%20Live2D-blue)

---

## What it does

- **3D animated teacher** — Live2D Cubism 4 character with gestures, blinks, and lip sync.
- **Voice in & out** — speak naturally; Haru replies aloud (Web Speech API, no extra setup).
- **Multi-subject** — Math, Science, English, Coding, History, or General.
- **Tutor / Rubric modes** — Socratic tutoring or score-and-feedback grading.
- **English / Hindi** — toggle live; recognition + voice + LLM all switch language.
- **Credits + bring-your-own-key** — 20 free credits per signup; users can paste their own Groq / OpenAI / Gemini key for unlimited use.
- **Auto-generated visuals** — when Haru says "see the diagram", Pollinations generates an image inline.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, Vite, Zustand, PixiJS, pixi-live2d-display |
| Backend | Node 20, Express, TypeScript |
| AI | Groq (Llama 3.3 70B) — primary; OpenAI / Gemini supported as alternates |
| Image | Pollinations (free, keyless) — Freepik / OpenRouter as alternates |
| Speech | Web Speech API (browser-native) — AWS Polly available as backend fallback |
| Auth + DB | JWT + argon2; Supabase Postgres (with in-memory fallback for demo) |

## Quick start

```bash
# 1. Install everything
npm install

# 2. Configure backend
cd backend
cp .env.example .env
# Edit .env — only GROQ_API_KEY is required for a working demo
npm run dev          # starts on http://localhost:3001

# 3. Configure + run frontend (in another terminal)
cd frontend
cp .env.example .env # only VITE_API_URL needed
npm run dev          # opens http://localhost:3000
```

That's it. Sign up in the onboarding modal — you get 20 credits and Haru greets you.

## Required environment

**Backend `.env`** (the only mandatory variable is `GROQ_API_KEY`):

```ini
GROQ_API_KEY=gsk_...
JWT_SECRET=change-me-to-a-32-char-random-string
# Optional — falls back gracefully if blank
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
REDIS_URL=
```

**Frontend `.env`**:
```ini
VITE_API_URL=http://localhost:3001/api
```

Get a Groq key (free) at https://console.groq.com/keys.

## Architecture

```
frontend/src/
├── components/         # Navbar, Sidebar, TeachingPanel, VisualPanel, AuthModal,
│                       # UpgradeModal, APIConfigModal, Onboarding, Live2DCanvas, …
├── services/           # AIService, AuthService, SpeechController, MotionManager,
│                       # LipSyncService, EyeController, RealtimeSpeechService, …
├── store/useAppStore.ts# Zustand — credits, user, subject, language, mode
└── App.tsx

backend/src/
├── routes/             # auth, credits, chat, transcribe, synthesize, images
├── providers/          # groq, openai, gemini, pollinations, freepik, openrouter, aws
├── services/           # CreditsService (Supabase + in-memory fallback)
├── middleware/         # auth (JWT), inputValidation, rateLimiter (optional)
├── config/             # supabase
├── scripts/            # migrate-supabase.sql
└── index.ts
```

## Credit flow

1. New user → **20 free credits** (signup grant).
2. Each chat that uses the platform Groq key consumes **1 credit**.
3. At 0 credits → `UpgradeModal` opens with two paths:
   - **Upgrade** (stub) → grants `+200` credits.
   - **Use my own API key** → opens `APIConfigModal`. Once a user key is set, requests bypass metering entirely.

## Production deploy

`render.yaml` deploys the backend; Vercel / Netlify / Amplify deploys the frontend (build = `npm run build` in `frontend/`).

In production, set `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` and run `backend/src/scripts/migrate-supabase.sql` to enable persistent users + ledger.

## License

MIT. Live2D model © Live2D Inc. — used under the free sample license for hackathon demo.
