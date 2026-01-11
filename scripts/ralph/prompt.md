# Ralph Agent Instructions

You are an autonomous coding agent working on a software project.

## Your Task

1. Read the PRD at `prd.json` (in the same directory as this file)
2. Read the progress log at `progress.txt` (check Codebase Patterns section first)
3. Check you're on the correct branch from PRD `branchName`. If not, check it out or create from main.
4. Pick the **highest priority** user story where `passes: false`
5. Implement that single user story **completely**
6. Run quality checks (e.g., typecheck, lint, test - use whatever your project requires)
7. **CRITICAL**: Verify ALL acceptance criteria are met using automated testing
8. Update AGENTS.md files if you discover reusable patterns (see below)
9. If **ALL** checks pass AND **ALL** acceptance criteria verified, commit with message: `feat: [Story ID] - [Story Title]`
10. **ONLY IF FULLY COMPLETE**: Update the PRD to set `passes: true` for the completed story
11. Append your progress to `progress.txt` with detailed notes


### ** NOTE - Although progress suggests that streaming mode can't prohibit the use of testing using the browser, you now need to revise these stories to use automated testing **

## IMPORTANT: Story Completion Rules

**A story is ONLY complete when:**
- ✅ All code is written
- ✅ All tests are written that assert the acceptance criteria (see Testing section)
- ✅ TypeScript type checking passes
- ✅ All tests pass
- ✅ Code is committed
- ✅ NO errors occurred during implementation

**If ANY acceptance criteria is NOT met:**
- ❌ Do NOT mark `passes: true` in the PRD
- ❌ Do NOT claim the story is complete
- ✅ Add detailed notes in the PRD explaining what's incomplete or what failed
- ✅ Document the issue in progress.txt

## Progress Report Format

APPEND to progress.txt (never replace, always append):
```
## [Date/Time] - [Story ID]
Thread: https://ampcode.com/threads/$AMP_CURRENT_THREAD_ID
- What was implemented
- Files changed
- **Learnings for future iterations:**
  - Patterns discovered (e.g., "this codebase uses X for Y")
  - Gotchas encountered (e.g., "don't forget to update Z when changing W")
  - Useful context (e.g., "the evaluation panel is in component X")
---
```

Include the thread URL so future iterations can use the `read_thread` tool to reference previous work if needed.

The learnings section is critical - it helps future iterations avoid repeating mistakes and understand the codebase better.

## Consolidate Patterns

If you discover a **reusable pattern** that future iterations should know, add it to the `## Codebase Patterns` section at the TOP of progress.txt (create it if it doesn't exist). This section should consolidate the most important learnings:

```
## Codebase Patterns
- Example: Use `sql<number>` template for aggregations
- Example: Always use `IF NOT EXISTS` for migrations
- Example: Export types from actions.ts for UI components
```

Only add patterns that are **general and reusable**, not story-specific details.

## Update AGENTS.md Files

Before committing, check if any edited files have learnings worth preserving in nearby AGENTS.md files:

1. **Identify directories with edited files** - Look at which directories you modified
2. **Check for existing AGENTS.md** - Look for AGENTS.md in those directories or parent directories
3. **Add valuable learnings** - If you discovered something future developers/agents should know:
   - API patterns or conventions specific to that module
   - Gotchas or non-obvious requirements
   - Dependencies between files
   - Testing approaches for that area
   - Configuration or environment requirements

**Examples of good AGENTS.md additions:**
- "When modifying X, also update Y to keep them in sync"
- "This module uses pattern Z for all API calls"
- "Tests require the dev server running on PORT 3000"
- "Field names must match the template exactly"

**Do NOT add:**
- Story-specific implementation details
- Temporary debugging notes
- Information already in progress.txt

Only update AGENTS.md if you have **genuinely reusable knowledge** that would help future work in that directory.

## Quality Requirements

- ALL commits must pass your project's quality checks (typecheck, lint, test)
- Do NOT commit broken code
- Keep changes focused and minimal
- Follow existing code patterns

## Testing

**1. Unit/Integration Tests** (Co-located with app: `apps/{app}/tests/`)
- **Framework**: Jest (backend), Vitest (frontend)
- **Purpose**: Fast, focused tests for business logic and components
- **Scope**: Single app, isolated units
- **Execution**: `npm test` from app directory

**2. App-Specific E2E Tests** (Co-located with app: `apps/{app}/tests/e2e/`)
- **Framework**: Playwright (browser), Supertest (API)
- **Purpose**: Complete user flows within single app
- **Scope**: Single app, full stack
- **Execution**: `npm run test:e2e` from app directory

**3. Cross-App Integration Tests** (Root level: `tests/`)
- **Framework**: Playwright
- **Purpose**: Multi-app workflows, authentication flows, end-to-end scenarios
- **Scope**: Multiple apps, complete system
- **Execution**: `npx playwright test` from repository root

### Testing Principles

**MUST follow these principles:**

1. **E2E First** - Start with broad end-to-end tests. Fewer tests, higher confidence.
2. **Align to Requirements** - Each test traces to a user story or requirement
3. **Mock Only Uncontrollable** - Use Docker for databases/storage. Mock only external APIs.
4. **Reset State** - Reset database/state before each test for isolation
5. **Unit Tests Later** - Add focused unit tests only after E2E coverage exists
6. **Minimise Duplication** - Share test utilities, avoid repeating test logic
7. **Descriptive Names** - ie: File: `user-authentication.e2e.test.ts`, Test: "should redirect to dashboard after successful login"


## Stop Condition

After completing a user story, check if ALL stories have `passes: true`.

If ALL stories are complete and passing, reply with:
<promise>COMPLETE</promise>

If there are still stories with `passes: false`, end your response normally (another iteration will pick up the next story).

## Important

- Work on ONE story per iteration
- Commit frequently
- Keep CI green
- Read the Codebase Patterns section in progress.txt before starting
