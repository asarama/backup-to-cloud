# Config

Use this document to gain insight into our config parameters.

- debug (Boolean): Runs the backup and upload process as soon as the daemon starts. This is useful to test your credentials and selected backup directories.

- service.name (String): Used to identify this back up service. If you plan to run multiple instances of this daemon on the same machine use this parameter to identify them.

- service.maintainer.email.enabled (Boolean): Enables sending out notification emails. 

- service.maintainer.email.host (String): SMTP host.

- service.maintainer.email.port (Integer): SMTP port.

- service.maintainer.email.secure (Integer): Use secure protocol.

- service.maintainer.email.auth.user (String): Email address.

- service.maintainer.email.auth.pass (String): Email address password.

- backup.schedule (String): CRON style timing string. For more information checkout the docs [here](https://www.npmjs.com/package/node-schedule#cron-style-scheduling).

- backup.directories (Array\<String\>): Array of paths to directories which need to be backed up.

- backup.targets (Array\<Provider\>): Array of Provider objects.

## Provider
- provider (String): Which cloud provider to use.

- bucket (String): *GOOGLE ONLY* Storage bucket name.

- json_path (String): *GOOGLE ONLY* Path to google credentials JSON file. Read the Google section in the [readme](./readme.md) to find out how to make one.