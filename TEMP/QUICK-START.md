# Quick Start: Enable CI/CD in 5 Minutes

## 1️⃣ Create Service Principal

⚠️ **Enterprise Azure Account** - You're in the Deloitte tenant and don't have permissions to create service principals.

**You have two options:**

### Option A: Request from Azure AD Admin (Recommended)
See `TEMP/ENTERPRISE-SETUP.md` for a ready-to-send email template requesting a service principal from your Azure AD administrator.

### Option B: Use Personal Azure (For Testing)
If you have a personal Azure subscription, you can test CI/CD there first:
```bash
az ad sp create-for-rbac \
  --name "github-mume-cicd" \
  --role contributor \
  --scopes /subscriptions/<your-subscription-id>/resourceGroups/<your-rg> \
  --sdk-auth
```

**Once you have the service principal JSON, continue to step 2.**

---

## 2️⃣ Add GitHub Secrets (3 minutes)

Go to: https://github.com/leewsimpson/mume/settings/secrets/actions

Click **"New repository secret"** for each:

```
Name: AZURE_CREDENTIALS
Value: <paste entire JSON from step 1>

Name: SESSION_SECRET
Value: vkukUfwmY2vSZgTfJCgkBcgDKDNI45ZCL19LkVtYD+k=

Name: TOKEN_ENCRYPTION_KEY
Value: e4579cb83f08c81d504539c64a2e29578492453e5cc65de2b560f52d3f1624e7

Name: GITHUB_CLIENT_ID
Value: Ov23li4FLaQdqWPlsg5o

Name: GITHUB_CLIENT_SECRET
Value: 76cd492ad9a7f3875b4edc404c788ef61a9799ac

Name: AZURE_STATIC_WEB_APPS_API_TOKEN_DEV
Value: 6807c78f94a47791f9845c11608fee0e77a5377ccd71f2b207e423465e267e7d02-562a86dc-ec67-43e9-a0f7-4a3a595d85f400f04300747a000f
```

---

## 3️⃣ Create GitHub Environments (1 minute)

Go to: https://github.com/leewsimpson/mume/settings/environments

1. Click **"New environment"**
2. Name: `dev`
3. Click **"Configure environment"**
4. Click **"Save protection rules"**

Repeat for `production` environment (optional: add yourself as required reviewer).

---

## 4️⃣ Test Deployment (1 minute)

Go to: https://github.com/leewsimpson/mume/actions

1. Click **"Deploy API"** (left sidebar)
2. Click **"Run workflow"** button (top right)
3. Select **"dev"** from dropdown
4. Click **"Run workflow"**

Watch it run! Should complete in ~3-5 minutes.

---

## 5️⃣ Verify It Worked (30 seconds)

Check health endpoint:
```bash
curl https://mume-api-dev.delightfulground-f44c4ea7.eastus.azurecontainerapps.io/health
```

Expected response:
```json
{"status":"ok","dependencies":{"redis":"connected"}}
```

---

## 🎉 Done!

Your CI/CD is now active. Every push to main will automatically deploy:
- API changes → `api-deploy-v2.yml` workflow
- Frontend changes → `frontend-deploy-v2.yml` workflow
- Infrastructure changes → `infra-deploy-v2.yml` workflow

---

## 🆘 Troubleshooting

### "Secret not found" error
- Go back to step 2, ensure all 6 secrets are added
- Secret names must match exactly (case-sensitive)

### Workflow not appearing in Actions tab
- Ensure workflows are in `.github/workflows/` directory
- Ensure workflows are on the `main` branch

### Build succeeds but deployment fails
- Check Azure CLI is authenticated in workflow (should be automatic with AZURE_CREDENTIALS)
- Check resource group `rg-mume` exists in subscription

### "Insufficient privileges" error creating service principal
- You're in an enterprise Azure tenant
- See `TEMP/ENTERPRISE-SETUP.md` for how to request from Azure AD admin
- Or use a personal Azure account for testing

### Still stuck?
See detailed docs:
- `TEMP/ENTERPRISE-SETUP.md` - Enterprise Azure setup (NEW)
- `TEMP/cicd-setup-summary.md` - Full setup guide
- `TEMP/github-actions-setup.md` - Step-by-step instructions
- `DEPLOYMENT.md` - Architecture and infrastructure details
