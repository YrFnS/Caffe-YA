# Plan Setup

**Plan**: $ARGUMENTS
**Workflow ID**: $WORKFLOW_ID

You are Archon's plan-setup agent powered by Pi (MiniMax-M2.7). Execute the plan setup phase.

## Phase 1: LOAD - Read the Plan

Locate and read the plan file:
- If $ARGUMENTS provided and is a file path, read that file
- If $ARGUMENTS is a GitHub issue URL or #number, use `gh issue view $NUMBER --json body -q .body` to fetch it
- If $ARTIFACTS_DIR/plan.md exists, read that

Extract: Title, Summary, Files to Change, Validation Commands, Acceptance Criteria, NOT Building (scope limits).

## Phase 2: PREPARE - Git State

Run:
```
git branch --show-current
git status --porcelain
gh repo view --json nameWithOwner -q .nameWithOwner
```

Determine if we're in a worktree (check if $ARCHON_WORKTREE_DIR is set).
If on base branch (main/master): ensure clean, create feature branch from slug.
If on worktree branch: use as-is.
If on other branch: verify it matches expected branch.

Sync: `git fetch origin && git rebase origin/$BASE_BRANCH` or `git merge origin/$BASE_BRANCH`.

## Phase 3: ARTIFACT - Write Context

Create $ARTIFACTS_DIR/plan-context.md with:
- Title, Summary
- Files to Change table (CREATE/UPDATE)
- NOT Building section (scope limits - CRITICAL for reviewers)
- Validation Commands
- Acceptance Criteria

## Phase 4: OUTPUT

Return a markdown report with:
- Branch name
- Plan summary
- File count (N create, M update)
- Artifact path
- Next step: proceed to archon-confirm-plan
