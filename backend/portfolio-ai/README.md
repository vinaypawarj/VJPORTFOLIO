# Portfolio AI backend

The portfolio remains on GitHub Pages. This separate, dependency-free Vercel function supplies real AI replies to its bottom-right chat panel. The site currently has no configured endpoint and identifies its built-in portfolio answers as a guide, not live AI.

## Activate

1. Create a Vercel project using this repository with **Root Directory** `backend/portfolio-ai` and no framework. Do not move or redeploy the portfolio itself.
2. Set the server environment variables `OPENAI_API_KEY`, `OPENAI_MODEL` (default `gpt-6.2-sol`), and `ALLOWED_ORIGINS` (default `https://vinaypawarj.github.io`). Never place the API key in GitHub source or browser JavaScript.
3. Configure project usage limits and a global rate limit in Vercel Firewall for `/api/chat` before exposing the service broadly. The included limiter is per warm function instance, not a durable global quota. CORS restricts browser origins but is not authentication.
4. Deploy the function and verify a real reply at `POST /api/chat` from the allowed portfolio origin. This requires an API account with access to the configured model. API usage can incur charges; set the owner's budget before activating paid traffic.
5. Put the returned HTTPS `/api/chat` URL into the public `endpoint` field in the portfolio's root `chat-config.js`. Publish that file to GitHub Pages. The panel then switches to AI mode and sends conversations to the backend.
6. If a custom domain is activated later, add its exact origin to `ALLOWED_ORIGINS` and redeploy the backend. Do not add unregistered domains preemptively.

## Behavior

The client keeps conversation history in page memory, supports new chat and cancellation, and sends at most nine messages per request. The backend validates roles and payload size, bounds output, applies request limits, uses a 25-second upstream timeout, and returns sanitized failures. It sends `store: false` to the Responses API and does not write chat messages to a database. Provider-level retention policies still apply.

Run `npm test` in this directory. The tests use a mocked model; live AI behavior must also be checked after credentials and deployment are configured.

Official references:

- https://developers.openai.com/api/docs/quickstart
- https://developers.openai.com/api/docs/guides/latest-model
- https://vercel.com/docs/functions/runtimes/node-js
