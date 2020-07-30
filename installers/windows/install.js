const 
  config  = require('../../config'),
  Service = require('node-windows').Service;

// Create a new service object
const svc = new Service({
  name:`Backup 2 Cloud - ${config.service.name}`,
  description: 'Custom backup application to backup files and push them to cloud storage.',
  script: `${__dirname}/../../app.js`,
  wait: 2,
  grow: .5,
  maxRetries: 3,
  maxRestarts: 3,
  nodeOptions: []
});

// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on('install', () => {
  svc.start();
});

svc.install();