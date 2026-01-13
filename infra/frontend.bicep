// Frontend Static Web App deployment template
// Note: Static Web Apps use GitHub Actions for deployment via API token
// This template only manages the Static Web App resource itself

targetScope = 'resourceGroup'

@description('The location for all resources')
param location string = 'eastus2'

@description('Environment name (dev, staging, prod)')
@allowed([
  'dev'
  'staging'
  'prod'
])
param environment string = 'dev'

@description('Static Web App name')
param staticWebAppName string

@description('API backend URL')
param apiUrl string

// The Static Web App resource should already exist from base infrastructure
resource staticWebApp 'Microsoft.Web/staticSites@2023-01-01' existing = {
  name: staticWebAppName
}

// Output the deployment token for GitHub Actions
output staticWebAppName string = staticWebApp.name
output defaultHostname string = staticWebApp.properties.defaultHostname
output apiKey string = staticWebApp.listSecrets().properties.apiKey
output apiUrl string = apiUrl
