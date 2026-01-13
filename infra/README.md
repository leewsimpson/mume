# Mume Infrastructure

This directory contains the Infrastructure as Code (IaC) for the Mume collaborative markdown editor, using Azure Bicep templates and GitHub Actions workflows.

## Architecture Overview

The application uses the following Azure services:

- **Azure Container Apps**: Hosts both the Node.js API backend and Redis (containerised)
- **Azure Static Web Apps**: Hosts the React frontend
- **Azure Container Registry**: Stores Docker images for the API
- **Log Analytics Workspace**: Centralised logging and monitoring
- **Container App Environment**: Managed environment for Container Apps

**Simplified Architecture:**
```
┌─────────────────────────────────────────────────────┐
│           Container App Environment                  │
│  ┌─────────────────┐    ┌─────────────────┐        │
│  │   mume-api      │───▶│     redis       │        │
│  │  (external)     │    │   (internal)    │        │
│  └─────────────────┘    └─────────────────┘        │
└─────────────────────────────────────────────────────┘
                │
                │ HTTPS
                ▼
┌─────────────────────────────────────────────────────┐
│         Static Web App (Frontend)                    │
└─────────────────────────────────────────────────────┘
```

**Design Decisions:**
- **No PostgreSQL**: Data persistence moved to Git (comments stored alongside markdown files). Session data and GitHub tokens stored in Redis.
- **Containerised Redis**: Cost-effective alternative to Azure Cache for Redis. Session data loss on restart is acceptable for this use case (~$14-16/month savings per environment).
- **Internal Redis**: Redis Container App uses internal ingress only, accessible only within the Container App Environment for security.

## Directory Structure

```
infra/
├── main.bicep                      # Main infrastructure template (base resources)
├── api.bicep                       # API Container App deployment
├── frontend.bicep                  # Frontend Static Web App configuration
├── modules/                        # Reusable Bicep modules
│   ├── container-registry.bicep    # Azure Container Registry
│   ├── log-analytics.bicep         # Log Analytics Workspace
│   ├── container-environment.bicep # Container App Environment
│   ├── redis-container.bicep       # Redis Container App
│   └── static-web-app.bicep        # Static Web App
├── parameters/                     # Environment-specific parameters
│   ├── main.dev.bicepparam         # Development parameters
│   └── main.prod.bicepparam        # Production parameters
└── README.md                       # This file
```

## CI/CD Pipelines

Three GitHub Actions workflows manage deployments:

### 1. Base Infrastructure Pipeline (`.github/workflows/infra-deploy.yml`)

Deploys all foundational Azure resources:
- Container Registry
- Container App Environment
- Redis container (internal ingress)
- Static Web App resource
- Log Analytics workspace

**Triggers:**
- Push to `main` branch affecting `infra/**` files
- Manual workflow dispatch with environment selection

**Environments:** dev, prod

### 2. API Deployment Pipeline (`.github/workflows/api-deploy.yml`)

Builds and deploys the API backend:
1. Builds Docker image from `apps/api`
2. Pushes image to Azure Container Registry
3. Deploys Container App with environment variables and secrets

**Triggers:**
- Push to `main` branch affecting `apps/api/**` files
- Manual workflow dispatch with environment selection

**Environments:** dev, prod

### 3. Frontend Deployment Pipeline (`.github/workflows/frontend-deploy.yml`)

Builds and deploys the frontend:
1. Builds React application with Vite
2. Deploys to Azure Static Web Apps

**Triggers:**
- Push to `main` branch affecting `apps/frontend/**` files
- Manual workflow dispatch with environment selection

**Environments:** dev, prod

## Required GitHub Secrets

Configure these secrets in your GitHub repository settings:

### Azure Authentication
- `AZURE_CLIENT_ID` - Service Principal client ID for OIDC authentication
- `AZURE_TENANT_ID` - Azure tenant ID
- `AZURE_SUBSCRIPTION_ID` - Azure subscription ID

### Application Secrets
- `SESSION_SECRET` - Express session secret (random string, 32+ characters)
- `TOKEN_ENCRYPTION_KEY` - AES-256-GCM encryption key (64 hex characters)
- `GITHUB_CLIENT_ID` - GitHub OAuth application client ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth application client secret

## Setup Instructions

