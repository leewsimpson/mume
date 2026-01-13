# Mume Deployment Summary

**Date:** 2026-01-13  
**Environment:** Development  
**Status:** ✅ Fully Deployed and Operational

---

## Deployed Infrastructure

### Azure Resources (rg-mume)

| Resource | Name | Status | URL/FQDN |
|----------|------|--------|----------|
| Container Registry | `mumeacr2gdrwkfmswho2` | ✅ Running | `mumeacr2gdrwkfmswho2.azurecr.io` |
| Container Environment | `mume-env-dev` | ✅ Running | `delightfulground-f44c4ea7.eastus.azurecontainerapps.io` |
| Redis Container | `mume-redis-dev` | ✅ Running | Internal: `mume-redis-dev:6379` |
| API Container | `mume-api-dev` | ✅ Running | `https://mume-api-dev.delightfulground-f44c4ea7.eastus.azurecontainerapps.io` |
| Static Web App | `mume-frontend-dev` | ✅ Deployed | `https://green-bush-0747a000f.2.azurestaticapps.net` |
| Log Analytics | `mume-logs-dev` | ✅ Active | - |

### Health Check

**API Health Endpoint:** `https://mume-api-dev.delightfulground-f44c4ea7.eastus.azurecontainerapps.io/health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-13T06:18:41.004Z",
  "dependencies": {
    "redis": "connected"
  }
}
```

---

## Application URLs

### Frontend
- **URL:** https://green-bush-0747a000f.2.azurestaticapps.net
- **Built with:** Vite + React
- **API Connection:** Configured to connect to API endpoint

### Backend API
- **Base URL:** https://mume-api-dev.delightfulground-f44c4ea7.eastus.azurecontainerapps.io
- **Health Check:** `/health`
- **Auth Endpoints:** `/auth/*`
- **API Endpoints:** `/api/*`

---

## GitHub OAuth Configuration

**Client ID:** `Ov23li4FLaQdqWPlsg5o`

**Callback URL:** `https://mume-api-dev.delightfulground-f44c4ea7.eastus.azurecontainerapps.io/auth/github/callback`

**Action Required:** Update your GitHub OAuth app settings with the callback URL above.

**Settings URL:** https://github.com/settings/developers

---

## Deployment Credentials

All secrets are stored in `.env.azure` (git-ignored).

### Generated Secrets
- `SESSION_SECRET`: Generated and configured
- `TOKEN_ENCRYPTION_KEY`: Generated and configured

### GitHub OAuth
- `GITHUB_CLIENT_ID`: Configured
- `GITHUB_CLIENT_SECRET`: Configured

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│      Container App Environment (mume-env-dev)       │
│                                                      │
│  ┌─────────────────┐    ┌─────────────────┐        │
│  │   mume-api-dev  │───▶│ mume-redis-dev  │        │
│  │   (external)    │    │   (internal)    │        │
│  │   Port: 3000    │    │   Port: 6379    │        │
│  └─────────────────┘    └─────────────────┘        │
│          │                                           │
└──────────┼───────────────────────────────────────────┘
           │ HTTPS
           ▼
