---
description: Fix a bug using structured debugging workflow
agent: build
---

# Bug Fix: $ARGUMENTS

You are fixing the following bug:
**$ARGUMENTS**

## Mandatory Workflow

Follow these steps in order. Do NOT skip steps.

### Step 1: Ensure Logging Observability

Before investigating, verify that logging is adequate to diagnose the issue:

1. **Check relevant code paths** for proper logging:
   - Use `req.logger` in route handlers (not `console.log`)
   - Ensure error handlers log the full error object with context
   - Verify log levels are appropriate (error/warn/info/debug)
   - Check that correlation IDs and contextual properties are included

2. **Add logging if missing**:
   - Add `info()` logs at key decision points
   - Add `error()` logs with full error objects and context
   - Add `debug()` logs for detailed diagnostic info
   - Include: userId, operation name, entity IDs, timestamps

3. **Reproduce the issue** and examine logs:
   - Run the failing scenario
   - Collect relevant log output
   - Identify the root cause from log evidence

**Example logging pattern:**
```typescript
req.logger?.info('Operation started', {
  userId: req.user?.id,
  operation: 'operation_name',
  entityId: id
});

req.logger?.error('Operation failed', error, {
  userId: req.user?.id,
  operation: 'operation_name',
  entityId: id
});
```

### Step 2: Analyse Test Coverage Gap

Investigate why existing tests did not catch this bug:

1. **Review related test files** in `tests/e2e/specs/` or `apps/*/tests/`
2. **Identify the coverage gap**:
   - Is the scenario tested at all?
   - Is the test checking the wrong thing?
   - Is the test data insufficient?
   - Are edge cases missing?
3. **Check requirements** in `doco/requirements/` to verify expected behaviour

### Step 3: Enhance Tests to Catch the Problem

Create or update tests BEFORE fixing the issue:

1. **Write a failing test** that reproduces the bug:
   - Name it descriptively (e.g., `should-reject-invalid-input.test.ts`)
   - Include clear test description explaining the scenario
   - Reference the user story/requirement if applicable

2. **For E2E tests** (preferred for user-facing issues):
   ```bash
   # Run specific test file
   cd tests && npx playwright test e2e/specs/your-test.test.ts
   ```

3. **For unit/integration tests**:
   ```bash
   # In the relevant app directory
   cd apps/api && npm test -- --testPathPattern="your-test"
   ```

4. **Verify the test FAILS** before proceeding (confirming it catches the bug)

### Step 4: Fix the Issue and Verify

Now fix the underlying problem:

1. **Implement the fix** in the relevant source files
2. **Run the enhanced test** to verify it now passes:
   ```bash
   # E2E tests
   cd tests && npm test

   # Or specific test
   cd tests && npx playwright test e2e/specs/your-test.test.ts
   ```

3. **Run the full test suite** to ensure no regressions:
   ```bash
   cd tests && npm test
   ```

4. **Check for side effects**:
   - Review related functionality
   - Verify error handling is robust
   - Confirm logging captures the scenario

## Checklist Before Completion

- [ ] Logging is adequate to diagnose similar issues in future
- [ ] Test(s) added/updated that would have caught this bug
- [ ] Test fails without the fix, passes with the fix
- [ ] Full test suite passes
- [ ] No regressions introduced

## If Requirements Need Updating

- **Minor change** (new/changed acceptance criteria): Update requirements in `doco/requirements/` and proceed
- **Major change** (new story): Add to `doco/requirements/requirements.json`, inform user, and STOP

## References

- Testing guidelines: `AGENTS.md` (Testing Principles section)
- Logging guidelines: `AGENTS.md` (Logging Principles section)
- E2E test docs: `tests/README.md`
- Requirements: `doco/requirements/requirements.md`
