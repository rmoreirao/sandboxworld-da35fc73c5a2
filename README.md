# Pomodoro workshop starter

This is a runnable **starting point, not a finished Pomodoro application**.
It contains a Node 24 JavaScript server, a separate plain-JavaScript frontend,
a health endpoint, and a small Azure deployment. There are no task routes,
timer controls, storage implementation, or automated test suites.

## Create your Codespace

Use **Create Codespace** in the workshop, or this repository's **Code > Codespaces**
menu. Choose **main** and the included dev container, review the machine and
billing options, then confirm creation on GitHub. The platform does not create,
start, or check a Codespace for you, and workshop readiness does not depend on it.
GitHub account limits and charges apply. Reuse an existing Codespace for this
repository rather than creating another on each visit.

Open https://github.com/codespaces to resume, stop, or delete it. Workshop End,
Pause, and resource cleanup do not manage learner-created Codespaces.

The dev container installs Node 24, Git, GitHub CLI, Azure CLI, Bicep, and the
official VS Code GitHub Copilot/Copilot Chat extensions. Creation runs
`npm ci && npm run build`. Sign in to GitHub with **your own account** to use
Copilot; access depends on your subscription and organization policy.
There is no workshop model key, GitHub App private key, Azure credential,
or automatic Azure login in this repository or dev container.

```sh
npm ci
npm run dev
```

Open forwarded port **3000**, which is configured as **private**. The frontend
is rebuilt when its files change; refresh the browser to see changes. Node
restarts when backend files change. Stop with Ctrl+C. Do not make the
Codespaces port public or paste authentication tokens into the terminal/chat.

Outside Codespaces, install Node **24.x** (`.nvmrc` pins the CI patch), then:

```sh
npm ci
npm run build
npm start
```

Open `http://localhost:3000`. `PORT` changes the listening port.
`GET /health` returns `{"status":"ok","revision":"local"}` locally, or the exact
`DEPLOYMENT_SHA` environment variable in a deployment. `HEAD /health` is also
supported. The server listens on `0.0.0.0`, including in App Service.

## Exact source and build paths

| Path | Purpose |
| --- | --- |
| `src/frontend/index.html` | Intentionally basic entry page |
| `src/frontend/app.js` | Health display; task/timer UI remains TODO |
| `src/frontend/styles.css` | Local styles; no remote fonts/assets |
| `src/backend/server.js` | Node built-in HTTP server and `/health` |
| `src/backend/public/` | Generated frontend output, ignored by Git |
| `scripts/build.mjs` | Packages frontend files into backend `public/` |
| `scripts/dev.mjs` | Builds, watches frontend, and runs Node watch mode |
| `infra/main.bicep` | Resource-group-scoped Azure infrastructure |
| `.github/scripts/release-gate.cjs` | Release authorization policy |
| `.github/workflows/validate.yml` | Build + Bicep compilation; no Azure login |
| `.github/workflows/deploy.yml` | Authorization, isolated build, OIDC deployment |

There is no bundler or transpiler: `npm run build` copies the separate
JavaScript frontend into the server's static directory. There are no npm
dependencies. `npm ci` uses the committed lockfile. The deployment ZIP contains
`package.json`, `package-lock.json`, and `src/backend/` including built public
files, plus production `node_modules/` when present. To add a runtime dependency
such as Express, use `npm install express` and commit both the manifest and
lockfile; no deployment workflow edit is needed.

The credential-free Linux build job runs `npm ci` and `npm run build`, then
`npm prune --omit=dev --ignore-scripts` before packaging. Runtime dependencies
and any native modules are installed/built on that Linux runner; development
dependencies are not shipped. All learner dependency/build execution stays in
that job, without an Azure token. The cloud-token job only deploys the prepared
package: it does not install dependencies or run learner lifecycle scripts.
App Service remote build remains intentionally disabled.

## Your learner TODOs

Read the session's functional brief, application standards, and infrastructure
guidance with your Product Owner before treating these as agreed requirements:

- [ ] Agree what “task complete” and “preserve on refresh” mean.
- [ ] Add a task with a non-empty, trimmed title; reject blank input.
- [ ] Mark a task complete and delete a task.
- [ ] Preserve tasks on refresh, explicitly deciding where the data belongs.
- [ ] Add a 25-minute timer with start, pause, and reset.
- [ ] Keep API work under `/api/tasks`, validate inputs, and keep frontend
  state/rendering separate from backend and infrastructure.
