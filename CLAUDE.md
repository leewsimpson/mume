## Orientation
* Read ./README.md for overview, and the README.md in each subsequent folder as needed.
* Always follow `doco/repository-guidelines.md`
* Follow Tech design in `doco/design/hld.md`

## Running the Application
* **Backend location**: `apps/api` (not `backend`)
* **Backend port**: 3000 (WebSocket at ws://localhost:3000)
* **Frontend location**: `apps/frontend` (not `frontend`)
* **Frontend port**: 5173
* **Start backend**: `cd apps/api && npm start` (or `npm run dev` for development with hot-reload)
* **Start frontend**: `cd apps/frontend && npm run dev`
* **Known warnings**: Yjs may show a warning about being imported multiple times - this is a known development issue and doesn't affect functionality

## Core Principles
* We are not in production yet. so dont worry about things such as breaking production data / infrastructure.  Migration scripts for existing data. Currently deployed data etc.
* Keep things simple.
* Don't implement fallbacks - that adds unnecessary complexity.
* *Never* fail silently, always notify.
* **Make code easy to debug** Log all key interactions and events, and never swallow error details. Use appropriate log levels (error, warn, info, debug) and include contextual information (user IDs, request IDs, timestamps).
* **NEVER** duplicate documentation across multiple files if you can help it - rather reference the other files.
* When creating temporary files, always use the .\TEMP folder and remove these files when complete
* Do not create summary documents at the end.
* Use British english and grammar.
* Use sub-agents to improve performance and reduce context usage. Ideal for: complex searches across multiple files, research tasks, isolated feature implementations, or when current context is becoming large.
* Always use Context7 MCP when I need library/API documentation, code generation, setup or configuration steps without me having to explicitly ask.
* When deleting, moving or renaming Markdown documents, always check for references and update them.

## Testing Principles
1. **E2E First** - Start with broad end-to-end tests that cover complete user flows. Fewer tests, higher coverage.
2. **Aligned to Requirements** - Tests trace to user stories and acceptance criteria in `doco/requirements`. No testing without a requirement. If a requirement is missing, add the story or alert the user.
3. **Mock Only Uncontrollable** - Use real databases and services in Docker where possible. Don't mock what you can control - like the data content.
4. **Seed Data with Reset** - Reset database to known state before each test if needed.
5. **Unit Tests Later** - Add focused unit/integration tests only after E2E tests are in place, if needed.
6. **Minimise Duplication** - Avoid duplicating test logic. Use shared test utilities and helpers. Each test should verify one distinct scenario.
7. **Test Naming** - Name test files descriptively (e.g., `upload-flow.e2e.test.ts`). Use clear test descriptions that explain the scenario and expected outcome.
8. **Update Seed Data** - Update seed data when adding new test scenarios to ensure consistent test environments.
9. **Keep Test Files Organised** - Group related tests together. Maintain parallel structure with source code where appropriate.

## Logging Principles
1. **Use Structured Logging** - Always use `req.logger` in route handlers instead of `console.log`. This provides correlation IDs and contextual properties.
2. **Include Context** - Always add relevant properties: `userId`, `operation`, entity IDs, etc. This makes debugging significantly easier.
3. **Error Logging** - Use `req.logger.error(message, error, properties)` for errors. Include the Error object and contextual properties.
4. **Appropriate Levels**:
   - `info()` - Normal operations, successful completions
   - `warn()` - Degraded state, recoverable errors, CORS blocks
   - `error()` - Failures, exceptions, data loss
   - `debug()` - Development-only diagnostic info
5. **Custom Metrics** - Track business events with `req.logger.metric(name, value, properties)`. Example: operation duration, request counts.
6. **Never Log Sensitive Data** - Never log passwords, API keys, credit card numbers, or other PII.
7. **Meaningful Messages** - Use clear, searchable messages. Good: "Failed to save user record". Bad: "Error occurred".
8. **Fallback Behaviour** - Logger falls back to console.log in development when Application Insights is not configured.

**Example Usage**:
```typescript
// In route handler
req.logger?.info('Resource created successfully', {
  userId: req.user.id,
  resourceId: result.id,
  operation: 'create_resource'
});

// Error logging
req.logger?.error('Failed to process request', error, {
  userId: req.user.id,
  resourceId,
  operation: 'process_request'
});

// Custom metric
req.logger?.metric('operation_duration_ms', duration, {
  operation: 'process_request'
});
```

## Documentation Principles
* Keep documentation at a high level. Do not include detailed implementation details - this can be derived from the source code.
* **Always** keep documentation up to date with the current implementation.
* **Review Checklist** - Before marking complete: verify all diagrams reflect current state, ensure cross-references are valid, check that terminology is consistent.
* Recommend the simpler, easier to maintain and easier to debug options.
* Use latest versions of libraries, and use the [research](doco/research) folder to store latest SDK and user guides from the internet.

## Python
* **NEVER** install packages directly into system. ALWAYS use the environment.
* **Always activate the existing environment**
* **Never create a new Python environment** - Use the existing workspace environment.

## Refactoring and Restructuring
When moving directories or restructuring the codebase:
* **Check all relative paths** - Package.json scripts, import paths, config files
* **Update compiled code** - Rebuild TypeScript/compiled code after path changes
* **Count directory levels carefully** - When using `../..`, verify the actual path resolution
* **Search comprehensively** - Use grep/search to find ALL references to old paths
* **Test thoroughly** - Run all test suites after restructuring to verify nothing broke
* **Update documentation** - README files, design docs, and workflow files
* **Common gotchas**:
  - Migration scripts with hardcoded paths
  - Test seed data file paths
  - Playwright/test runner configurations
  - GitHub workflow file paths
  - Infrastructure-as-code templates (Bicep, Terraform)
