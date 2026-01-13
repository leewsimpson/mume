# CI/CD Setup Summary

## ✅ Completed Tasks

### 1. GitHub Actions Workflows Created

Three new workflow files have been created in `.github/workflows/`:

#### **infra-deploy-v2.yml** - Infrastructure Deployment
- Deploys Azure infrastructure using Bicep templates
- Supports dev and prod environments
- Triggers:
  - Manual via workflow_dispatch
  - Automatic on push to main when infra files change
- Uses: `AZURE_CREDENTIALS` secret

#### **api-deploy-v2.yml** - API Backend Deployment
- Builds Docker image with `--platform linux/amd64` flag (critical for Azure Container Apps)
- Pushes to Azure Container Registry
- Deploys to Container Apps
- Includes health check verification
- Triggers:
  - Manual via workflow_dispatch  
  - Automatic on push to main when API files change
- Uses: `AZURE_CREDENTIALS`, `SESSION_SECRET`, `TOKEN_ENCRYPTION_KEY`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`

#### **frontend-deploy-v2.yml** - Frontend Deployment (NEW ✨)
- Builds React/Vite frontend with production optimizations
- Deploys to Azure Static Web Apps
- Automatically injects API URL at build time
- Triggers:
  - Manual via workflow_dispatch
  - Automatic on push to main when frontend files change
- Uses: `AZURE_CREDENTIALS`, `AZURE_STATIC_WEB_APPS_API_TOKEN_DEV`, `AZURE_STATIC_WEB_APPS_API_TOKEN_PROD`

### 2. Workflow Features

All workflows include:
- ✅ **Environment-based deployment** (dev/prod)
- ✅ **Automatic trigger on file changes**
- ✅ **Manual workflow dispatch**
- ✅ **GitHub Environments integration**
- ✅ **Proper secret management**
- ✅ **Health checks and verification**
- ✅ **Clear deployment status messages**

### 3. Architecture Improvements

- **No OIDC complexity**: Uses traditional service principal with client secret (works without Azure AD admin rights)
- **Platform-specific builds**: Docker images built for `linux/amd64` to match Azure Container Apps
- **Dynamic configuration**: API URL injected into frontend at build time
- **Proper dependencies**: Frontend deployment gets API URL from deployed Container App

## 🔧 What You Need To Do

### Step 1: Create Service Principal (Azure CLI)

Run this command:

```bash
az ad sp create-for-rbac \
  --name "github-mume-cicd" \
  --role contributor \
  --scopes /subscriptions/a8c56054-d1fc-4874-8d04-29f2b3f8d937/resourceGroups/rg-mume \
  --sdk-auth
```

**Important:** Save the ENTIRE JSON output - you'll paste it directly into GitHub.

### Step 2: Configure GitHub Secrets

Go to: https://github.com/leewsimpson/mume/settings/secrets/actions

Click **"New repository secret"** for each:

| Secret Name | Value |
|------------|-------|
| `AZURE_CREDENTIALS` | Paste the ENTIRE JSON from Step 1 |
| `SESSION_SECRET` | `vkukUfwmY2vSZgTfJCgkBcgDKDNI45ZCL19LkVtYD+k=` |
| `TOKEN_ENCRYPTION_KEY` | `e4579cb83f08c81d504539c64a2e29578492453e5cc65de2b560f52d3f1624e7` |
| `GITHUB_CLIENT_ID` | `Ov23li4FLaQdqWPlsg5o` |
| `GITHUB_CLIENT_SECRET` | `76cd492ad9a7f3875b4edc404c788ef61a9799ac` |
| `AZURE_STATIC_WEB_APPS_API_TOKEN_DEV` | `6807c78f94a47791f9845c11608fee0e77a5377ccd71f2b207e423465e267e7d02-562a86dc-ec67-43e9-a0f7-4a3a595d85f400f04300747a000f` |

### Step 3: Create GitHub Environments

Go to: https://github.com/leewsimpson/mume/settings/environments

#### Create "dev" environment:
1. Click "New environment"
2. Name: `dev`
3. Click "Configure environment"
4. No protection rules needed
5. Click "Save protection rules"

#### Create "production" environment:
1. Click "New environment"
2. Name: `production`
3. Click "Configure environment"
4. (Optional but recommended) Enable "Required reviewers" and add yourself
5. Click "Save protection rules"

### Step 4: Test the Workflows

#### Option A: Manual Trigger (Recommended for First Test)

1. Go to: https://github.com/leewsimpson/mume/actions
2. Select "Deploy API" from the left sidebar
3. Click "Run workflow" button
4. Select "dev" from the dropdown
5. Click "Run workflow"
6. Watch the workflow execute

Expected result:
- Docker image builds successfully with AMD64 platform
- Image pushes to Azure Container Registry
- Container App updates with new image
- Health check passes
- API URL displayed: `https://mume-api-dev.delightfulground-f44c4ea7.eastus.azurecontainerapps.io`

