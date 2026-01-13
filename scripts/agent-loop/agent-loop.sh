#!/bin/bash
# Derived from Ralph Wiggum - Long-running AI agent loop
# Usage: ./agent-loop.sh [max_iterations]

set -e

MAX_ITERATIONS=${1:-10}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PRD_FILE="$SCRIPT_DIR/../../doco/design/prd.json"
PROGRESS_FILE="$SCRIPT_DIR/progress.txt"
STREAM_FILE="$SCRIPT_DIR/stream.txt"
ARCHIVE_DIR="$SCRIPT_DIR/archive"
LAST_BRANCH_FILE="$SCRIPT_DIR/.last-branch"

# Set permissions to allow all operations without prompting
# This is required for non-interactive/autonomous operation
export OPENCODE_PERMISSION='{"*":"allow","external_directory":"allow","doom_loop":"ask"}'

# Print a section header
print_header() {
  echo ""
  echo "========================================================"
  echo "  $1"
  echo "========================================================"
}

# Print info line
print_info() {
  echo "[INFO] $1"
}

# Print success line
print_success() {
  echo "[OK]   $1"
}

# Print warning line
print_warn() {
  echo "[WARN] $1"
}

print_header "agent-loop - Autonomous Agent"
print_info "Script directory: $SCRIPT_DIR"
print_info "Project root: $PROJECT_ROOT"
print_info "Permissions: All tools allowed (non-interactive mode)"

# Archive previous run if branch changed
if [ -f "$PRD_FILE" ] && [ -f "$LAST_BRANCH_FILE" ]; then
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo "")
  LAST_BRANCH=$(cat "$LAST_BRANCH_FILE" 2>/dev/null || echo "")
  
  if [ -n "$CURRENT_BRANCH" ] && [ -n "$LAST_BRANCH" ] && [ "$CURRENT_BRANCH" != "$LAST_BRANCH" ]; then
    DATE=$(date +%Y-%m-%d)
    FOLDER_NAME=$(echo "$LAST_BRANCH" | sed 's|^agent-loop/||')
    ARCHIVE_FOLDER="$ARCHIVE_DIR/$DATE-$FOLDER_NAME"
    
    print_info "Archiving previous run: $LAST_BRANCH"
    mkdir -p "$ARCHIVE_FOLDER"
    [ -f "$PRD_FILE" ] && cp "$PRD_FILE" "$ARCHIVE_FOLDER/"
    [ -f "$PROGRESS_FILE" ] && cp "$PROGRESS_FILE" "$ARCHIVE_FOLDER/"
    print_info "Archived to: $ARCHIVE_FOLDER"
    
    echo "# agent-loop Progress Log" > "$PROGRESS_FILE"
    echo "Started: $(date)" >> "$PROGRESS_FILE"
    echo "---" >> "$PROGRESS_FILE"
  fi
fi

# Track current branch
if [ -f "$PRD_FILE" ]; then
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo "")
  if [ -n "$CURRENT_BRANCH" ]; then
    echo "$CURRENT_BRANCH" > "$LAST_BRANCH_FILE"
    print_info "Branch: $CURRENT_BRANCH"
  fi
fi

# Initialize progress file if it doesn't exist
if [ ! -f "$PROGRESS_FILE" ]; then
  echo "# agent-loop Progress Log" > "$PROGRESS_FILE"
  echo "Started: $(date)" >> "$PROGRESS_FILE"
  echo "---" >> "$PROGRESS_FILE"
fi

# Initialize stream file
echo "agent-loop Stream Log - Started: $(date)" > "$STREAM_FILE"
echo "Monitor with: tail -f $STREAM_FILE" >> "$STREAM_FILE"
echo "========================================================" >> "$STREAM_FILE"

echo ""
print_info "Max iterations: $MAX_ITERATIONS"
print_info "Stream file: $STREAM_FILE"
print_info "TIP: Run 'tail -f $STREAM_FILE' in another terminal for full output"
echo ""

