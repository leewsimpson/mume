#!/bin/bash
# Derived from Ralph Wiggum - Long-running AI agent loop
# Usage: ./agent-loop.sh [max_iterations]
#
# This script uses opencode's server mode with SSE events for real-time streaming output.

set -e

MAX_ITERATIONS=${1:-10}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PRD_FILE="$PROJECT_ROOT/doco/design/prd.json"
PROGRESS_FILE="$SCRIPT_DIR/progress.txt"
STREAM_FILE="$SCRIPT_DIR/stream.txt"
ARCHIVE_DIR="$SCRIPT_DIR/archive"
LAST_BRANCH_FILE="$SCRIPT_DIR/.last-branch"

# Server config
PORT=4097
HOST="127.0.0.1"
BASE_URL="http://$HOST:$PORT"

# Set permissions to allow all operations without prompting
export OPENCODE_PERMISSION='{"*":"allow","external_directory":"allow","doom_loop":"ask"}'

# Cleanup function
cleanup() {
  echo ""
  echo "[INFO] Cleaning up..."
  # Kill the event listener if running
  if [ -n "$EVENT_PID" ] && kill -0 "$EVENT_PID" 2>/dev/null; then
    kill "$EVENT_PID" 2>/dev/null || true
  fi
  # Kill the server if we started it
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

echo ""
echo "========================================================"
echo "  agent-loop - Autonomous Agent"
echo "========================================================"
echo "[INFO] Script directory: $SCRIPT_DIR"
echo "[INFO] Project root: $PROJECT_ROOT"
echo "[INFO] Server: $BASE_URL"

# Archive previous run if branch changed
if [ -f "$PRD_FILE" ] && [ -f "$LAST_BRANCH_FILE" ]; then
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo "")
  LAST_BRANCH=$(cat "$LAST_BRANCH_FILE" 2>/dev/null || echo "")
  
  if [ -n "$CURRENT_BRANCH" ] && [ -n "$LAST_BRANCH" ] && [ "$CURRENT_BRANCH" != "$LAST_BRANCH" ]; then
    DATE=$(date +%Y-%m-%d)
    FOLDER_NAME=$(echo "$LAST_BRANCH" | sed 's|^agent-loop/||')
    ARCHIVE_FOLDER="$ARCHIVE_DIR/$DATE-$FOLDER_NAME"
    
    echo "[INFO] Archiving previous run: $LAST_BRANCH"
    mkdir -p "$ARCHIVE_FOLDER"
    [ -f "$PRD_FILE" ] && cp "$PRD_FILE" "$ARCHIVE_FOLDER/"
    [ -f "$PROGRESS_FILE" ] && cp "$PROGRESS_FILE" "$ARCHIVE_FOLDER/"
  fi
fi

# Track current branch
if [ -f "$PRD_FILE" ]; then
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo "")
  if [ -n "$CURRENT_BRANCH" ]; then
    echo "$CURRENT_BRANCH" > "$LAST_BRANCH_FILE"
    echo "[INFO] Branch: $CURRENT_BRANCH"
  fi
fi

# Initialize progress file
if [ ! -f "$PROGRESS_FILE" ]; then
  echo "# agent-loop Progress Log" > "$PROGRESS_FILE"
  echo "Started: $(date)" >> "$PROGRESS_FILE"
  echo "---" >> "$PROGRESS_FILE"
fi

# Initialize stream file
echo "agent-loop Stream Log - Started: $(date)" > "$STREAM_FILE"
echo "========================================================" >> "$STREAM_FILE"

echo ""
echo "[INFO] Max iterations: $MAX_ITERATIONS"
echo "[INFO] Stream file: $STREAM_FILE"
echo "[INFO] TIP: Run 'tail -f $STREAM_FILE' in another terminal"
echo ""

# Start the opencode server in background
echo "[INFO] Starting opencode server on port $PORT..."
cd "$PROJECT_ROOT"
opencode serve --port $PORT --hostname $HOST > /dev/null 2>&1 &
SERVER_PID=$!

# Wait for server to be ready
echo "[INFO] Waiting for server to start..."
for i in {1..30}; do
  if curl -s "$BASE_URL/global/health" > /dev/null 2>&1; then
    echo "[OK]   Server is ready"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "[ERROR] Server failed to start"
    exit 1
  fi
  sleep 1
done

