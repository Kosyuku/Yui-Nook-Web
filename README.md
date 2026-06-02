# YUI Nook Web

Standalone React/Vite frontend for YUI Nook.

The backend, MCP bridge, database code, and server routes stay in
`Yui-Nook-FastApi`. This repository only contains the web frontend from
`frontend-react`.

## Setup

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

## Environment

```env
VITE_API_BASE_URL=https://api.somni-ref.top
VITE_MEDIA_UPLOAD_PROVIDER=r2
VITE_MEDIA_OWNER_TYPE=user
VITE_MEDIA_AGENT_ID=azheng
VITE_GATEWAY_SECRET=
```

Do not commit real gateway secrets. Keep them in `.env.local` or the deploy
platform's environment variables.

## Build

```powershell
npm run build
```

## Notes

- This split intentionally does not include `frontend -latest`.
- Local development still proxies `/api` to `http://localhost:8000` through
  `vite.config.js`.
- Production defaults to `https://api.somni-ref.top` unless
  `VITE_API_BASE_URL` is set.