### Prerequisites

1. Azure CLI installed and authenticated
2. Azure subscription with appropriate permissions
3. GitHub repository with Actions enabled
4. Service Principal with Contributor access to the resource group

### Initial Setup

#### 1. Create Azure Resource Group

```bash
az group create --name rg-mume --location eastus
```

#### 2. Create Service Principal for GitHub Actions

```bash
# Create service principal with OIDC
az ad sp create-for-rbac \
  --name "github-mume-deploy" \
  --role contributor \
  --scopes /subscriptions/{subscription-id}/resourceGroups/rg-mume \
  --sdk-auth

# Configure federated credentials for OIDC
az ad app federated-credential create \
  --id {app-id} \
  --parameters '{
    "name": "github-mume-main",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:{org}/{repo}:ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

#### 3. Configure GitHub Secrets

Add all required secrets to your GitHub repository:
- Settings → Secrets and variables → Actions → New repository secret

#### 4. Generate Required Secrets

```bash
# Generate session secret (32 characters)
openssl rand -base64 32

# Generate token encryption key (64 hex characters)
openssl rand -hex 32
```

#### 5. Register GitHub OAuth Application

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Create a new OAuth App:
   - **Application name**: Mume (Dev/Prod)
   - **Homepage URL**: `https://your-static-web-app.azurestaticapps.net`
   - **Authorization callback URL**: `https://your-api.azurecontainerapps.io/auth/github/callback`
3. Save the Client ID and Client Secret

### Deployment Process

#### Deploy Base Infrastructure

```bash
# Via GitHub Actions (recommended)
# Go to Actions → Deploy Base Infrastructure → Run workflow → Select environment

# Or via Azure CLI
az deployment group create \
  --resource-group rg-mume \
  --template-file infra/main.bicep \
  --parameters @infra/parameters/main.dev.bicepparam
```

#### Deploy API

```bash
# Via GitHub Actions (recommended)
# Go to Actions → Deploy API → Run workflow → Select environment

# Or manually build and deploy
cd apps/api
docker build -t mume-api:latest .
```

#### Deploy Frontend

```bash
# Via GitHub Actions (recommended)
# Go to Actions → Deploy Frontend → Run workflow → Select environment
```

## Environment Configuration

### Development Environment

- **Resource Group**: `rg-mume`
- **Location**: `eastus`
- **Naming Pattern**: `{resource}-dev` (e.g., `mume-api-dev`)
- **Scaling**: Minimum resources (cost-optimised)
- **SKUs**: Basic/Burstable tiers

### Production Environment

- **Resource Group**: `rg-mume`
- **Location**: `eastus`
- **Naming Pattern**: `{resource}` (e.g., `mume-api`)
- **Scaling**: Multi-replica with auto-scaling
- **SKUs**: Standard/General Purpose tiers
- **High Availability**: Enabled where applicable

## Resource Naming Convention

| Resource Type | Dev Name | Prod Name |
|--------------|----------|-----------|
| API Container App | `mume-api-dev` | `mume-api` |
| Redis Container App | `mume-redis-dev` | `mume-redis` |
| Static Web App | `mume-frontend-dev` | `mume-frontend` |
| Container Registry | `mumeacr{uniquestring}` | Same (shared) |
| Container Environment | `mume-env-dev` | `mume-env` |

## Cost Optimisation

### Development Environment
- API Container App: 0.5 CPU, 1Gi memory, 1-3 replicas (~$5-10/month)
- Redis Container App: 0.25 CPU, 0.5Gi memory, 1 replica (~$2-5/month)
- Static Web App: Free tier
- Container Registry: Basic tier (~$5/month)
- **Total estimated cost**: ~$12-20/month

### Production Environment
- API Container App: 1.0 CPU, 2Gi memory, 2-5 replicas (~$15-30/month)
- Redis Container App: 0.25 CPU, 0.5Gi memory, 1 replica (~$2-5/month)
- Static Web App: Standard tier (~$9/month)
- Container Registry: Standard tier (~$20/month)
- **Total estimated cost**: ~$46-64/month

**Cost Savings vs. Managed Services:**
- Removed PostgreSQL: ~$13-25/month savings per environment
- Containerised Redis vs Azure Redis: ~$14-16/month savings per environment
- **Total savings**: ~$27-41/month per environment

