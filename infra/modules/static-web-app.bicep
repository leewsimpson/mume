// Azure Static Web App module

@description('Static Web App name')
param name string

@description('Location for the Static Web App')
param location string = 'eastus2'

@description('Static Web App SKU')
@allowed([
  'Free'
  'Standard'
])
param sku string = 'Free'

resource staticWebApp 'Microsoft.Web/staticSites@2023-01-01' = {
  name: name
  location: location
  sku: {
    name: sku
    tier: sku
  }
  properties: {
    provider: 'Custom'
    stagingEnvironmentPolicy: 'Enabled'
    allowConfigFileUpdates: true
    enterpriseGradeCdnStatus: 'Disabled'
  }
}

output id string = staticWebApp.id
output name string = staticWebApp.name
output defaultHostname string = staticWebApp.properties.defaultHostname
output apiKey string = staticWebApp.listSecrets().properties.apiKey
