targetScope = 'resourceGroup'

@description('Globally unique web app name, supplied by the workshop platform.')
@minLength(2)
@maxLength(55)
param appName string

@description('Azure region approved for the workshop resource group.')
param location string = resourceGroup().location

@description('Exact Git commit SHA being deployed, returned by /health.')
@minLength(40)
@maxLength(40)
param deploymentSha string

resource plan 'Microsoft.Web/serverfarms@2024-11-01' = {
  name: '${appName}-plan'
  location: location
  kind: 'linux'
  sku: {
    name: 'B1'
    tier: 'Basic'
    capacity: 1
  }
  properties: {
    reserved: true
  }
}

resource app 'Microsoft.Web/sites@2024-11-01' = {
  name: appName
  location: location
  kind: 'app,linux'
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    clientAffinityEnabled: false
    siteConfig: {
      linuxFxVersion: 'NODE|24-lts'
      appCommandLine: 'node src/backend/server.js'
      alwaysOn: true
      minTlsVersion: '1.2'
      scmMinTlsVersion: '1.2'
      ftpsState: 'Disabled'
      healthCheckPath: '/health'
      appSettings: [
        {
          name: 'DEPLOYMENT_SHA'
          value: deploymentSha
        }
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'false'
        }
      ]
    }
  }
}

output appUrl string = 'https://${app.properties.defaultHostName}'
