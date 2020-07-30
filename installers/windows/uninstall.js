const 
  config  = require('../../config'),
  Service = require('node-windows').Service;

// Create a new service object
const svc = new Service({
  name:`Backup 2 Cloud - ${config.service.name}`,
  description: 'Custom backup application to backup files and push them to cloud storage.',
  script: `${__dirname}/../../app.js`,
});

// Listen for the "uninstall" event so we know when it's done.
svc.on('uninstall', () => {
  console.log('Uninstall complete.');
  console.log('The service exists: ',svc.exists);
});

// Uninstall the service.
svc.uninstall();