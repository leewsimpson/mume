---
description: Start frontend and backend services with logging
agent: general
---

# Start Services: Frontend & Backend

This command kills any existing services and starts both the frontend and backend with logging to files.

## Workflow

### Step 1: Kill Existing Services

Kill any processes currently running on the service ports:

```bash
# Kill backend (port 3000) and frontend (port 5173)
node scripts/kill-ports.js 3000 5173
```

### Step 2: Start Backend Service

Start the backend API server with logging:

```bash
# Start backend in background with logging
cd apps/api && npm run dev > ../../logs/backend.log 2>&1 &
echo "Backend started on port 3000"
echo "Backend logs: logs/backend.log"
```

### Step 3: Start Frontend Service

Start the frontend development server with logging:

```bash
# Start frontend in background with logging
cd apps/frontend && npm run dev > ../../logs/frontend.log 2>&1 &
echo "Frontend started on port 5173"
echo "Frontend logs: logs/frontend.log"
```

### Step 4: Display Monitoring Instructions

Show the user where to find the logs:

```
Services started successfully!

Monitor logs with:
  Backend:  tail -f logs/backend.log
  Frontend: tail -f logs/frontend.log
  Both:     tail -f logs/*.log

Stop services with:
  node scripts/kill-ports.js 3000 5173

Access the application at:
  http://localhost:5173
```

## Notes

- Logs are written to the `logs/` directory in the project root
- The logs directory will be created automatically if it doesn't exist
- Services run in the background; use `kill-ports.js` to stop them
- Check logs if services fail to start properly
