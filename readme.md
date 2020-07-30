# Intro
This app archives a set of directories and uploads them to a cloud storage provider. This is a work in progress...
- File archiving (done)
- Improve archive file names to include directory names (done)
- Encrypting
- Update logging
- Scheduling (done)
- Uploading (done)
- Removing old backups
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

Run `npm run install-windows`
This will install a service called "Backup 2 Cloud - {YOUR SERVICE NAME HERE}"

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