- [ ] Confirm keyboard use, empty/error states, and behavior after refresh.
- [ ] Describe your implementation and manual browser evidence in a PR.

The workshop application standards recommend Express for the implemented
task API. This starter deliberately uses Node built-ins to keep the scaffold
dependency-free; introduce Express with a committed lockfile when implementing
that standard. Do not add accounts, breaks, notifications, synchronization,
or reporting unless your Product Owner explicitly changes the scope.
The starter's health display is not evidence those learner tasks are complete.

### Accessible browser acceptance contract

When you implement the learner features, preserve these exact accessible
names and semantics so the platform's Tester can inspect the **deployed app**
without brittle CSS selectors:

| Element | Required accessible contract |
| --- | --- |
| Task entry | Textbox named `Task title` |
| Add action | Button named `Add task` |
| Task completion | Checkbox named exactly the task title |
| Task deletion | Button named `Delete <task title>`, with the actual title substituted |
| Countdown | `role="timer"` with `MM:SS` text |
| Timer actions | Buttons named `Start timer`, `Pause timer`, and `Reset timer` |

Use proper labels and keyboard-operable controls. These are requirements for
your implementation, not features already present in this starter.

## Coding and manual browser inspection

Use Copilot with your own GitHub identity. Repository guidance is in
`.github/copilot-instructions.md`; the Playwright CLI skill is in
`.github/skills/playwright-cli/SKILL.md`. It links the **official Microsoft
Playwright CLI skill at a pinned upstream revision**, with a small local
workshop-specific guide. No service/model credentials are needed to inspect
your own local page. Browser tooling is optional and is not run by CI.

```sh
npm install --global @playwright/cli@0.1.20
playwright-cli --help
playwright-cli open http://localhost:3000
playwright-cli snapshot
playwright-cli close
```

The CLI is headless by default, including in Codespaces; the repository skill
also shows an explicit configuration. Install a browser only when the CLI
reports that it is missing.
Do not commit browser profiles, authentication state, recordings containing
personal data, or tokens. There is deliberately no `npm test` script.

## Pull request and release path

1. Work on a branch **inside this session repository** and open a PR to `main`.
   Fork PRs can validate, but do not qualify for this workshop release gate.
2. **Validate workshop** runs **Build and validate Bicep** (`npm ci`,
   `npm run build`, `az bicep build`) without cloud access. These are build
   checks, not automated functional tests.
3. Ask the platform's Tech Lead GitHub App to review your latest PR head.
   Its latest submitted review must be `APPROVED` with `commit_id` equal to
   that head SHA. A stale approval, dismissal, changes request, or later
   non-approval review does not qualify.
4. Merge the PR after checks and review pass. **Deploy workshop** correlates
   the `main` SHA to that PR's exact `merge_commit_sha`; an unrelated direct
   push does not qualify. Standard merge and squash are supported; rebase
   depends on GitHub retaining that exact merged-PR association.
5. A fresh, credential-free build produces the deployment ZIP and compiled
   Bicep. A separate job rechecks eligibility before OIDC login, deploys the
   two allowed App Service resource types, then verifies `/health` returns
   both `status: "ok"` and the expected revision.

The workflow does not exclude bot actors. A GitHub App bot can merge/dispatch
just like an authorized human. Use an installation token or user credential
for merges that must trigger push workflows: a push made with the repository's
`GITHUB_TOKEN` normally does **not** trigger another workflow. The reviewer
identity is `<REVIEWER_APP_SLUG>[bot]`, with API user type `Bot`, not the
generic `github-actions[bot]`.

Only the current default branch named `main` can deploy. Pending/cancelled/
failed latest PR validation runs fail closed; an earlier successful run
cannot substitute. If GitHub's review/check APIs are temporarily delayed,
rerun **Deploy workshop** on `main`. Jobs are serialized per repository and
stale queued revisions are rejected instead of overwriting a newer release.

## Platform owner: bootstrap and repository variables

These are **repository Actions variables**, not secrets:

| Variable | Contract |
| --- | --- |
| `AZURE_CLIENT_ID` | Client/application ID of the session deployment identity |
| `AZURE_TENANT_ID` | Tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Subscription ID |
| `AZURE_RESOURCE_GROUP` | Existing, session-scoped resource group |
| `AZURE_LOCATION` | Approved Azure location, for example `westeurope` |
| `AZURE_WEBAPP_NAME` | Globally unique App Service name, 2–55 characters (leaves room for `-plan`) |
| `REVIEWER_APP_SLUG` | Bare Tech Lead GitHub App slug, **without** `[bot]` |
| `BOOTSTRAP_SEED_SHA` | Full lowercase 40-character seed commit SHA |

