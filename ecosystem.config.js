module.exports = {
  apps: [
    {
      name: 'kraken-backend',
      script: 'dotnet',
      args: '/var/www/kraken/Backend/MythKraken.API/bin/Debug/net8.0/MythKraken.API.dll',
      cwd: '/var/www/kraken/Backend',
      env: {
        ASPNETCORE_ENVIRONMENT: 'Development',
        ASPNETCORE_URLS: 'http://*:5134'
      }
    }
  ]
}
