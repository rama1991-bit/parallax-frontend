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
- Phase 2 ingested-article analysis, article-id compare with title, missing/added claim, coverage-gap, source, and timeline detail, event-cluster-aware compare context with cluster quality, language-bridge terms, coverage tasks, and suggested source searches, node-based article detail, bounded OSINT panels, default source seeding, source/feed creation forms, per-source sync controls, pending article analysis controls, active RSS/homepage source sync controls with manual-feed skip summaries, source/topic intelligence aggregation panels, topic detail event cluster panels, intelligence refresh/run controls, cluster refresh/run controls, one-click admin pipeline run controls, intelligence feed cards, ingestion health badges, source quality badges, source operational alerts, alert delivery status/actions, provider metadata badges, and admin source/feed governance controls
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
6. After deploy, test onboarding, feed, admin-gated default source seeding, source/feed creation, per-source sync, pending article analysis, active RSS/homepage source sync with manual-feed skip summaries, full pipeline run in `/sources`, source health and quality badges, source intelligence refresh, batch intelligence refresh/run history, cluster refresh/run history with cross-language, average-quality, task, and search summaries, topic intelligence snapshots in `/topics`, topic detail pages and event clusters in `/topics/<id>`, generated intelligence feed cards, source operational alert evaluation/delivery/acknowledgement, source review controls, feed pause/quarantine/reactivate controls, recent sync runs, ingested-article analyze, `/articles/<id>` node tabs and OSINT panel provider badges, article-id compare provider badge, compare title/missing/added/coverage-gap panels, alerts, sources, reports, saved reports, compare, and briefs in one browser session.

CI:

GitHub Actions runs `npm ci` and `npm run build` on pushes and pull requests.
