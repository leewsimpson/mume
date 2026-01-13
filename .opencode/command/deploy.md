---
description: Deploy the API to Azure Container Apps
agent: general
---

# Deploy API to Azure Container Apps

Deploy the latest API image from Azure Container Registry to the Container App.

## Configuration

- **Container App:** mume-api-dev
- **Resource Group:** rg-mume
- **Registry:** mumeacr2gdrwkfmswho2.azurecr.io
- **Image:** mume-api:latest

## Workflow

### Step 1: Check Current State

Show the current revision and its status:

```bash
az containerapp revision list --name mume-api-dev --resource-group rg-mume --query "[?properties.active==\`true\`].{name:name, created:properties.createdTime, traffic:properties.trafficWeight}" --output table
```

### Step 2: Deploy Latest Image

Update the Container App with the latest image from ACR:

```bash
az containerapp update --name mume-api-dev --resource-group rg-mume --image mumeacr2gdrwkfmswho2.azurecr.io/mume-api:latest
```

### Step 3: Verify Deployment

Wait a few seconds then check the new revision is active:

```bash
# Wait for deployment
sleep 10

# Check new active revision
az containerapp revision list --name mume-api-dev --resource-group rg-mume --query "[?properties.active==\`true\`].{name:name, created:properties.createdTime, status:properties.runningState}" --output table
```

### Step 4: Health Check

Verify the API is responding:

```bash
curl -s https://mume-api-dev.delightfulground-f44c4ea7.eastus.azurecontainerapps.io/health | head -c 200
```

## Output Summary

Report to the user:
- Previous revision name
- New revision name  
- Deployment status (success/failure)
- Health check result

## Troubleshooting

If deployment fails:
1. Check ACR for the image: `az acr repository show-tags --name mumeacr2gdrwkfmswho2 --repository mume-api`
2. Check Container App logs: `az containerapp logs show --name mume-api-dev --resource-group rg-mume --type console --tail 50`
3. Check system events: `az containerapp logs show --name mume-api-dev --resource-group rg-mume --type system --tail 20`

## Notes

- The Container App uses managed identity to pull images from ACR
- Deployments typically take 30-60 seconds to complete
- Redis connections may show temporary errors during restart (normal)
- Run GitHub Actions workflow first if you need to build a new image