# Start SSE event listener in background - this streams all events to the stream file
echo "[INFO] Starting event stream listener..."
(
  curl -sN "$BASE_URL/event" 2>/dev/null | while IFS= read -r line; do
    # Skip empty lines
    if [ -n "$line" ] && [ "$line" != "data: " ]; then
      # Remove "data: " prefix if present
      DATA="${line#data: }"
      if [ -n "$DATA" ]; then
        # Extract content from the nested event structure
        # Events are: {type: "message.part.updated", properties: {part: {type: "tool", state: {output: "..."}}}}
        # Or for text: {type: "message.part.updated", properties: {part: {type: "text", text: "..."}}}
        TEXT=$(echo "$DATA" | jq -r '
          .properties.part // {} |
          if .type == "text" then .text
          elif .type == "tool" and .state.status == "completed" and .state.output then .state.output
          else empty
          end
        ' 2>/dev/null)
        
        if [ -n "$TEXT" ] && [ "$TEXT" != "null" ]; then
          # Strip ANSI colour codes for cleaner output
          CLEAN_TEXT=$(printf '%s' "$TEXT" | perl -pe 's/\e\[[0-9;]*m//g; s/\\x1b\[[0-9;]*m//g' 2>/dev/null || printf '%s' "$TEXT")
          echo "$CLEAN_TEXT" >> "$STREAM_FILE"
        fi
      fi
    fi
  done
) &
EVENT_PID=$!

# Give the event listener a moment to connect
sleep 1

# Load the prompt content
PROMPT_CONTENT=$(cat "$SCRIPT_DIR/prompt.md")

for i in $(seq 1 $MAX_ITERATIONS); do
  echo ""
  echo "========================================================"
  echo "  Iteration $i of $MAX_ITERATIONS - $(date '+%H:%M:%S')"
  echo "========================================================"
  
  # Log to stream file
  echo "" >> "$STREAM_FILE"
  echo "========================================================" >> "$STREAM_FILE"
  echo "  Iteration $i of $MAX_ITERATIONS - $(date)" >> "$STREAM_FILE"
  echo "========================================================" >> "$STREAM_FILE"
  
  # Show what story we're working on
  if [ -f "$PRD_FILE" ]; then
    NEXT_STORY=$(jq -r '.userStories[] | select(.passes == false and .phase == "MVP") | "\(.id): \(.title)"' "$PRD_FILE" 2>/dev/null | head -n 1)
    if [ -n "$NEXT_STORY" ]; then
      echo "[INFO] Next story: $NEXT_STORY"
    fi
  fi
  
  echo "[INFO] Running opencode agent..."
  START_TIME=$(date +%s)
  
  # Create a new session
  SESSION_RESPONSE=$(curl -s -X POST "$BASE_URL/session" \
    -H "Content-Type: application/json" \
    -d '{"title": "agent-loop iteration '$i'"}')
  
  SESSION_ID=$(echo "$SESSION_RESPONSE" | jq -r '.id')
  
  if [ -z "$SESSION_ID" ] || [ "$SESSION_ID" = "null" ]; then
    echo "[ERROR] Failed to create session"
    echo "$SESSION_RESPONSE"
    continue
  fi
  
  echo "[INFO] Session: $SESSION_ID"
  
  # Send the prompt and wait for completion
  # Using prompt_async so we can monitor via events
  curl -s -X POST "$BASE_URL/session/$SESSION_ID/prompt_async" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg content "$PROMPT_CONTENT" '{parts: [{type: "text", text: $content}]}')" > /dev/null
  
  # Wait a moment for the session to start processing
  sleep 2
  
  # Monitor until the session is complete
  echo "[INFO] Monitoring progress (tail -f $STREAM_FILE for details)..."
  LAST_SIZE=$(wc -c < "$STREAM_FILE" | tr -d ' ')
  SEEN_RUNNING=false
  
  while true; do
    # Check session status
    STATUS_RESPONSE=$(curl -s "$BASE_URL/session/status")
    # Status can be a string or an object with .type field
    SESSION_STATUS=$(echo "$STATUS_RESPONSE" | jq -r --arg id "$SESSION_ID" '.[$id] | if type == "object" then .type else . end')
    
    # Track if we've seen the session running (status can be "running", "pending", or "busy")
    if [ "$SESSION_STATUS" = "running" ] || [ "$SESSION_STATUS" = "pending" ] || [ "$SESSION_STATUS" = "busy" ]; then
      SEEN_RUNNING=true
    fi
    
    # Only exit if we've seen it running and it's now complete/idle
    if [ "$SEEN_RUNNING" = true ]; then
      if [ "$SESSION_STATUS" = "complete" ] || [ "$SESSION_STATUS" = "idle" ] || [ "$SESSION_STATUS" = "null" ] || [ -z "$SESSION_STATUS" ]; then
        break
      fi
    fi
    
    # Timeout after 30 minutes with no activity
    NOW=$(date +%s)
    ELAPSED=$((NOW - START_TIME))
    if [ "$SEEN_RUNNING" = false ] && [ $ELAPSED -gt 60 ]; then
      echo ""
      echo "[WARN] Session not starting after 60s, status: $SESSION_STATUS"
      break
    fi
    
    # Show activity indicator
    NOW=$(date +%s)
    ELAPSED=$((NOW - START_TIME))
    CURRENT_SIZE=$(wc -c < "$STREAM_FILE" | tr -d ' ')
    
    if [ "$CURRENT_SIZE" != "$LAST_SIZE" ]; then
      LAST_LINE=$(tail -n 5 "$STREAM_FILE" | grep -v '^$' | grep -v '^===' | tail -n 1 | cut -c 1-70)
      printf "\r[%3ds] %s" "$ELAPSED" "$LAST_LINE"
      printf "                    \r[%3ds] %s" "$ELAPSED" "$LAST_LINE"
      LAST_SIZE=$CURRENT_SIZE
    else
      printf "\r[%3ds] (working...)" "$ELAPSED"
    fi
    
    sleep 2
  done
  
  printf "\r                                                                        \r"
  
  # Calculate duration
  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))
  MINUTES=$((DURATION / 60))
  SECONDS=$((DURATION % 60))
  
  echo "[OK]   Iteration $i complete (${MINUTES}m ${SECONDS}s)"
  
  # Check for completion signal
  OUTPUT=$(tail -n 200 "$STREAM_FILE")
  if echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
    echo ""
    echo "========================================================"
    echo "  ALL TASKS COMPLETE"
    echo "========================================================"
    echo "[OK]   Finished at iteration $i of $MAX_ITERATIONS"
    exit 0
  fi
  
  echo "[INFO] Pausing 2s before next iteration..."
  sleep 2
done

echo ""
echo "========================================================"
echo "  MAX ITERATIONS REACHED"
echo "========================================================"
echo "[WARN] Reached limit of $MAX_ITERATIONS iterations"
echo "[WARN] Check $PROGRESS_FILE for status"
exit 1
