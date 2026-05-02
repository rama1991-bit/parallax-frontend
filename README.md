# Parallax Frontend

Next.js frontend for the Parallax smart narrative intelligence MVP.

Current usable surfaces:
- smart feed and quick analyze
- topic monitors
- RSS feed subscriptions
- coverage compare
- article-id compare for ingested source stories
- alerts/notifications
- saved reports
- public briefs and share views
- source intelligence profiles
- Phase 2 ingested-article analysis, article-id compare, node-based article detail, bounded OSINT panels, and default source seeding
- onboarding setup flow

Run locally:

```bash
npm install
npm run dev
```

Environment:

```bash
cp .env.example .env.local
```

Set:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

The browser stores an anonymous `parallax_session_id` in `localStorage` and sends it as `X-Parallax-Session-Id` so feed cards and reports remain separated before full auth is added.

Production deploy checklist:

1. Deploy the backend first and confirm `/api/v1/health`.
2. Set `NEXT_PUBLIC_API_URL` to the deployed backend origin, with no trailing slash.
3. Set backend `FRONTEND_URL` to the deployed frontend origin so CORS and brief share links match.
4. Run `npm run build` locally before deploy.
5. After deploy, test onboarding, feed, default source seeding in `/sources`, ingested-article analyze, `/articles/<id>` node tabs and OSINT panel, article-id compare, alerts, sources, reports, saved reports, compare, and briefs in one browser session.

CI:

GitHub Actions runs `npm ci` and `npm run build` on pushes and pull requests.