**Bootstrap order matters:**

1. Copy this starter's contents, including dotfiles, to the new public
   session repository root. Create the initial commit on `main`.
2. Record that exact commit SHA in `BOOTSTRAP_SEED_SHA` **after** the commit
   exists. Never advance this exemption to a learner commit.
3. Configure the remaining repository variables, resource group, federated
   identity, resource-group permissions, and repository protections.
4. Manually dispatch `.github/workflows/deploy.yml` with `ref: main`.

An initial push before variables are configured skips the entire deployment.
Even with variables present, the seed exemption only works for an explicit
`workflow_dispatch`; it is not a general direct-push exemption. The seed needs
no PR, but still builds, compiles Bicep, and verifies the live revision.

The bootstrap platform explicitly configures the repository's GitHub OIDC
subject customization with ordered claims
`["repository_owner_id", "repository_id", "ref"]` and `use_default: false`.
Use an Azure federated credential with issuer
`https://token.actions.githubusercontent.com`, audience
`api://AzureADTokenExchange`, and subject
`repository_owner_id:<owner-id>:repository_id:<repository-id>:ref:refs/heads/main`,
substituting GitHub's actual numeric IDs. This binds the identity to the
created repository rather than a reusable repository name. Do not use the
default `repo:OWNER/REPOSITORY:ref:refs/heads/main` subject. There is deliberately
no GitHub environment in the workflow: do not add an `environment` job property
or configure an environment-shaped OIDC subject. The identity needs approved deployment and App Service
permissions **only in its assigned resource group**, not subscription-wide
Owner. The workflow does not create resource groups, identities, role
assignments, secrets, or credentials.

Configure branch rules outside the learner repository: require a PR,
dismiss stale reviews, require **Build and validate Bicep** from GitHub
Actions, block force pushes/deletion, and restrict bypass/administration.
Require platform-owner review of `.github/`, `infra/`, and deployment/build
configuration. A check or gate in a repository an actor can rewrite is **not
a security boundary** against that actor: enforce protected ownership and
resource restrictions externally (rulesets and Azure RBAC/Policy).
Do not put a publish profile or App private key in this public repository.

## Azure shape, cost, and outputs

`infra/main.bicep` accepts `appName`, `location`, and `deploymentSha`.
It deploys exactly a Linux `Microsoft.Web/serverfarms` **B1** plan and a
Linux `Microsoft.Web/sites` app with HTTPS, TLS 1.2+, disabled FTP, an
explicit Node startup command, and `DEPLOYMENT_SHA` in app settings.
The runtime is `NODE|24-lts`: verified against
`az webapp list-runtimes --os linux` on 2026-09-18, and checked again at
deployment. The runtime check accepts both older CLI string lists and Azure
CLI 2.90's structured runtime records, rejects unsupported/non-Linux entries,
and reports the provider response if Node 24 LTS is unavailable.
See the [official Node App Service documentation](https://learn.microsoft.com/azure/app-service/configure-language-nodejs).
Quota, regional capacity, tenant policy, and B1 charges still apply.

The Bicep `appUrl` output and cloud job `appUrl` output point to
`https://<AZURE_WEBAPP_NAME>.azurewebsites.net` (Azure public cloud), **without
a trailing slash**. The monitor requires `health.revision` to equal the
exact `DEPLOYMENT_SHA`.
The workflow job summary shows the URL and exact deployment SHA.
Artifact `deployment-<SHA>` contains:

```json
{
  "appUrl": "https://<AZURE_WEBAPP_NAME>.azurewebsites.net",
  "sha": "<40-character deployed commit>",
  "runUrl": "https://github.com/<owner>/<repo>/actions/runs/<id>",
  "healthVerified": true
}
```

The artifact also includes the verified `health.json`. A platform monitor
can derive the URL from the known app name and independently compare the
health `revision` with the deployed commit. A build artifact, review, or
workflow dispatch alone is not proof of a live deployment.

Image/features/Actions/Bicep versions are pinned; GitHub-hosted Ubuntu runner
and preinstalled Azure CLI receive platform updates. Review pins periodically.
This scaffold has not provisioned Azure or a Codespace; owners must validate
those integrations in their tenant. Stopping a workshop does **not** delete
the App Service plan, revoke identity access, or stop/delete Codespaces.
The owner is responsible for cleanup and for charges until then.
