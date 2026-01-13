// Production environment parameters for base infrastructure

using '../main.bicep'

param location = 'eastus'
param environment = 'prod'

// These will be provided via GitHub secrets at deployment time
param sessionSecret = readEnvironmentVariable('SESSION_SECRET')
param tokenEncryptionKey = readEnvironmentVariable('TOKEN_ENCRYPTION_KEY')
param githubClientId = readEnvironmentVariable('GITHUB_CLIENT_ID')
param githubClientSecret = readEnvironmentVariable('GITHUB_CLIENT_SECRET')
