#!/usr/bin/env bash
# UI Testing Script for Ralph
# Usage: ./test-ui.sh <story-id>

set -e

STORY_ID=$1
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROGRESS_FILE="$SCRIPT_DIR/progress.txt"

if [ -z "$STORY_ID" ]; then
  echo "Usage: ./test-ui.sh <story-id>"
  echo "Example: ./test-ui.sh US-006"
  exit 1
fi

echo "═══════════════════════════════════════════════════════"
echo "  UI Testing for $STORY_ID"
echo "═══════════════════════════════════════════════════════"

# Create a test prompt for Claude with dev-browser access
TEST_PROMPT=$(cat <<EOF
You are testing the implementation of story $STORY_ID in a React collaborative markdown editor.

## Task
1. Load the dev-browser skill
2. Navigate to http://localhost:5173
3. Test the functionality described in story $STORY_ID (check the PRD at scripts/ralph/prd.json)
4. Verify all acceptance criteria are met
5. Take screenshots of key functionality
6. Report any issues found

## Important
- The backend should be running on port 3000
- The frontend should be running on port 5173
- For collaborative features, test with multiple browser tabs
- Document your findings clearly

Begin testing now.
EOF
)

# Run Claude in interactive mode for UI testing
echo "$TEST_PROMPT" | claude --dangerously-skip-permissions

echo ""
echo "UI testing complete for $STORY_ID"
echo "Check the output above for test results"
