# GitHub Actions Setup Guide

## Step 1: Create Service Principal for GitHub Actions

Run this command to create a service principal with OIDC:

```bash
az ad sp create-for-rbac \
  --name "github-mume-cicd" \
  --role contributor \
  --scopes /subscriptions/a8c56054-d1fc-4874-8d04-29f2b3f8d937/resourceGroups/rg-mume \
  --sdk-auth
```

**Save the output** - you'll need it for GitHub secrets.

The output will look like:
```json
{
  "clientId": "...",
  "clientSecret": "...",
  "subscriptionId": "...",
  "tenantId": "...",
  "activeDirectoryEndpointUrl": "...",
  "resourceManagerEndpointUrl": "...",
  "activeDirectoryGraphResourceId": "...",
  "sqlManagementEndpointUrl": "...",
  "galleryEndpointUrl": "...",
  "managementEndpointUrl": "..."
}
```

## Step 2: Configure Federated Credentials (OIDC) - OPTIONAL but Recommended

Get the Application ID from the output above, then run:

```bash
APP_ID="<clientId from above>"

# For main branch
az ad app federated-credential create \
  --id $APP_ID \
  --parameters '{
    "name": "github-mume-main",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:leewsimpson/mume:ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# For pull requests (optional)
az ad app federated-credential create \
  --id $APP_ID \
  --parameters '{
    "name": "github-mume-pr",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:leewsimpson/mume:pull_request",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

## Step 3: Configure GitHub Repository Secrets

Go to: https://github.com/leewsimpson/mume/settings/secrets/actions

Add these **Repository Secrets**:

### Azure Authentication (from Service Principal output)
- `AZURE_CREDENTIALS` = **Copy and paste the ENTIRE JSON output from Step 1**
  
  This should include all fields: clientId, clientSecret, subscriptionId, tenantId, and all endpoint URLs.

### Application Secrets (from .env.azure file)
- `SESSION_SECRET` = vkukUfwmY2vSZgTfJCgkBcgDKDNI45ZCL19LkVtYD+k=
- `TOKEN_ENCRYPTION_KEY` = e4579cb83f08c81d504539c64a2e29578492453e5cc65de2b560f52d3f1624e7
- `GITHUB_CLIENT_ID` = Ov23li4FLaQdqWPlsg5o
- `GITHUB_CLIENT_SECRET` = 76cd492ad9a7f3875b4edc404c788ef61a9799ac

### Static Web App Deployment Tokens
- `AZURE_STATIC_WEB_APPS_API_TOKEN_DEV` = 6807c78f94a47791f9845c11608fee0e77a5377ccd71f2b207e423465e267e7d02-562a86dc-ec67-43e9-a0f7-4a3a595d85f400f04300747a000f
- `AZURE_STATIC_WEB_APPS_API_TOKEN_PROD` = (get when prod Static Web App is created)

## Step 4: Configure GitHub Environments

Go to: https://github.com/leewsimpson/mume/settings/environments

### Create "dev" Environment
1. Click "New environment"
2. Name: `dev`
3. No protection rules needed for dev
4. Click "Create environment"

### Create "production" Environment  
1. Click "New environment"
2. Name: `production`
3. Enable "Required reviewers" (optional but recommended)
4. Enable "Wait timer" if desired
5. Click "Create environment"

## Step 5: Test the Workflows

Once secrets are configured, test by going to:
https://github.com/leewsimpson/mume/actions

1. Select "Deploy Base Infrastructure"
2. Click "Run workflow"
3. Choose "dev" environment
4. Click "Run workflow"

---

**Next:** After setting up the above, I'll update the GitHub Actions workflows to work correctly.
