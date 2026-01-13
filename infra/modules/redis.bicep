// Redis Cache module

@description('Redis Cache name')
param name string

@description('Location for the Redis Cache')
param location string

@description('Redis SKU')
@allowed([
  'Basic'
  'Standard'
  'Premium'
])
param sku string = 'Basic'

@description('Redis capacity (0-6 depending on SKU)')
param capacity int = 0

resource redis 'Microsoft.Cache/redis@2023-08-01' = {
  name: name
  location: location
  properties: {
    sku: {
      name: sku
      family: sku == 'Premium' ? 'P' : 'C'
      capacity: capacity
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
    redisConfiguration: {
      'maxmemory-policy': 'allkeys-lru'
    }
  }
}

output id string = redis.id
output name string = redis.name
output hostName string = redis.properties.hostName
output sslPort int = redis.properties.sslPort
output primaryKey string = redis.listKeys().primaryKey
