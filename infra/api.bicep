// API Container App deployment template

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

@description('Container App Environment resource ID')
param containerEnvironmentId string

@description('Container Registry login server')
param containerRegistryServer string

@description('Container Registry username')
param containerRegistryUsername string

@description('Container Registry password')
@secure()
param containerRegistryPassword string

@description('Docker image tag')
param imageTag string = 'latest'

@description('Redis internal FQDN')
param redisHostName string

@description('Session secret')
@secure()
param sessionSecret string

@description('Token encryption key')
@secure()
param tokenEncryptionKey string

@description('GitHub OAuth client ID')
@secure()
param githubClientId string

@description('GitHub OAuth client secret')
@secure()
param githubClientSecret string

@description('Frontend URL')
param frontendUrl string

@description('Application Insights connection string')
param appInsightsConnectionString string = ''

// Variables
var projectName = 'mume'
var envSuffix = environment == 'prod' ? '' : '-${environment}'
var containerAppName = '${projectName}-api${envSuffix}'
var imageName = '${containerRegistryServer}/${projectName}-api:${imageTag}'

// Compute resource allocations based on environment
var cpuCores = environment == 'prod' ? '1.0' : '0.5'
var memorySize = environment == 'prod' ? '2Gi' : '1Gi'
var minReplicas = environment == 'prod' ? 2 : 1
var maxReplicas = environment == 'prod' ? 5 : 3

resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: containerAppName
  location: location
  properties: {
    environmentId: containerEnvironmentId
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 3000
        transport: 'Auto'
        allowInsecure: false
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
      }
      registries: [
        {
          server: containerRegistryServer
          username: containerRegistryUsername
          passwordSecretRef: 'registry-password'
        }
      ]
      secrets: concat([
        {
          name: 'registry-password'
          value: containerRegistryPassword
        }
        {
          name: 'session-secret'
          value: sessionSecret
        }
        {
          name: 'token-encryption-key'
          value: tokenEncryptionKey
        }
        {
          name: 'github-client-id'
          value: githubClientId
        }
        {
          name: 'github-client-secret'
          value: githubClientSecret
        }
      ], appInsightsConnectionString != '' ? [
        {
          name: 'appinsights-connection-string'
          value: appInsightsConnectionString
        }
      ] : [])
    }
    template: {
      containers: [
        {
          name: containerAppName
          image: imageName
          resources: {
            cpu: json(cpuCores)
            memory: memorySize
          }
          env: [
            {
              name: 'PORT'
              value: '3000'
            }
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'REDIS_URL'
              value: 'redis://${redisHostName}:6379'
            }
            {
              name: 'SESSION_SECRET'
              secretRef: 'session-secret'
            }
            {
              name: 'TOKEN_ENCRYPTION_KEY'
              secretRef: 'token-encryption-key'
            }
            {
              name: 'GITHUB_CLIENT_ID'
              secretRef: 'github-client-id'
            }
            {
              name: 'GITHUB_CLIENT_SECRET'
              secretRef: 'github-client-secret'
            }
            {
              name: 'GITHUB_CALLBACK_URL'
              value: 'https://${containerAppName}.${containerEnvironmentDomain}/auth/github/callback'
            }
            {
              name: 'FRONTEND_URL'
              value: frontendUrl
            }
          ]
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
        ]
      }
    }
  }
}

// Get the container environment domain for callback URL construction
resource containerEnv 'Microsoft.App/managedEnvironments@2024-03-01' existing = {
  name: split(containerEnvironmentId, '/')[8]
}

var containerEnvironmentDomain = containerEnv.properties.defaultDomain

output id string = containerApp.id
output name string = containerApp.name
output fqdn string = containerApp.properties.configuration.ingress.fqdn
output latestRevisionName string = containerApp.properties.latestRevisionName
