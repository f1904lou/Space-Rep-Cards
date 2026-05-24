# Vercel Deployment

This app is designed as a personal hosted workspace. Provider API keys must be
configured on the server, not entered into the browser.

## Required environment variables

Set these in the Vercel project settings:

- `OPENAI_API_KEY`
- `MOCHI_API_KEY`
- `APP_PASSCODE`
- `APP_SESSION_SECRET`

Optional:

- `OPENAI_MODEL` defaults to `gpt-4o`

## How auth works

The app asks for `APP_PASSCODE` on first visit. A successful login sets a signed
HTTP-only session cookie that lasts 30 days. OpenAI and Mochi keys never leave
the Vercel serverless functions.

## Local development

Use `vercel dev` when testing authenticated API routes locally. Plain `npm run
dev` serves only the Vite frontend and will not provide `/api/*` routes.
