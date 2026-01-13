// Log Analytics Workspace module

@description('Log Analytics Workspace name')
param name string

@description('Location for the workspace')
param location string

@description('Workspace retention in days')
param retentionInDays int = 30

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: name
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: retentionInDays
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

output id string = logAnalytics.id
output name string = logAnalytics.name
output workspaceId string = logAnalytics.properties.customerId
output primarySharedKey string = logAnalytics.listKeys().primarySharedKey
