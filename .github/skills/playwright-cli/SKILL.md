---
name: playwright-cli
description: Use the official Microsoft Playwright CLI to inspect the learner application in a browser while coding. Capture real evidence without adding a CI test suite.
---

# Playwright CLI for this workshop

Use the official **microsoft/playwright-cli** instructions, pinned to release
0.1.20 / upstream commit `12228454ed024c9ac89abd59df3b706ed9135fd9`:

- [Official SKILL.md](https://github.com/microsoft/playwright-cli/blob/12228454ed024c9ac89abd59df3b706ed9135fd9/skills/playwright-cli/SKILL.md)
- [Official repository README](https://github.com/microsoft/playwright-cli/blob/12228454ed024c9ac89abd59df3b706ed9135fd9/README.md)
- [Running browser code](https://github.com/microsoft/playwright-cli/blob/12228454ed024c9ac89abd59df3b706ed9135fd9/skills/playwright-cli/references/running-code.md)
- [Session management](https://github.com/microsoft/playwright-cli/blob/12228454ed024c9ac89abd59df3b706ed9135fd9/skills/playwright-cli/references/session-management.md)
- [Element attributes](https://github.com/microsoft/playwright-cli/blob/12228454ed024c9ac89abd59df3b706ed9135fd9/skills/playwright-cli/references/element-attributes.md)

This local companion is workshop-specific guidance, not a vendored copy of
the upstream skill. The upstream project is copyright Microsoft Corporation,
[Apache-2.0 licensed](https://github.com/microsoft/playwright-cli/blob/12228454ed024c9ac89abd59df3b706ed9135fd9/LICENSE).
Read its current pinned command reference when you need more than the basics
below. Do not invent commands or silently install a different package named
`playwright-cli`.

## Setup and inspection

1. Run `npm run dev` in a terminal and keep it running. Inspect
   `http://localhost:3000`, not an independent reference preview.
2. If the official CLI is missing, install
   `npm install --global @playwright/cli@0.1.20`.
3. Read `playwright-cli --help` for this installed version. Follow its browser
   installation guidance only if it reports a missing browser.
4. Open the local page, take a semantic snapshot, act using the snapshot's
   current element references, and take a new snapshot before reusing refs.
5. Close only the named browser session you opened.

```sh
playwright-cli -s=workshop open http://localhost:3000
playwright-cli -s=workshop snapshot
playwright-cli -s=workshop console
playwright-cli -s=workshop close
```

Use `click`, `fill`, and `press` with current snapshot refs as documented
upstream. Prefer snapshots; take screenshots only when visual evidence is
needed. Compare before and after states rather than claiming behavior from
code alone. Do not add Playwright Test, a generated test suite, or CI browser
runs just to gather manual workshop evidence.

## Headless Codespaces

For a Codespace with no display, create the ignored local file
`.playwright/cli.config.json`:

```json
{
  "browser": {
    "browserName": "chromium",
    "launchOptions": { "headless": true }
  }
}
```

Then run:

```sh
playwright-cli -s=workshop open http://localhost:3000 --config=.playwright/cli.config.json
playwright-cli -s=workshop snapshot
playwright-cli -s=workshop close
```

Local browser output under `.playwright-cli/` is ignored. Keep the application
port private. Do not export authenticated browser state, attach to a personal
browser profile, operate someone else's sessions, capture private platform
screens, or upload recordings containing credentials. Copilot uses the
learner's own authorized account; this skill needs no platform model key.
