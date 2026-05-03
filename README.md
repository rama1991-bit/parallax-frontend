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
- Phase 2 ingested-article analysis, article-id compare, node-based article detail, bounded OSINT panels, default source seeding, active source sync controls, ingestion health badges, source quality badges, and admin source/feed governance controls
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
NEXT_PUBLIC_ADMIN_CONTROLS=false
```

The browser stores an anonymous `parallax_session_id` in `localStorage` and sends it as `X-Parallax-Session-Id` so feed cards and reports remain separated before full auth is added.

Production environment:

```bash
NEXT_PUBLIC_API_URL=https://your-backend.example.com
NEXT_PUBLIC_ADMIN_CONTROLS=false
```

`NEXT_PUBLIC_API_URL` must be the deployed backend origin with no trailing slash. Keep `NEXT_PUBLIC_ADMIN_CONTROLS=false` for the public app. Set it to `true` only for a separate admin-facing deployment. The `/sources` admin controls then ask for an admin key and send it as `X-Parallax-Admin-Key`; the key is kept in `sessionStorage`, not bundled into the app.

Production deploy checklist:

1. Deploy the backend first and confirm `/api/v1/health`.
2. Set `NEXT_PUBLIC_API_URL` to the deployed backend origin, with no trailing slash.
3. Keep `NEXT_PUBLIC_ADMIN_CONTROLS=false` for the public deployment; use a separate admin deployment when source seeding/sync controls should be visible.
4. Set backend `FRONTEND_URL` to the deployed frontend origin so CORS and brief share links match.
5. Run `npm run build` locally before deploy.
6. After deploy, test onboarding, feed, admin-gated default source seeding and active source sync in `/sources`, source health and quality badges, source review controls, feed pause/quarantine/reactivate controls, recent sync runs, ingested-article analyze, `/articles/<id>` node tabs and OSINT panel, article-id compare, alerts, sources, reports, saved reports, compare, and briefs in one browser session.

CI:

GitHub Actions runs `npm ci` and `npm run build` on pushes and pull requests.
