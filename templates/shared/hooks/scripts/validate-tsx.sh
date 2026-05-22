#!/usr/bin/env bash
# validate-tsx.sh — PostToolUse hook for VS Code Copilot
# Validates that TSX component files follow project conventions.
# Exit 0 = pass, Exit 1 = fail (shown as warning to Copilot).

set -euo pipefail

# Only run when a .tsx file was modified
FILE="${COPILOT_FILE:-}"

if [[ -z "$FILE" ]]; then
  exit 0
fi

if [[ "$FILE" != *.tsx ]]; then
  exit 0
fi

# Only validate files inside components/ directories
if [[ "$FILE" != *"/components/"* ]]; then
  exit 0
fi

ERRORS=()

# --- Rule 1: Component must be inside a folder with index.tsx ---
BASENAME=$(basename "$FILE")
DIRNAME=$(basename "$(dirname "$FILE")")

if [[ "$BASENAME" != "index.tsx" && "$DIRNAME" != "__tests__" ]]; then
  ERRORS+=("Component files must be named index.tsx inside a kebab-case folder (found: $BASENAME)")
fi

# --- Rule 2: Parent folder must be kebab-case ---
if [[ "$BASENAME" == "index.tsx" ]]; then
  if [[ ! "$DIRNAME" =~ ^[a-z][a-z0-9]*(-[a-z0-9]+)*$ ]]; then
    ERRORS+=("Component folder must be kebab-case (found: $DIRNAME)")
  fi
fi

# --- Rule 3: Must have a default export function (PascalCase) ---
if [[ "$BASENAME" == "index.tsx" ]] && [[ -f "$FILE" ]]; then
  if ! grep -qE "^export default function [A-Z]" "$FILE"; then
    ERRORS+=("Component must use 'export default function PascalName' pattern")
  fi
fi

# --- Rule 4: Props interface should exist for non-trivial components ---
if [[ "$BASENAME" == "index.tsx" ]] && [[ -f "$FILE" ]]; then
  # Check if there are props being destructured
  if grep -qE "^export default function [A-Z][a-zA-Z]+\(" "$FILE"; then
    # If it has props (not empty parens), check for interface
    if grep -qE "^export default function [A-Z][a-zA-Z]+\(\{" "$FILE"; then
      if ! grep -qE "^(export )?(interface|type) [A-Z][a-zA-Z]+Props" "$FILE"; then
        ERRORS+=("Components with props should define a Props interface (e.g., interface ComponentNameProps)")
      fi
    fi
  fi
fi

# --- Rule 5: No relative imports (must use @/ prefix) ---
if [[ -f "$FILE" ]]; then
  if grep -qE "^import .+ from ['\"]\.\.?/" "$FILE" || grep -qE "^import ['\"]\.\.?/" "$FILE"; then
    ERRORS+=("Relative imports found. Use absolute imports with @/ prefix instead of ./ or ../")
  fi
fi

# --- Report ---
if [[ ${#ERRORS[@]} -gt 0 ]]; then
  echo "⚠️  TSX validation issues in: $FILE"
  for err in "${ERRORS[@]}"; do
    echo "  • $err"
  done
  exit 1
fi

exit 0