for i in $(seq 1 $MAX_ITERATIONS); do
  print_header "Iteration $i of $MAX_ITERATIONS - $(date '+%H:%M:%S')"
  
  # Log iteration header to stream
  echo "" >> "$STREAM_FILE"
  echo "========================================================" >> "$STREAM_FILE"
  echo "  Iteration $i of $MAX_ITERATIONS - $(date)" >> "$STREAM_FILE"
  echo "========================================================" >> "$STREAM_FILE"
  
  # Show what story we're working on (if PRD exists)
  if [ -f "$PRD_FILE" ]; then
    NEXT_STORY=$(jq -r '.userStories[] | select(.passes == false and .phase == "MVP") | "\(.id): \(.title)"' "$PRD_FILE" 2>/dev/null | head -n 1)
    if [ -n "$NEXT_STORY" ]; then
      print_info "Next story: $NEXT_STORY"
    fi
  fi
  
  print_info "Running opencode agent..."
  
  # Record start time
  START_TIME=$(date +%s)
  LAST_SIZE=0
  
  # Run opencode from project root with the prompt content
  cd "$PROJECT_ROOT"
  PROMPT_CONTENT=$(cat "$SCRIPT_DIR/prompt.md")
  opencode run "$PROMPT_CONTENT" >> "$STREAM_FILE" 2>&1 &
  OPENCODE_PID=$!
  
  # Monitor progress while opencode runs
  while kill -0 "$OPENCODE_PID" 2>/dev/null; do
    # Check stream file size to detect activity
    if [ -f "$STREAM_FILE" ]; then
      CURRENT_SIZE=$(wc -c < "$STREAM_FILE" | tr -d ' ')
      NOW=$(date +%s)
      ELAPSED=$((NOW - START_TIME))
      
      if [ "$CURRENT_SIZE" != "$LAST_SIZE" ]; then
        # Show last meaningful line when there's new content
        LAST_LINE=$(tail -n 10 "$STREAM_FILE" | grep -v '^$' | grep -v '^===' | grep -v '^Monitor' | tail -n 1 | cut -c 1-80)
        if [ -n "$LAST_LINE" ]; then
          printf "\r[%3ds] %s" "$ELAPSED" "$LAST_LINE"
          # Pad with spaces to clear previous longer lines
          printf "                    "
          printf "\r[%3ds] %s" "$ELAPSED" "$LAST_LINE"
        fi
        LAST_SIZE=$CURRENT_SIZE
      else
        # Just update the elapsed time
        printf "\r[%3ds] (waiting for activity...)" "$ELAPSED"
      fi
    fi
    sleep 1
  done
  
  # Clear the progress line
  printf "\r                                                                                \r"
  
  # Wait for opencode to complete
  wait $OPENCODE_PID || true
  
  # Calculate duration
  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))
  MINUTES=$((DURATION / 60))
  SECONDS=$((DURATION % 60))
  
  # Read last part of stream to check for completion signal
  OUTPUT=$(tail -n 100 "$STREAM_FILE")
  
  # Check for completion signal
  if echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
    print_header "ALL TASKS COMPLETE"
    print_success "Finished at iteration $i of $MAX_ITERATIONS"
    print_success "Total time: ${MINUTES}m ${SECONDS}s"
    exit 0
  fi
  
  # Show iteration summary
  print_success "Iteration $i complete (${MINUTES}m ${SECONDS}s)"
  
  # Show recent activity summary
  echo "[INFO] Recent activity:"
  tail -n 50 "$STREAM_FILE" | grep -E "(feat:|fix:|PASS|FAIL|Error|Success|Complete|commit)" | tail -n 3 | while read line; do
    echo "       ${line:0:70}"
  done
  
  print_info "Pausing 2s before next iteration..."
  sleep 2
done

print_header "MAX ITERATIONS REACHED"
print_warn "Reached limit of $MAX_ITERATIONS iterations without completing all tasks"
print_warn "Check $PROGRESS_FILE for status"
exit 1
