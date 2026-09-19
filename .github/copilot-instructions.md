# Workshop coding instructions

- Read `README.md` and the session's agreed brief before coding. The starter
  is intentionally unfinished; do not claim task or timer behavior exists.
- Use JavaScript on Node 24. Keep frontend in `src/frontend`, backend in
  `src/backend`, and Bicep in `infra`. `src/backend/public` is generated.
- Preserve `GET /health` as `{status: "ok", revision: process.env.DEPLOYMENT_SHA || "local"}`.
  Honor `process.env.PORT`. Never hardcode a deployment revision.
- Implement only agreed task/timer requirements; validate API inputs under
  `/api/tasks`. Introduce Express with its lockfile when applying the
  workshop application standard.
- Preserve the README's accessible browser contract: `Task title`, `Add task`,
  a checkbox named by each task title, `Delete <task title>`, `role="timer"`
  with `MM:SS`, and `Start timer` / `Pause timer` / `Reset timer` buttons.
- Use `npm run build` for the local build. CI intentionally has no automated
  test suite. Use the `playwright-cli` repository skill for manual browser
  inspection of the learner app, not the platform's reference preview.
- Explain evidence and remaining gaps in the PR. Do not manufacture reviews,
  passing checks, release metadata, or completed achievements.
- Do not weaken the release gate, change `BOOTSTRAP_SEED_SHA`, expose a
  forwarded port, add deployment secrets, or give Azure access to PR jobs.
- Never copy personal login state, model keys, GitHub App private keys,
  publish profiles, or browser authentication artifacts into this public repo.
