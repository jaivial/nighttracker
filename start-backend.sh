#!/bin/bash
unset npm_package_version
export ASPNETCORE_ENVIRONMENT=Development
export ASPNETCORE_URLS="http://*:5134"
exec dotnet /var/www/kraken/Backend/MythKraken.API/bin/Debug/net8.0/MythKraken.API.dll
