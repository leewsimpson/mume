// Main infrastructure template for Mume application
// This template deploys all base infrastructure resources

targetScope = 'resourceGroup'

@description('The location for all resources')
param location string = resourceGroup().location

@description('Environment name (dev, staging, prod)')
@allowed([
  'dev'
  'staging'
  'prod'
])
param environment string = 'dev'

@description('Session secret for Express sessions')
@secure()
param sessionSecret string

@description('Token encryption key (64 hex characters)')
@secure()
param tokenEncryptionKey string

@description('GitHub OAuth client ID')
@secure()
param githubClientId string

@description('GitHub OAuth client secret')
@secure()
param githubClientSecret string

// Variables
var projectName = 'mume'
var envSuffix = environment == 'prod' ? '' : '-${environment}'

// Resource names
var containerRegistryName = '${projectName}acr${uniqueString(resourceGroup().id)}'
var logAnalyticsName = '${projectName}-logs${envSuffix}'
var containerEnvName = '${projectName}-env${envSuffix}'
var redisName = '${projectName}-redis${envSuffix}'

// Container Registry
module containerRegistry 'modules/container-registry.bicep' = {
  name: 'containerRegistry'
  params: {
    name: containerRegistryName
    location: location
    sku: environment == 'prod' ? 'Standard' : 'Basic'
  }
}

// Log Analytics Workspace
module logAnalytics 'modules/log-analytics.bicep' = {
  name: 'logAnalytics'
  params: {
    name: logAnalyticsName
    location: location
  }
}

// Container App Environment
module containerEnv 'modules/container-environment.bicep' = {
  name: 'containerEnvironment'
  params: {
    name: containerEnvName
    location: location
    logAnalyticsWorkspaceId: logAnalytics.outputs.workspaceId
    logAnalyticsWorkspaceKey: logAnalytics.outputs.primarySharedKey
  }
}

// Redis Container App
module redis 'modules/redis-container.bicep' = {
  name: 'redis'
  params: {
    name: redisName
    location: location
    containerEnvironmentId: containerEnv.outputs.id
  }
}

// Static Web App (Frontend)
module staticWebApp 'modules/static-web-app.bicep' = {
  name: 'staticWebApp'
  params: {
    name: '${projectName}-frontend${envSuffix}'
    location: 'eastus2' // Static Web Apps have limited region availability
    sku: environment == 'prod' ? 'Standard' : 'Free'
  }
}

// Outputs
output containerRegistryName string = containerRegistry.outputs.name
output containerRegistryLoginServer string = containerRegistry.outputs.loginServer
output containerEnvId string = containerEnv.outputs.id
output containerEnvName string = containerEnv.outputs.name
output redisHostName string = redis.outputs.fqdn
output staticWebAppName string = staticWebApp.outputs.name
output staticWebAppDefaultHostname string = staticWebApp.outputs.defaultHostname
