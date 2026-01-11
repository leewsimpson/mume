# Ralph Wiggum - AI Agent Loop Script

## Overview

Ralph is a long-running AI agent loop that automates task execution using Claude AI. It repeatedly invokes Claude with a predefined prompt, monitors progress, and archives results when switching between different branches/tasks.

## Architecture Diagram

```mermaid
flowchart TD
    Start([Start Script]) --> Init[Initialize Variables<br/>MAX_ITERATIONS, paths]
    Init --> CheckArchive{Previous run exists<br/>& branch changed?}
    
    CheckArchive -->|Yes| Archive[Archive Previous Run<br/>- Copy PRD & Progress<br/>- Archive to dated folder<br/>- Reset progress file]
    CheckArchive -->|No| TrackBranch
    Archive --> TrackBranch[Track Current Branch<br/>Save to .last-branch]
    
    TrackBranch --> InitProgress{Progress file<br/>exists?}
    InitProgress -->|No| CreateProgress[Create Progress File<br/>with timestamp]
    InitProgress -->|Yes| Loop
    CreateProgress --> Loop
    
    Loop[Loop Counter: i=1] --> LoopCheck{i <= MAX_ITERATIONS?}
    
    LoopCheck -->|No| MaxReached[Max Iterations Reached<br/>Exit with error]
    LoopCheck -->|Yes| Display[Display Iteration Header<br/>i of MAX_ITERATIONS]
    
    Display --> RunClaude[Run Claude AI<br/>Input: prompt.md<br/>--dangerously-skip-permissions]
    
    RunClaude --> CheckOutput{Output contains<br/>COMPLETE promise?}
    
    CheckOutput -->|Yes| Success[Display Success Message<br/>Exit with success]
    CheckOutput -->|No| Sleep[Sleep 2 seconds]
    
    Sleep --> Increment[i = i + 1]
    Increment --> LoopCheck
    
    MaxReached --> End1([Exit Code 1])
    Success --> End0([Exit Code 0])
    
    style Start fill:#90EE90
    style Success fill:#90EE90
    style MaxReached fill:#FFB6C6
    style RunClaude fill:#87CEEB
    style Archive fill:#FFE4B5
```

## Key Components

### 1. **Configuration Variables**
- `MAX_ITERATIONS`: Maximum number of iterations (default: 10, or from CLI arg)
- `PRD_FILE`: Product Requirements Document (prd.json)
- `PROGRESS_FILE`: Running log of progress (progress.txt)
- `ARCHIVE_DIR`: Storage for previous runs
- `LAST_BRANCH_FILE`: Tracks the last branch name

### 2. **Archive System**

When the branch name in `prd.json` changes from the previous run:
1. Creates an archive folder: `archive/YYYY-MM-DD-{branch-name}/`
2. Copies `prd.json` and `progress.txt` to the archive
3. Resets `progress.txt` for the new run

### 3. **Main Loop**

```
For each iteration (1 to MAX_ITERATIONS):
  1. Display iteration header
  2. Execute: cat prompt.md | claude --dangerously-skip-permissions
  3. Check output for completion signal: <promise>COMPLETE</promise>
  4. If complete → exit with success (code 0)
  5. If not complete → sleep 2 seconds and continue
```

### 4. **Completion Detection**

The script looks for a specific XML-like tag in Claude's output:
```xml
<promise>COMPLETE</promise>
```

When found, the script terminates successfully.

### 5. **Exit Conditions**

| Condition | Exit Code | Message |
|-----------|-----------|---------|
| Tasks completed (COMPLETE tag found) | 0 | "Ralph completed all tasks!" |
| Max iterations reached | 1 | "Ralph reached max iterations without completing" |

## Usage

```bash
# Run with default 10 iterations
./ralph.sh

# Run with custom iterations
./ralph.sh 20
```

## File Dependencies

```
ralph/
├── ralph.sh          # This script
├── prompt.md         # Input prompt for Claude
├── prd.json          # Product Requirements Document (contains branchName)
├── progress.txt      # Running progress log
├── .last-branch      # Tracks last branch name
└── archive/          # Archived runs
    └── YYYY-MM-DD-{branch}/
        ├── prd.json
        └── progress.txt
```

## Workflow Example

```
Iteration 1: Claude analyzes prompt → performs tasks → returns output
Iteration 2: Claude continues from where it left off
Iteration 3: Claude finishes → outputs <promise>COMPLETE</promise>
Script: Detects completion tag → exits successfully
```

## Error Handling

- Uses `set -e` to exit on errors
- `|| true` on Claude execution prevents script termination if Claude fails
- Checks for file existence before operations
- Validates JSON parsing with fallback to empty string

## Key Features

✅ **Automatic archiving** when switching branches/tasks  
✅ **Progress tracking** with timestamped logs  
✅ **Iteration limiting** to prevent infinite loops  
✅ **Graceful completion** detection  
✅ **Error resilience** with fallback handling
