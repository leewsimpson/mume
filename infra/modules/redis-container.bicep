// Redis Container App module
// Deploys Redis as a container within the Container App Environment

@description('Redis container app name')
param name string

@description('Location for the container app')
param location string

@description('Container App Environment resource ID')
param containerEnvironmentId string

@description('Redis image to use')
param redisImage string = 'redis:7-alpine'

resource redisContainer 'Microsoft.App/containerApps@2024-03-01' = {
  name: name
  location: location
  properties: {
    environmentId: containerEnvironmentId
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: false // Internal only - accessible within Container App Environment
        targetPort: 6379
        transport: 'Tcp'
        exposedPort: 6379
      }
    }
    template: {
      containers: [
        {
          name: 'redis'
          image: redisImage
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          command: [
            'redis-server'
            '--maxmemory'
            '256mb'
            '--maxmemory-policy'
            'allkeys-lru'
            '--save'
            ''
            '--appendonly'
            'no'
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 1 // Redis should be single instance for consistency
      }
    }
  }
}

output id string = redisContainer.id
output name string = redisContainer.name
output fqdn string = redisContainer.properties.configuration.ingress.fqdn
