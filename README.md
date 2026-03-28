# Finxan AI

An interactive AI learning assistant with real-time voice, animated character, and teacher-style explanations.

![Status](https://img.shields.io/badge/status-active-success)
![Built with](https://img.shields.io/badge/built%20with-TypeScript-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [How It Works](#how-it-works)
- [Project Architecture](#project-architecture)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Usage](#usage)
- [Folder Structure](#folder-structure)
- [Challenges We Ran Into](#challenges-we-ran-into)
- [What We Learned](#what-we-learned)
- [Future Improvements](#future-improvements)
- [Contributors](#contributors)
- [License](#license)

---

## Overview

Finxan AI is designed to provide an immersive, teacher-like learning experience using real-time voice interaction, visual explanations, and AI-generated content. It aims to reduce cognitive overload while making learning intuitive and engaging through an animated character that responds naturally to your questions.

---

## Features

- 🎙️ **Real-time voice interaction** - Continuous listening with 1-second pause detection
- 🗣️ **Multilingual High-Fidelity Audio** - Powered natively by Sarvam AI TTS for pristine audio across English and regional Indian languages
- 🎭 **Teacher-Grade Synced Animations** - Intelligent Live2D coordination pipeline dynamically maps hand gestures, lip-sync, and eye-tracking perfectly timed to individual spoken sentences
- 🧠 **Multi-provider AI support** - OpenAI, Google Gemini, Anthropic Claude, or custom APIs
- 🖼️ **Visual learning** - Automatic image search and contextual explanations
- 🔐 **Secure authentication** - Google OAuth 2.0 with session management
- ⚡ **Optimized for low latency** - Synchronized text, speech, gestures, and images within 100ms
- 🎨 **Modern UI** - Glass morphism design with responsive layout
- 📚 **Context-aware teaching** - Remembers conversation history for natural follow-ups

---

## How It Works

1. User sends a message via text or voice
2. Voice input is converted to text in real-time using Web Speech API
3. The request is processed by the AI reasoning layer (OpenAI/Gemini/Claude)
4. Content is parsed into teaching segments with appropriate gestures
5. Response is rendered with synchronized text, speech, character animation, and images
6. Voice feedback is streamed back with lip-sync animation
7. System automatically returns to listening mode for continuous conversation

---

## Project Architecture

```
┌─────────────────────────────────────────┐
│           Frontend Layer                │
│   React + TypeScript + Live2D          │
├─────────────────────────────────────────┤
│  • UI Components (Navbar, Panels)      │
│  • Real-time Speech Service            │
│  • Motion Manager (Gesture FSM)        │
│  • Synchronization Coordinator         │
│  • Authentication Context              │
└─────────────────────────────────────────┘
                  ↕ REST API
┌─────────────────────────────────────────┐
│           Backend Layer                 │
│      Express.js + Node.js              │
├─────────────────────────────────────────┤
│  • Provider Registry                    │
│  • API Routes (/chat, /synthesize)     │
│  • Provider Adapters                    │
│  • Authentication Middleware           │
└─────────────────────────────────────────┘
                  ↕ Adapters
┌─────────────────────────────────────────┐
│         AI Provider Layer               │
│    OpenAI | Gemini | Claude | AWS      │
└─────────────────────────────────────────┘
```

**Key Components:**

**Frontend**
- Handles UI, user interaction, and character rendering
- Manages real-time voice transcription and playback
- Coordinates gestures, speech, and visual content

**Backend**
- Processes AI requests through provider abstraction layer
- Handles authentication and API key management
- Routes requests to appropriate AI providers

**AI Layer**
- Natural language understanding and response generation
- Context management across conversation
- Multi-provider support with zero code changes

---

## Tech Stack

**Frontend**
- React 18
- TypeScript
- Vite
- Zustand (State Management)
- PixiJS + Live2D
- Web Speech API

**Backend**
- Node.js
- Express.js
- TypeScript
- Multer (File Upload)

**AI & ML**
- OpenAI GPT-4o
- Google Gemini 2.0 Flash
- Anthropic Claude 3
- Sarvam AI (High-Quality Multilingual Indian TTS)
- AWS Bedrock
- AWS Polly (TTS Fallback)
- AWS Transcribe (STT)

**Tools & Platforms**
- Git & GitHub
- npm
- ESLint & Prettier
- VS Code

---

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/finxan-ai.git
   cd finxan-ai
   ```

2. **Install dependencies**
   ```bash
   # Frontend
   cd frontend
   npm install

   # Backend
   cd ../backend
   npm install
   ```

3. **Configure environment variables**
   
   Create `backend/.env`:
   ```bash
   AI_PROVIDER=openai
   OPENAI_API_KEY=your_openai_key_here
   PORT=3001
   ```

   Create `frontend/.env`:
   ```bash
   VITE_API_URL=http://localhost:3001/api
   VITE_GOOGLE_CLIENT_ID=your_google_client_id
   ```

4. **Run the development servers**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev

   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

5. **Open your browser**
   ```
   http://localhost:3001
   ```

---

## Usage

- Open the application in your browser
- Log in using Google OAuth
- Click the microphone button to start voice interaction
- Ask questions naturally - the AI listens continuously
- Receive explanations with text, images, and voice responses
- Watch the animated character gesture and speak naturally
- Continue the conversation without clicking buttons

**Example Questions:**
- "Explain quantum physics in simple terms"
- "How does photosynthesis work?"
- "What is machine learning?"

---

## Folder Structure

```
finxan-ai/
├── frontend/
│   ├── src/
│   │   ├── components/          # React UI components
│   │   ├── services/            # Business logic services
│   │   ├── contexts/            # React contexts (Auth)
│   │   ├── store/               # Zustand state management
│   │   ├── config/              # Configuration files
│   │   ├── types/               # TypeScript definitions
│   │   └── utils/               # Utility functions
│   ├── public/
│   │   └── haru_greeter_pro_jp/ # Live2D character assets
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── contracts/           # Provider interfaces
│   │   ├── providers/           # AI provider adapters
│   │   ├── routes/              # API endpoints
│   │   └── services/            # AWS integrations
│   └── package.json
│
├── .webdpro
```

---

## Challenges We Ran Into

- **Managing real-time voice latency** - Achieved <500ms total round-trip time through optimized audio chunking and parallel processing
- **Synchronizing multiple modalities** - Built a coordination system to sync text, speech, gestures, and images within 100ms
- **Preventing UI clutter** - Designed a clean three-panel layout with glass morphism for visual hierarchy
- **Handling secure API access** - Implemented provider abstraction layer with secure key management
- **Character animation timing** - Created deterministic FSM to ensure smooth, predictable gesture sequences
- **Continuous listening mode** - Developed smart pause detection to distinguish between thinking pauses and speech completion

---

## What We Learned

- **Designing low-latency AI systems** - Optimizing for real-time interaction requires careful attention to async operations and parallel processing
- **Building accessible voice-first interfaces** - Voice interaction needs clear visual feedback and graceful error handling
- **Structuring scalable frontend architecture** - Separation of concerns and modular services enable easy maintenance and testing
- **Improving UX for AI-driven applications** - Natural conversation flow requires thoughtful state management and user feedback
- **Provider abstraction patterns** - Vendor-agnostic design future-proofs the application against API changes
- **Character animation coordination** - Synchronizing multiple animation systems requires deterministic state machines

---

## Future Improvements

- Expanded Global multi-language voice support (currently supports Indian dialects seamlessly via Sarvam)
- Adaptive learning and interactive quizzes
- Mobile applications (iOS & Android)
- Custom character support and personality customization
- Offline learning mode with local AI models

[View Full Roadmap →](./docs/ROADMAP.md)

---

## Contributors

- **durga prashad** - Project Lead & Full-Stack Developer

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ for learners everywhere**

[Documentation](./docs) • [Architecture](./ARCHITECTURE.md) • [Quick Start](./QUICK-START.md)

</div>
