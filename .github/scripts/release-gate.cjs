module.exports = async ({ github, context, core }) => {
  const { owner, repo } = context.repo;
  const sha = context.sha;
  const fail = (message) => { throw new Error(`Release blocked: ${message}`); };
  const { data: repository } = await github.rest.repos.get({ owner, repo });
  if (repository.default_branch !== 'main' || context.ref !== 'refs/heads/main') {
    fail('only the main default branch may deploy');
  }
  if (!['push', 'workflow_dispatch'].includes(context.eventName)) {
    fail('unsupported deployment event');
  }
  if (!/^[a-f0-9]{40}$/.test(sha)) fail('invalid deployment SHA');
  const { data: branch } = await github.rest.repos.getBranch({ owner, repo, branch: 'main' });
  if (branch.commit.sha !== sha) fail('this run is no longer the current main revision');

  const seedSha = process.env.BOOTSTRAP_SEED_SHA || '';
  const reviewerSlug = process.env.REVIEWER_APP_SLUG || '';
  if (!/^[a-f0-9]{40}$/.test(seedSha)) fail('BOOTSTRAP_SEED_SHA must be an exact commit SHA');
  if (!/^[a-z0-9][a-z0-9-]*$/.test(reviewerSlug)) fail('REVIEWER_APP_SLUG must be the bare GitHub App slug');

  if (sha === seedSha) {
    if (context.eventName !== 'workflow_dispatch') {
      fail('the bootstrap seed may only deploy through a manual dispatch after configuration');
    }
    core.setOutput('sha', sha);
    core.setOutput('pull_request', '');
    core.notice(`Approved exact bootstrap seed ${sha}; no learner PR is required.`);
    return;
  }

  const associated = await github.paginate(github.rest.repos.listPullRequestsAssociatedWithCommit, {
    owner, repo, commit_sha: sha, per_page: 100,
  });
  const candidates = associated.filter((pr) =>
    pr.merged_at && pr.merge_commit_sha === sha &&
    pr.base.ref === 'main' && pr.base.repo.full_name === repository.full_name);
  if (candidates.length !== 1) fail('SHA must identify exactly one merged PR targeting this main branch');
  const { data: pr } = await github.rest.pulls.get({ owner, repo, pull_number: candidates[0].number });
  if (!pr.merged || pr.merge_commit_sha !== sha || pr.base.ref !== 'main') {
    fail('merged PR no longer matches the requested revision');
  }
  if (pr.head.repo?.full_name !== repository.full_name) {
    fail('workshop releases use branches in this session repository, not forks');
  }

  const reviews = await github.paginate(github.rest.pulls.listReviews, {
    owner, repo, pull_number: pr.number, per_page: 100,
  });
  const reviewerLogin = `${reviewerSlug}[bot]`;
  const latestReview = reviews
    .filter((review) => review.user?.type === 'Bot' &&
      review.user.login.toLowerCase() === reviewerLogin && review.state !== 'PENDING')
    .sort((a, b) => b.id - a.id)[0];
  if (!latestReview || latestReview.state !== 'APPROVED' || latestReview.commit_id !== pr.head.sha) {
    fail(`latest ${reviewerLogin} review must be APPROVED on PR head ${pr.head.sha}; stale, dismissed, or rejected reviews do not qualify`);
  }

  const { data: workflow } = await github.rest.actions.getWorkflow({
    owner, repo, workflow_id: 'validate.yml',
  });
  if (workflow.path !== '.github/workflows/validate.yml' || workflow.state !== 'active') {
    fail('the validation workflow must be active at its expected path');
  }
  const runs = await github.paginate(github.rest.actions.listWorkflowRuns, {
    owner, repo, workflow_id: workflow.id, event: 'pull_request',
    head_sha: pr.head.sha, per_page: 100,
  });
  const latestRun = runs
    .filter((run) => run.head_sha === pr.head.sha && run.event === 'pull_request' &&
      run.pull_requests.some((item) => item.number === pr.number && item.head.sha === pr.head.sha))
    .sort((a, b) => b.id - a.id)[0];
  if (!latestRun || latestRun.status !== 'completed' || latestRun.conclusion !== 'success') {
    fail('latest Validate workshop PR run on the approved head must finish successfully');
  }
  const checks = await github.paginate(github.rest.checks.listForSuite, {
    owner, repo, check_suite_id: latestRun.check_suite_id, filter: 'latest', per_page: 100,
  });
  const check = checks.filter((item) => item.name === 'Build and validate Bicep' &&
    item.app?.slug === 'github-actions').sort((a, b) => b.id - a.id)[0];
  if (!check || check.status !== 'completed' || check.conclusion !== 'success') {
    fail('the GitHub Actions Build and validate Bicep check must pass');
  }

  core.setOutput('sha', sha);
  core.setOutput('pull_request', String(pr.number));
  core.notice(`Approved merged PR #${pr.number}, reviewed head ${pr.head.sha}, release ${sha}.`);
};