## Monitoring and Logging

All resources send logs to the centralised Log Analytics workspace:

```bash
# View Container App logs
az containerapp logs show \
  --name mume-api-dev \
  --resource-group rg-mume \
  --follow

# Query Log Analytics
az monitor log-analytics query \
  --workspace {workspace-id} \
  --analytics-query "ContainerAppConsoleLogs_CL | where TimeGenerated > ago(1h)"
```

## Data Persistence

**Session Storage:** Redis stores Express sessions and GitHub OAuth tokens. Data is lost on Redis container restart, requiring users to re-authenticate. This is acceptable for the current use case.

**Comments:** Planned to be stored in Git alongside markdown files (future implementation). No database required.

## Troubleshooting

### Common Issues

1. **Deployment fails with authentication error**
   - Verify GitHub secrets are correctly configured
   - Ensure Service Principal has Contributor role on resource group
   - Check OIDC federated credentials are configured

2. **Container App fails to start**
   - Check environment variables are correctly set
   - Verify Redis container is running and accessible
   - Review Container App logs: `az containerapp logs show`

3. **Frontend can't connect to API**
   - Verify CORS settings in API configuration
   - Check API URL is correctly set in frontend build
   - Ensure API Container App ingress is set to external

4. **Redis connection fails**
   - Verify Redis container is running: `az containerapp show --name mume-redis-dev`
   - Check API can resolve Redis internal FQDN
   - Ensure Redis ingress is set to internal (not external)

### Viewing Resource Status

```bash
# List all resources
az resource list --resource-group rg-mume --output table

# Get Container App details
az containerapp show --name mume-api-dev --resource-group rg-mume

# Get Static Web App details
az staticwebapp show --name mume-frontend-dev --resource-group rg-mume

# Check Redis container status
az containerapp show --name mume-redis-dev --resource-group rg-mume

# View Redis logs
az containerapp logs show --name mume-redis-dev --resource-group rg-mume --follow
```

## Security Best Practices

1. **Secrets Management**: All sensitive values stored in GitHub Secrets
2. **Managed Identity**: Consider migrating to managed identities for Azure resource access
3. **Network Security**: Configure VNet integration for production workloads
4. **SSL/TLS**: All endpoints use HTTPS/TLS
5. **Firewall Rules**: PostgreSQL restricted to Azure services only
6. **Container Security**: Non-root user in Docker containers
7. **Regular Updates**: Keep base images and dependencies updated

## Scaling Configuration

### Auto-scaling Rules

Container Apps auto-scale based on:
- HTTP request concurrency (50 requests per instance)
- Min replicas: 1 (dev) / 2 (prod)
- Max replicas: 3 (dev) / 5 (prod)

To adjust scaling:

```bash
az containerapp update \
  --name mume-api-dev \
  --resource-group rg-mume \
  --min-replicas 2 \
  --max-replicas 5
```

## Backup and Disaster Recovery

### Session Data (Redis)
- **No persistence**: Session data is ephemeral and lost on Redis container restart
- Users will need to re-authenticate after Redis restarts
- For production: consider Azure Cache for Redis if session persistence is critical

### Container Registry
- Enable geo-replication for production
- Consider enabling image vulnerability scanning

### Application Data
- Comments and documents stored in Git repositories provide natural version control and backup
- GitHub handles backup and disaster recovery for application data

## Next Steps

1. **Update API Code**: Remove PostgreSQL dependencies from API codebase
2. **Implement Git-based Comments**: Store comments alongside markdown files in Git
3. **Enable Application Insights**: Add comprehensive telemetry and monitoring
4. **Configure Custom Domains**: Set up custom domains for production
5. **Set Up Alerting**: Configure alerts for critical metrics (Redis health, API errors)
6. **Consider Redis Persistence**: Evaluate if session persistence is needed for production

## References

- [Azure Container Apps Documentation](https://learn.microsoft.com/azure/container-apps/)
- [Azure Static Web Apps Documentation](https://learn.microsoft.com/azure/static-web-apps/)
- [Azure Bicep Documentation](https://learn.microsoft.com/azure/azure-resource-manager/bicep/)
- [GitHub Actions for Azure](https://github.com/Azure/actions)
