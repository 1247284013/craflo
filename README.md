# Craflo

> AI-assisted design engineering portfolio & learning platform

## Tech Stack

- **Frontend**: React + Vite + TypeScript + ReactFlow
- **Backend**: Node.js + Express + LangChain.js + LangGraph
- **Database**: Supabase (PostgreSQL + pgvector)
- **AI**: Google Gemini 2.5 Flash + LangSmith tracing

## Local Development

### 1. Frontend

```bash
npm install
npm run dev
# → http://localhost:5174
```

### 2. Backend (Agent API)

```bash
cd backend
cp .env.example .env   # fill in your API keys
npm install --legacy-peer-deps
npm run dev
# → http://localhost:3001
```

### Environment Variables

**Frontend** (`.env`):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GOOGLE_API_KEY=
SUPABASE_SERVICE_KEY=
```

**Backend** (`backend/.env`):
```
GOOGLE_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=           # from smith.langchain.com
LANGCHAIN_PROJECT=craflo-dev
```

## Deployment

### Frontend → Vercel

1. Import this repo on [vercel.com](https://vercel.com)
2. Set environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GOOGLE_API_KEY`
   - `VITE_API_BASE_URL` → your Render backend URL (e.g. `https://craflo-backend.onrender.com`)

### Backend → Render

1. Create a new **Web Service** on [render.com](https://render.com)
2. Root directory: `backend`
3. Build command: `npm install --legacy-peer-deps`
4. Start command: `node src/index.mjs`
5. Set environment variables (same as `backend/.env`)
6. Copy the service URL → paste as `VITE_API_BASE_URL` in Vercel

## RAG Pipeline (LangGraph)

```
analyze_query → rewrite_query → hybrid_retrieve → rerank_results → grade_docs
                                                                        ↓
                                                          generate / generate_fallback
```

All steps traced in [LangSmith](https://smith.langchain.com) → project `craflo-dev`.
