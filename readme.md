# Backup-to-Cloud
This app archives a set of directories and uploads them to a cloud storage provider. This is a work in progress...

## TODO
- ~~File archiving~~
- ~~Improve archive file names to include directory names~~
- ~~Scheduling~~
- ~~Uploading~~
- Support new structure
- Removing old backups
- Encrypting
- Update logging
- Incremental backups
- Support for multiple storage providers
- Support for local storage

# Setup
1. Clone Repo
2. `cd backup-to-cloud`
3. `cp config.example.js config.js`
4. Complete the config.js file's missing parameters

# Service

## Windows

```
npm i node-windows
```

```
npm run install-windows
```

This will install a service called "Backup to Cloud - YOUR_SERVICE_NAME_HERE"

## Linux

Using PM2 would be my recommended solution


# Cloud Storage

## Google

From [here](https://www.npmjs.com/package/@google-cloud/storage)
1) Select or create a Cloud Platform project.
2) Enable billing for your project.
3) Enable the Google Cloud Storage API.
4) Set up authentication with a service account so you can access the API from your local workstation.
5) Rename your credentials JSON file to google,json and place it in the cloud directory.

