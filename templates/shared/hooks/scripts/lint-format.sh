#!/usr/bin/env bash
# lint-format.sh — PostToolUse hook for VS Code Copilot
# Runs eslint --fix and prettier --write on files modified by the agent.
# This ensures agent-generated code follows project formatting standards.
# Exit 0 = pass (always), diagnostics printed to stderr.

set -uo pipefail

FILE="${COPILOT_FILE:-}"

if [[ -z "$FILE" ]]; then
  exit 0
fi

# Only process TypeScript, JavaScript, and CSS files
case "$FILE" in
  *.ts|*.tsx|*.js|*.jsx|*.css) ;;
  *) exit 0 ;;
esac

# Resolve to absolute path to prevent infinite loop in directory walk
if [[ "$FILE" != /* ]]; then
  FILE="$(cd "$(dirname "$FILE")" && pwd)/$(basename "$FILE")"
fi

# File must exist
if [[ ! -f "$FILE" ]]; then
  exit 0
fi

# Find project root (look for package.json)
DIR="$(dirname "$FILE")"
PROJECT_ROOT=""
while [[ "$DIR" != "/" ]]; do
  if [[ -f "$DIR/package.json" ]]; then
    PROJECT_ROOT="$DIR"
    break
  fi
  DIR="$(dirname "$DIR")"
done

if [[ -z "$PROJECT_ROOT" ]]; then
  exit 0
fi

# Resolve tool paths
ESLINT="$PROJECT_ROOT/node_modules/.bin/eslint"
PRETTIER="$PROJECT_ROOT/node_modules/.bin/prettier"

# Run ESLint --fix (only on TS/JS files)
case "$FILE" in
  *.ts|*.tsx|*.js|*.jsx)
    if [[ -x "$ESLINT" ]]; then
      "$ESLINT" --fix "$FILE" || true
    fi
    ;;
esac

# Run Prettier --write
if [[ -x "$PRETTIER" ]]; then
  "$PRETTIER" --write "$FILE" || true
fi

exit 0