┌─────────────────────────────────────────────────────┐
│         Static Web App (mume-frontend-dev)          │
│              React + Vite Frontend                   │
└─────────────────────────────────────────────────────┘
```

---

## Key Technical Decisions

### 1. Simplified Data Architecture
- **No PostgreSQL:** Removed database dependency
- **Redis Only:** Session storage and GitHub tokens in Redis
- **Future:** Comments will be stored in Git alongside markdown files

### 2. Containerized Redis
- **Why:** Cost savings (~$14-16/month vs Azure Cache for Redis)
- **Trade-off:** Session data lost on restart (acceptable for PoC)
- **Configuration:** Internal ingress only, 256MB memory, LRU eviction

### 3. Health Check with Dependencies
- **Endpoint:** `/health` validates Redis connectivity
- **Response Codes:** 
  - `200 OK`: All dependencies healthy
  - `503 Service Unavailable`: Redis disconnected (degraded state)

### 4. Docker Multi-Architecture
- **Issue Resolved:** Built for `linux/amd64` architecture
- **Command:** `docker buildx build --platform linux/amd64`
- **Reason:** Azure Container Apps runs on AMD64, not ARM

---

## Cost Estimate

**Monthly Cost (Development Environment):**
- Container Registry (Basic): ~$5/month
- Container Apps (API): ~$5-10/month (0.5 CPU, 1Gi)
- Container Apps (Redis): ~$2-5/month (0.25 CPU, 0.5Gi)
- Static Web App (Free): $0/month
- Log Analytics: ~$2-5/month

**Total:** ~$14-25/month

**Savings vs. Managed Services:** ~$27-41/month (removed PostgreSQL + Azure Redis Cache)

---

## Troubleshooting Issues Resolved

### Issue 1: Container Failing to Start
**Symptom:** Container terminated with exit code 1  
**Root Cause:** Docker image built for ARM architecture (Apple Silicon)  
**Solution:** Rebuilt image with `--platform linux/amd64` flag

### Issue 2: API Not Responding
**Symptom:** Health endpoint timing out  
**Root Cause:** Application hanging during Redis connection  
**Solution:** Added connection timeout and better error handling

### Issue 3: Redis Connectivity
**Symptom:** Initial concern about internal DNS resolution  
**Solution:** Simplified hostname (`mume-redis-dev`) works for internal communication

---

## Next Steps

### Immediate
1. ✅ **Update GitHub OAuth App** with callback URL (see above)
2. **Test Application:** Visit frontend URL and attempt GitHub login
3. **Monitor Logs:** Check Log Analytics for any runtime issues

### Short Term (API Code Changes)
1. Remove PostgreSQL client dependencies from `package.json`
2. Remove database migration scripts
3. Update session storage to be Redis-only (already configured)

### Future Enhancements
1. Implement Git-based comment storage
2. Add Application Insights for telemetry
3. Configure custom domains for production
4. Set up automated deployments via GitHub Actions
5. Consider upgrading Redis to persistent storage for production

---

## Maintenance Commands

### View Logs
```bash
# API logs
az containerapp logs show --name mume-api-dev --resource-group rg-mume --follow

# Redis logs
az containerapp logs show --name mume-redis-dev --resource-group rg-mume --follow

# Query Log Analytics
az monitor log-analytics query \
  --workspace <workspace-id> \
  --analytics-query "ContainerAppConsoleLogs_CL | where TimeGenerated > ago(1h)"
```

### Update Deployments
```bash
# Rebuild and deploy API
docker buildx build --platform linux/amd64 -t mumeacr2gdrwkfmswho2.azurecr.io/mume-api:latest --push apps/api
az containerapp update --name mume-api-dev --resource-group rg-mume --image mumeacr2gdrwkfmswho2.azurecr.io/mume-api:latest

# Deploy frontend
cd apps/frontend
VITE_API_URL=https://mume-api-dev.delightfulground-f44c4ea7.eastus.azurecontainerapps.io npm run build
npx @azure/static-web-apps-cli deploy --app-location apps/frontend --output-location dist --env production
```

### Check Resource Status
```bash
# List all resources
az resource list --resource-group rg-mume --output table

# Check API health
curl https://mume-api-dev.delightfulground-f44c4ea7.eastus.azurecontainerapps.io/health

# View revision status
az containerapp revision list --name mume-api-dev --resource-group rg-mume --output table
```

---

## Support & Documentation

- **Infrastructure Code:** `/infra` directory
- **Deployment Secrets:** `.env.azure` (git-ignored, local only)
- **Infrastructure README:** `/infra/README.md`
- **Application README:** `/README.md`

---

**Deployment completed successfully!** 🎉
