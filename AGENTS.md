# Project Instructions

This is the standalone YUI Nook frontend repository.

## Repository Boundary

- Make frontend changes in this repository.
- Do not edit `D:\YUI Nook\frontend-react` from this repository's tasks.
- Do not edit `D:\YUI Nook\frontend -latest`; it is not part of this split.
- Backend, FastAPI routes, database code, MCP tools, and deployment server code live in `D:\YUI Nook`.

## Frontend Source Of Truth

- The active frontend source is this repository's `src/` directory.
- This repository was split from `D:\YUI Nook\frontend-react`.
- `frontend -latest` is not included here.

## Environment

- API base URL is controlled by `VITE_API_BASE_URL`.
- Production default should target `https://api.somni-ref.top`.
- Local development may use the Vite `/api` proxy to `http://localhost:8000`.
- Do not commit real secrets. Keep `VITE_GATEWAY_SECRET` in `.env.local` or deploy environment variables only.

## Commands

```powershell
npm ci
npm run dev
npm run build
```

## Deployment

- This repository builds a static frontend with Vite.
- The backend remains separately deployed from `D:\YUI Nook`.
- If deploying to Netlify, set environment variables in Netlify instead of committing local env files.
