// Container App Environment module

@description('Container App Environment name')
param name string

@description('Location for the environment')
param location string

@description('Log Analytics Workspace ID (Customer ID)')
param logAnalyticsWorkspaceId string

@description('Log Analytics Workspace Primary Shared Key')
@secure()
param logAnalyticsWorkspaceKey string

resource containerEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: name
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalyticsWorkspaceId
        sharedKey: logAnalyticsWorkspaceKey
      }
    }
    workloadProfiles: [
      {
        name: 'Consumption'
        workloadProfileType: 'Consumption'
      }
    ]
  }
}

output id string = containerEnv.id
output name string = containerEnv.name
output defaultDomain string = containerEnv.properties.defaultDomain
