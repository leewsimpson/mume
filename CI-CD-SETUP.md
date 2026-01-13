# GitHub Actions CI/CD Setup

## What's Automated

| Component | What Happens | Trigger |
|-----------|--------------|---------|
| **Frontend** | ✅ Builds and deploys to Static Web App | Push to main or manual |
| **API** | ✅ Builds Docker image and pushes to ACR | Push to main or manual |
| **API** | ⚠️ Manual: Deploy Container App update | You run `az` command |

---

## Quick Setup

### ✅ Already Configured!

The following have been automatically set up using `gh` CLI:

**GitHub Secrets:**
- ✅ `ACR_USERNAME` - Azure Container Registry username
- ✅ `ACR_PASSWORD` - Azure Container Registry password
- ✅ `AZURE_STATIC_WEB_APPS_API_TOKEN_DEV` - Static Web App deployment token

**GitHub Environment:**
- ✅ `dev` - Development environment created

You can verify these at:
- Secrets: https://github.com/leewsimpson/mume/settings/secrets/actions
- Environments: https://github.com/leewsimpson/mume/settings/environments

### Test It!

**Frontend (Fully Automated):**
1. Go to https://github.com/leewsimpson/mume/actions
2. Click "Deploy Frontend"
3. Click "Run workflow" → select "dev" → "Run workflow"
4. Watch it deploy! (2-3 minutes)

**API (Build Only):**
1. Go to https://github.com/leewsimpson/mume/actions
2. Click "Deploy API" (actually builds the image)
3. Click "Run workflow"
4. Image builds and pushes to ACR
5. **Then manually deploy:**
   ```bash
   az containerapp update \
     --name mume-api-dev \
     --resource-group rg-mume \
     --image mumeacr2gdrwkfmswho2.azurecr.io/mume-api:latest
   ```

---

## How It Works

### Frontend Workflow (`.github/workflows/frontend-deploy.yml`)
```
On push to main (frontend files changed):
├─ Checkout code
├─ Build React app with Vite (API URL injected)
├─ Deploy to Azure Static Web App using deployment token
└─ ✅ Live at https://green-bush-0747a000f.2.azurestaticapps.net
```

### API Workflow (`.github/workflows/api-deploy.yml`)
```
On push to main (API files changed):
├─ Checkout code
├─ Setup Docker Buildx
├─ Login to ACR using admin credentials
├─ Build image for linux/amd64 platform
├─ Push to ACR with tags: latest + timestamp
└─ ⚠️ YOU manually run: az containerapp update...
```

---

## Why API Isn't Fully Automated

To update the Container App, we need to run `az containerapp update`, which requires authentication to Azure. The options are:

1. **Service Principal** (requires Azure AD admin) - ❌ You don't have permissions
2. **Personal Credentials** (security risk) - ❌ Not recommended
3. **Manual** (30 seconds of your time) - ✅ Current approach

**The workflow still saves you time** by:
- Building the Docker image on GitHub's servers (not your laptop)
- Ensuring AMD64 platform (so it works in Azure)
- Tagging images properly
- Using build cache to speed up builds

---

## Automatic Deployments

Once secrets are configured:

**Frontend:**  
Every push to main that changes `apps/frontend/**` automatically deploys.

**API:**  
Every push to main that changes `apps/api/**` automatically builds and pushes the Docker image. You finish with one command:

```bash
az containerapp update --name mume-api-dev --resource-group rg-mume --image mumeacr2gdrwkfmswho2.azurecr.io/mume-api:latest
```

---

## Verification

### Check Frontend
```bash
curl https://green-bush-0747a000f.2.azurestaticapps.net
```

### Check API
```bash
curl https://mume-api-dev.delightfulground-f44c4ea7.eastus.azurecontainerapps.io/health
```

Expected response:
```json
{"status":"ok","dependencies":{"redis":"connected"}}
```

---

## Future: Full Automation

When you get a service principal from your Azure AD administrator, add one more secret:

```
Name: AZURE_CREDENTIALS
Value: <JSON from az ad sp create-for-rbac --sdk-auth>
```

Then the API workflow can be updated to automatically deploy Container Apps as well.

For now, the semi-automated approach works great and still saves significant time!

---

## Troubleshooting

**"Secret not found" error:**
- Check secret names match exactly (case-sensitive)
- Verify all 3 secrets are added

**Docker build fails:**
- Check ACR credentials are correct
- Verify ACR admin account is enabled

**Frontend deployment fails:**
- Check Static Web App token is correct
- Verify it's the dev token, not prod

**API health check fails after manual deploy:**
- Wait 30-60 seconds for container to start
- Check logs: `az containerapp logs show --name mume-api-dev --resource-group rg-mume --follow`
