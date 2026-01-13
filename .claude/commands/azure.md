# Azure Management Command

Handle Azure-related tasks including viewing logs, deployment status, and executing Azure CLI commands.

## Arguments
$ARGUMENTS - Optional Azure task (e.g., "logs", "status", "deploy api", "deploy frontend")

## Behavior

### 1. If no arguments or "status" - Show deployment overview:
- List all Azure resources in the resource group (rg-mume)
- Show current Container App revisions and status
- Display Static Web App details
- Show Log Analytics Workspace info
- Display current environment variables for API

### 2. If "logs" or "logs api" - Show API logs:
- Display last 50 console logs from mume-api-dev Container App
- Include timestamp and log type
- Highlight any errors or warnings

### 3. If "logs frontend" - Show frontend deployment logs:
- Show recent GitHub Actions workflow runs for Frontend deployment
- Display any build or deployment errors

### 4. If "deploy api" - Deploy latest API image:
- Get the latest image tag from GitHub Actions
- Update Container App with new image
- Show deployment progress
- Display new revision name and status

### 5. If "deploy frontend" - Redeploy frontend:
- Show information about how to trigger frontend deployment (push to main)
- Display current frontend deployment status

### 6. If command starts with "az " - Execute Azure CLI command:
- Run the provided az command directly
- Display output
- Example: `/azure az containerapp list --resource-group rg-mume`

### 7. If "help" - Show available commands and usage examples

## Azure Resources Reference

**Resource Group:** rg-mume

**Container Apps:**
- mume-api-dev (API Backend)
  - Image: mumeacr2gdrwkfmswho2.azurecr.io/mume-api:latest
  - Port: 3000
  - FQDN: mume-api-dev.delightfulground-f44c4ea7.eastus.azurecontainerapps.io
  
- mume-redis-dev (Redis Cache)
  - Internal: mume-redis-dev.internal.delightfulground-f44c4ea7.eastus.azurecontainerapps.io
  - Port: 6379

**Static Web App:**
- mume-frontend-dev
  - URL: https://green-bush-0747a000f.2.azurestaticapps.net
  - Tier: Free

**Log Analytics:**
- mume-logs-dev
  - Used by Container Apps for logging

**Container Registry:**
- mumeacr2gdrwkfmswho2.azurecr.io

## Useful Commands Examples

```bash
# View API logs
az containerapp logs show --name mume-api-dev --resource-group rg-mume --type console --tail 50

# View system events
az containerapp logs show --name mume-api-dev --resource-group rg-mume --type system --tail 20

# List revisions
az containerapp revision list --name mume-api-dev --resource-group rg-mume

# Deploy new API image
az containerapp update --name mume-api-dev --resource-group rg-mume --image mumeacr2gdrwkfmswho2.azurecr.io/mume-api:latest

# Restart API
az containerapp revision restart --name mume-api-dev --resource-group rg-mume --revision <revision-name>

# Check health endpoint
curl https://mume-api-dev.delightfulground-f44c4ea7.eastus.azurecontainerapps.io/health

# View GitHub Actions runs
gh run list --limit 5

# Watch a workflow run
gh run watch <run-id>
```

## Important Notes

- Always check GitHub Actions for latest image tags before deploying
- Container Apps may take 30-60 seconds to fully restart after deployment
- Redis connections may show temporary errors during API restart (this is normal)
- Frontend deploys automatically via GitHub Actions when changes are pushed to apps/frontend
- Log Analytics has 30-day retention by default
- Session cookies use sameSite: 'none' for cross-domain compatibility

## Environment Variables

The following environment variables are configured in the API Container App:
- NODE_ENV=production
- PORT=3000
- REDIS_URL=redis://mume-redis-dev:6379
- FRONTEND_URL=https://green-bush-0747a000f.2.azurestaticapps.net
- SESSION_SECRET (secret)
- TOKEN_ENCRYPTION_KEY (secret)
- GITHUB_CLIENT_ID (secret)
- GITHUB_CLIENT_SECRET (secret)
- GITHUB_CALLBACK_URL=https://mume-api-dev.delightfulground-f44c4ea7.eastus.azurecontainerapps.io/auth/github/callback
