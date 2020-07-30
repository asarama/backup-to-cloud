module.exports = {
    "debug": true,
    "service": {
        "name": "Backup App",
        "maintainer": {
            "name": "",
            "email": {
                "host": "",
                "port": 0,
                "secure": true,
                "auth": {
                    "user": "",
                    "pass": ""
                }
            }
        }
    },
    "backup": {
        "storage": "google",
        "schedule": "30 3 * * *",
        "directories": [
            ""
        ]
    },
    "google": {
        "bucket": "some-bucket"
    }
}