#### Option B: Test with Code Push

Make a small change to trigger automatic deployment:

```bash
# Add a comment to trigger deployment
echo "// Test deployment" >> apps/api/src/server.ts
git add apps/api/src/server.ts
git commit -m "test: trigger API deployment"
git push origin main
```

Watch the Actions tab to see the workflow trigger automatically.

### Step 5: Test Frontend Deployment

After API is deployed:

1. Go to: https://github.com/leewsimpson/mume/actions
2. Select "Deploy Frontend"
3. Click "Run workflow"
4. Select "dev"
5. Click "Run workflow"

Expected result:
- Frontend builds with Vite
- API URL injected as `VITE_API_URL` environment variable
- Deploys to Static Web App
- Frontend URL displayed: `https://green-bush-0747a000f.2.azurestaticapps.net`

### Step 6: Update GitHub OAuth App

After successful deployment, update your GitHub OAuth app:

1. Go to: https://github.com/settings/developers
2. Find your OAuth app
3. Update Authorization callback URL to:
   ```
   https://mume-api-dev.delightfulground-f44c4ea7.eastus.azurecontainerapps.io/auth/github/callback
   ```
4. Click "Update application"

## 📋 Verification Checklist

After all workflows succeed, verify:

- [ ] API health endpoint returns: `{"status":"ok","dependencies":{"redis":"connected"}}`
- [ ] Frontend loads at Static Web App URL
- [ ] Frontend can connect to API (check browser console for errors)
- [ ] GitHub OAuth login works end-to-end

Check these URLs:
- API Health: https://mume-api-dev.delightfulground-f44c4ea7.eastus.azurecontainerapps.io/health
- Frontend: https://green-bush-0747a000f.2.azurestaticapps.net

## 🚀 Next Steps After CI/CD Working

### 1. Remove Old Workflows
Once the `-v2` workflows are tested and working:

```bash
rm .github/workflows/infra-deploy.yml
rm .github/workflows/api-deploy.yml
rm .github/workflows/frontend-deploy.yml

# Rename new workflows to remove -v2 suffix
mv .github/workflows/infra-deploy-v2.yml .github/workflows/infra-deploy.yml
mv .github/workflows/api-deploy-v2.yml .github/workflows/api-deploy.yml
mv .github/workflows/frontend-deploy-v2.yml .github/workflows/frontend-deploy.yml
```

### 2. Remove PostgreSQL Dependencies
Once Redis storage is confirmed working:

- Remove PostgreSQL client from `apps/api/package.json`
- Remove migration files in `apps/api/src/db/migrations/`
- Remove `apps/api/src/db/migrate.ts`
- Remove database-related code from `apps/api/src/server.ts`

### 3. Set Up Production Environment
When ready for production:

1. Run infrastructure deployment for prod:
   ```bash
   # In Azure Portal or via CLI
   az deployment group create \
     --resource-group rg-mume \
     --template-file infra/main.bicep \
     --parameters infra/parameters/main.prod.bicepparam
   ```

2. Get production Static Web App token:
   ```bash
   az staticwebapp secrets list \
     --name mume-frontend \
     --resource-group rg-mume \
     --query 'properties.apiKey' -o tsv
   ```

3. Add `AZURE_STATIC_WEB_APPS_API_TOKEN_PROD` secret to GitHub

4. Deploy to production using workflow dispatch

## 🐛 Troubleshooting

### Workflow fails with "exec format error"
**Cause:** Docker image built on wrong architecture  
**Solution:** Ensure `platforms: linux/amd64` is set in Docker build step

### "AZURE_CREDENTIALS not found"
**Cause:** Secret not configured in GitHub  
**Solution:** Complete Step 2 above, ensure JSON is valid

### Static Web App deployment fails
**Cause:** Missing deployment token  
**Solution:** Add `AZURE_STATIC_WEB_APPS_API_TOKEN_DEV` secret from Step 2

### Health check returns 503
**Cause:** Redis not connected  
**Solution:** Check Container App logs: `az containerapp logs show --name mume-api-dev --resource-group rg-mume --tail 50`

### Frontend can't reach API
**Cause:** CORS or wrong API URL  
**Solution:** Check browser console, verify `VITE_API_URL` in build logs

## 📁 File Reference

All workflow files are in `.github/workflows/`:
- `infra-deploy-v2.yml` - Infrastructure
- `api-deploy-v2.yml` - Backend API
- `frontend-deploy-v2.yml` - Frontend SPA

Setup documentation:
- `TEMP/github-actions-setup.md` - Detailed setup instructions
- `TEMP/cicd-setup-summary.md` - This file
- `DEPLOYMENT.md` - Infrastructure and architecture overview
