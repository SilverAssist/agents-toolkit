# Git Operations Partial

Reusable Git workflow operations for prompts.

## Usage

Include these steps in prompts that require Git operations.

---

## Branch Operations

### Step: Resolve Base Branch

1. **Read base branch from config**:
   ```bash
   BASE_BRANCH=$(node -e "try{const c=require('./.copilot-prompts.json');console.log(c.pr?.targetBranch||c.git?.defaultBranch||'main')}catch{console.log('main')}")
   echo "$BASE_BRANCH"
   ```

2. **Fallback behavior**:
   - If config is missing or invalid, default to `main`

---

### Step: Verify Branch Status

1. **Check current branch**:
   - Run `git branch --show-current` to get current branch name
   - Ensure not on protected branches: `main`, `dev`, `stg`, `master`, and `${BASE_BRANCH}`

2. **Check branch naming**:
   - Verify branch follows convention:
     - `feature/[TICKET-ID]-short-description`
     - `bugfix/[TICKET-ID]-short-description`

3. **Check uncommitted changes**:
   - Run `git status` to see working directory state
   - Ensure all changes are committed before proceeding

---

### Step: Create Working Branch

1. **Ensure on latest base branch**:
   ```bash
   git checkout "$BASE_BRANCH"
   git pull origin "$BASE_BRANCH"
   ```

2. **Create new branch**:
   ```bash
   git checkout -b feature/[TICKET-ID]-short-description
   # or
   git checkout -b bugfix/[TICKET-ID]-short-description
   ```

---

### Step: Push Branch

1. **Push to remote**:
   ```bash
   git push -u origin <branch-name>
   ```

2. **Verify push**:
   - Confirm branch appears in remote repository

---

## Sync Operations

### Step: Sync with Base Branch

1. **Fetch latest**:
   ```bash
   git fetch origin
   ```

2. **Rebase on base branch**:
   ```bash
   git rebase "origin/${BASE_BRANCH}"
   ```

3. **Handle conflicts** (if any):
   - Resolve each conflict file
   - Stage resolved files: `git add <file>`
   - Continue rebase: `git rebase --continue`

4. **Push updated branch**:
   ```bash
   git push --force-with-lease
   ```

---

## Commit Operations

### Step: Review Commits

1. **View recent commits**:
   ```bash
   git log --oneline -5
   ```

2. **Verify commit messages**:
   - Follow format: `TICKET-ID: Short description`
   - Use present tense, imperative mood
   - Example: `WEB-726: Add font size accessibility controls`

3. **If history is noisy**:
   - Prefer squash merge in the PR platform instead of interactive rebases

---

### Step: View Changes

1. **Summary of changes**:
   ```bash
   git diff --stat
   ```

2. **List changed files**:
   ```bash
   git diff "$BASE_BRANCH" --name-only
   ```

3. **Detailed diff**:
   ```bash
   git diff "$BASE_BRANCH"
   ```

---

## Cleanup Operations

### Step: Post-Merge Cleanup

1. **Delete local branch**:
   ```bash
   git branch -d <branch-name>
   ```

2. **Delete remote branch**:
   ```bash
   git push origin --delete <branch-name>
   ```

3. **Prune stale branches**:
   ```bash
   git remote prune origin
   ```

---

## Branch Naming Convention

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/[TICKET-ID]-description` | `feature/WEB-726-font-controls` |
| Bugfix | `bugfix/[TICKET-ID]-description` | `bugfix/WEB-734-logo-sizing` |
| Hotfix | `hotfix/[TICKET-ID]-description` | `hotfix/WEB-800-critical-fix` |

## Protected Branches

These branches require PRs and cannot receive direct commits:
- `main` - Production
- `dev` - Development
- `stg` - Staging
- `master` - Legacy (if exists)
